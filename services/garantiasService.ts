import { and, count, eq, isNull, ne, sql } from "drizzle-orm";
import db from "../config/db.js";
import { activos, garantias, proveedores } from "../db/schema.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import { codigoGarantia, estadoGarantia } from "./presentacion.js";

// Verifica que no exista otra garantía vigente solapada para el activo
async function validarSolapamiento(
	activoId: number,
	fechaInicio: string,
	fechaFin: string,
	excluirId?: number,
) {
	const condiciones = [
		eq(garantias.activo_id, activoId),
		isNull(garantias.deleted_at),
		sql`${garantias.fecha_inicio} <= ${fechaFin}`,
		sql`${garantias.fecha_fin} >= ${fechaInicio}`,
	];

	if (excluirId) condiciones.push(ne(garantias.id, excluirId));

	const [solapada] = await db
		.select({ id: garantias.id })
		.from(garantias)
		.where(and(...condiciones))
		.limit(1);

	if (solapada) {
		throw new ErrorHttp(
			409,
			"El activo ya tiene una garantía que se solapa con ese periodo.",
		);
	}
}

// Consultas de garantías

export async function getGarantias(page: number, limit: number) {
	if (Number.isNaN(page) || Number.isNaN(limit)) {
		throw new ErrorHttp(
			400,
			"Los parámetros de paginación deben ser números válidos.",
		);
	}

	const safeLimit = Math.min(limit, 100);
	const offset = (page - 1) * safeLimit;

	const filas = await db
		.select({
			id: garantias.id,
			activo: activos.nombre,
			proveedor_garantia: proveedores.nombre,
			proveedor_garantia_id: garantias.proveedor_id,
			fecha_inicio: garantias.fecha_inicio,
			fecha_fin: garantias.fecha_fin,
			costo: garantias.costo,
			condiciones: garantias.condiciones,
			descripcion: garantias.descripcion,
			nombre_garantia: garantias.nombre,
		})
		.from(garantias)
		.innerJoin(activos, eq(garantias.activo_id, activos.id))
		.innerJoin(proveedores, eq(garantias.proveedor_id, proveedores.id))
		.where(isNull(garantias.deleted_at))
		.limit(safeLimit)
		.offset(offset);

	const [countResult] = await db
		.select({ total: count() })
		.from(garantias)
		.where(isNull(garantias.deleted_at));

	const total = countResult.total;

	return {
		data: filas.map((fila) => {
			const estado = estadoGarantia(fila.fecha_fin);
			return {
				...fila,
				estado,
				estado_codigo: codigoGarantia(estado),
			};
		}),
		pagination: {
			page,
			limit: safeLimit,
			total,
			totalPages: Math.ceil(total / safeLimit),
		},
	};
}

// Creación de garantías

export async function createGarantia(
	input: {
		activo_id: number;
		proveedor_garantia_id: number;
		nombre_garantia: string;
		fecha_inicio: string;
		fecha_fin: string;
		costo?: number;
		condiciones?: string;
		estado?: string;
		descripcion?: string;
	},
	usuarioResponsableId?: number,
) {
	const {
		activo_id,
		proveedor_garantia_id,
		nombre_garantia,
		fecha_inicio,
		fecha_fin,
		costo,
		condiciones,
		descripcion,
	} = input;

	if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
		throw new ErrorHttp(
			400,
			"La fecha de fin debe ser posterior a la fecha de inicio.",
		);
	}

	if (!usuarioResponsableId) {
		throw new ErrorHttp(403, "Acceso no autorizado.");
	}

	const [activo] = await db
		.select({ id: activos.id, nombre: activos.nombre })
		.from(activos)
		.where(and(eq(activos.id, activo_id), isNull(activos.deleted_at)))
		.limit(1);

	if (!activo) {
		throw new ErrorHttp(404, "El activo no existe o está dado de baja.");
	}

	const [proveedor] = await db
		.select({ id: proveedores.id })
		.from(proveedores)
		.where(eq(proveedores.id, proveedor_garantia_id))
		.limit(1);

	if (!proveedor) {
		throw new ErrorHttp(404, "El proveedor de garantía no existe.");
	}

	await validarSolapamiento(activo_id, fecha_inicio, fecha_fin);

	const id = await db.transaction(async (tx) => {
		const [creada] = await tx
			.insert(garantias)
			.values({
				activo_id,
				proveedor_id: proveedor_garantia_id,
				nombre: nombre_garantia,
				fecha_inicio,
				fecha_fin,
				costo: costo != null ? String(costo) : null,
				condiciones: condiciones || null,
				descripcion: descripcion || null,
			})
			.$returningId();

		await registrarEvento(tx, {
			entidad: "garantia",
			entidad_id: creada.id,
			accion: "garantia.creada",
			actor_id: usuarioResponsableId,
			nuevos: {
				activo_id,
				nombre_garantia,
				fecha_inicio,
				fecha_fin,
				detalles: `Se registró la garantía "${nombre_garantia}" para el activo "${activo.nombre}".`,
			},
		});

		return creada.id;
	});

	return {
		id,
		activo_id,
		proveedor_garantia_id,
		nombre_garantia,
		fecha_inicio,
		fecha_fin,
		costo,
		condiciones,
		estado: estadoGarantia(fecha_fin),
		estado_codigo: codigoGarantia(estadoGarantia(fecha_fin)),
		descripcion,
	};
}

// Actualización de garantías

export async function updateGarantia(
	id: string,
	input: {
		nombre_garantia?: string;
		estado?: string;
		fecha_fin?: string;
		descripcion?: string;
		proveedor_garantia_id?: number;
		costo?: number;
		condiciones?: string;
	},
	usuarioResponsableId?: number,
) {
	const {
		nombre_garantia,
		fecha_fin,
		descripcion,
		proveedor_garantia_id,
		costo,
		condiciones,
	} = input;

	const [existente] = await db
		.select()
		.from(garantias)
		.where(eq(garantias.id, Number(id)))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "La garantía no existe.");
	}

	if (fecha_fin) {
		const fechaFinValida = new Date(fecha_fin);
		if (Number.isNaN(fechaFinValida.getTime())) {
			throw new ErrorHttp(400, "El formato de la fecha de fin es inválido.");
		}
		if (fechaFinValida <= new Date(existente.fecha_inicio)) {
			throw new ErrorHttp(
				400,
				"La fecha de fin debe ser posterior a la de inicio.",
			);
		}
		await validarSolapamiento(
			existente.activo_id,
			existente.fecha_inicio,
			fecha_fin,
			existente.id,
		);
	}

	const valores: Partial<typeof garantias.$inferInsert> = {};
	if (nombre_garantia) valores.nombre = nombre_garantia;
	if (fecha_fin) valores.fecha_fin = fecha_fin;
	if (descripcion !== undefined) valores.descripcion = descripcion || null;
	if (proveedor_garantia_id) valores.proveedor_id = proveedor_garantia_id;
	if (costo !== undefined) valores.costo = costo != null ? String(costo) : null;
	if (condiciones !== undefined) valores.condiciones = condiciones || null;

	if (Object.keys(valores).length === 0) {
		throw new ErrorHttp(400, "No se proporcionaron campos para actualizar.");
	}

	await db.transaction(async (tx) => {
		await tx
			.update(garantias)
			.set(valores)
			.where(eq(garantias.id, existente.id));

		await registrarEvento(tx, {
			entidad: "garantia",
			entidad_id: existente.id,
			accion: "garantia.actualizada",
			actor_id: usuarioResponsableId ?? null,
			anteriores: {
				nombre: existente.nombre,
				fecha_fin: existente.fecha_fin,
			},
			nuevos: {
				nombre: nombre_garantia ?? existente.nombre,
				fecha_fin: fecha_fin ?? existente.fecha_fin,
			},
		});
	});

	return {
		id: existente.id,
		activo_id: existente.activo_id,
		proveedor_garantia_id: proveedor_garantia_id || existente.proveedor_id,
		nombre_garantia: nombre_garantia || existente.nombre,
		fecha_inicio: existente.fecha_inicio,
		fecha_fin: fecha_fin || existente.fecha_fin,
		costo: costo !== undefined ? costo : existente.costo,
		condiciones:
			condiciones !== undefined ? condiciones : existente.condiciones,
		estado: estadoGarantia(fecha_fin || existente.fecha_fin),
		estado_codigo: codigoGarantia(
			estadoGarantia(fecha_fin || existente.fecha_fin),
		),
		descripcion:
			descripcion !== undefined ? descripcion : existente.descripcion,
	};
}

// Eliminación lógica de garantías

export async function deleteGarantia(
	id: string,
	usuarioResponsableId?: number,
) {
	const [existente] = await db
		.select({ id: garantias.id, activo_id: garantias.activo_id })
		.from(garantias)
		.where(and(eq(garantias.id, Number(id)), isNull(garantias.deleted_at)))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "La garantía no existe.");
	}

	await db.transaction(async (tx) => {
		await tx
			.update(garantias)
			.set({ deleted_at: new Date() })
			.where(eq(garantias.id, existente.id));

		await registrarEvento(tx, {
			entidad: "garantia",
			entidad_id: existente.id,
			accion: "garantia.eliminada",
			actor_id: usuarioResponsableId ?? null,
			nuevos: { activo_id: existente.activo_id },
		});
	});
}
