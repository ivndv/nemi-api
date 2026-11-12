import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
	activos,
	asignaciones,
	mantenimientos,
	personas,
	proveedores,
} from "../db/schema.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import { etiqueta } from "./presentacion.js";

// Mantenimientos de un activo
export async function listarMantenimientos(
	query: {
		page?: number;
		limit?: number;
		activo_id?: string;
		estado?: string;
		responsable?: string;
		desde?: string;
		hasta?: string;
	},
	personaId?: number,
) {
	const page = Number(query.page) || 1;
	const limit = Math.min(Number(query.limit) || 20, 100);
	const offset = (page - 1) * limit;

	const filtros = [];
	if (query.activo_id) {
		filtros.push(eq(mantenimientos.activo_id, Number(query.activo_id)));
	}
	if (query.estado) {
		filtros.push(
			eq(mantenimientos.estado, query.estado as "abierto" | "cerrado"),
		);
	}
	if (query.responsable) {
		filtros.push(
			eq(
				mantenimientos.responsable,
				query.responsable as "interno" | "externo",
			),
		);
	}
	if (query.desde) {
		filtros.push(sql`${mantenimientos.fecha_salida} >= ${query.desde}`);
	}
	if (query.hasta) {
		filtros.push(sql`${mantenimientos.fecha_salida} <= ${query.hasta}`);
	}
	if (personaId) {
		filtros.push(
			sql`EXISTS (SELECT 1 FROM asignaciones s
			      WHERE s.activo_id = ${mantenimientos.activo_id}
			        AND s.persona_id = ${personaId}
			        AND s.fecha_devolucion_real IS NULL)`,
		);
	}

	const filas = await db
		.select({
			id: mantenimientos.id,
			activo_id: mantenimientos.activo_id,
			activo: activos.nombre,
			responsable: mantenimientos.responsable,
			tecnico_id: mantenimientos.tecnico_id,
			tecnico: personas.nombre,
			proveedor_id: mantenimientos.proveedor_id,
			proveedor: proveedores.nombre,
			tipo: mantenimientos.tipo,
			fecha_salida: mantenimientos.fecha_salida,
			fecha_retorno: mantenimientos.fecha_retorno,
			diagnostico: mantenimientos.diagnostico,
			costo: mantenimientos.costo,
			estado: mantenimientos.estado,
		})
		.from(mantenimientos)
		.innerJoin(activos, eq(mantenimientos.activo_id, activos.id))
		.leftJoin(personas, eq(mantenimientos.tecnico_id, personas.id))
		.leftJoin(proveedores, eq(mantenimientos.proveedor_id, proveedores.id))
		.where(filtros.length > 0 ? and(...filtros) : undefined)
		.orderBy(
			query.estado === "abierto"
				? asc(mantenimientos.fecha_salida)
				: desc(mantenimientos.fecha_salida),
		)
		.limit(limit)
		.offset(offset);

	const [totalResult] = await db
		.select({ total: count() })
		.from(mantenimientos)
		.where(filtros.length > 0 ? and(...filtros) : undefined);

	return {
		data: filas.map((fila) => ({
			...fila,
			responsable_label: etiqueta("responsable", fila.responsable),
			tipo_label: etiqueta("tipoMantenimiento", fila.tipo),
			estado_label: etiqueta("estadoMantenimiento", fila.estado),
		})),
		pagination: {
			page,
			limit,
			total: Number(totalResult.total),
			totalPages: Math.ceil(Number(totalResult.total) / limit),
		},
	};
}

export async function getMantenimiento(id: number, personaId?: number) {
	const [fila] = await db
		.select({
			id: mantenimientos.id,
			activo_id: mantenimientos.activo_id,
			activo: activos.nombre,
			responsable: mantenimientos.responsable,
			tecnico_id: mantenimientos.tecnico_id,
			proveedor_id: mantenimientos.proveedor_id,
			tipo: mantenimientos.tipo,
			fecha_salida: mantenimientos.fecha_salida,
			fecha_retorno: mantenimientos.fecha_retorno,
			diagnostico: mantenimientos.diagnostico,
			costo: mantenimientos.costo,
			estado: mantenimientos.estado,
		})
		.from(mantenimientos)
		.innerJoin(activos, eq(mantenimientos.activo_id, activos.id))
		.where(eq(mantenimientos.id, id))
		.limit(1);

	if (!fila) {
		throw new ErrorHttp(404, "El mantenimiento no existe");
	}

	if (personaId) {
		const [asignado] = await db
			.select({ id: asignaciones.id })
			.from(asignaciones)
			.where(
				and(
					eq(asignaciones.activo_id, fila.activo_id),
					eq(asignaciones.persona_id, personaId),
					isNull(asignaciones.fecha_devolucion_real),
				),
			)
			.limit(1);

		if (!asignado) {
			throw new ErrorHttp(404, "El mantenimiento no existe");
		}
	}

	return {
		...fila,
		responsable_label: etiqueta("responsable", fila.responsable),
		tipo_label: etiqueta("tipoMantenimiento", fila.tipo),
		estado_label: etiqueta("estadoMantenimiento", fila.estado),
	};
}

// Abre un mantenimiento y marca el activo en mantenimiento
export async function crearMantenimiento(
	input: {
		activo_id: number;
		responsable: "interno" | "externo";
		tecnico_id?: number;
		proveedor_id?: number;
		tipo: "preventivo" | "correctivo";
		fecha_salida: string;
		diagnostico?: string;
		costo?: number;
	},
	actorId: number,
) {
	return await db.transaction(async (tx) => {
		const [activo] = await tx
			.select({
				id: activos.id,
				nombre: activos.nombre,
				estado: activos.estado,
			})
			.from(activos)
			.where(and(eq(activos.id, input.activo_id), isNull(activos.deleted_at)))
			.for("update")
			.limit(1);

		if (!activo) {
			throw new ErrorHttp(404, "El activo no existe o está dado de baja");
		}

		const [asignacionActiva] = await tx
			.select({ id: asignaciones.id })
			.from(asignaciones)
			.where(
				and(
					eq(asignaciones.activo_id, input.activo_id),
					isNull(asignaciones.fecha_devolucion_real),
				),
			)
			.limit(1);

		if (asignacionActiva) {
			throw new ErrorHttp(
				400,
				"No se puede abrir mantenimiento: el activo está asignado",
			);
		}

		const [abierto] = await tx
			.select({ id: mantenimientos.id })
			.from(mantenimientos)
			.where(
				and(
					eq(mantenimientos.activo_id, input.activo_id),
					eq(mantenimientos.estado, "abierto"),
				),
			)
			.limit(1);

		if (abierto) {
			throw new ErrorHttp(400, "El activo ya tiene un mantenimiento abierto");
		}

		const [creado] = await tx
			.insert(mantenimientos)
			.values({
				activo_id: input.activo_id,
				responsable: input.responsable,
				tecnico_id: input.tecnico_id ?? null,
				proveedor_id: input.proveedor_id ?? null,
				tipo: input.tipo,
				fecha_salida: input.fecha_salida,
				diagnostico: input.diagnostico ?? null,
				costo: input.costo != null ? String(input.costo) : null,
			})
			.$returningId();

		await tx
			.update(activos)
			.set({ estado: "mantenimiento" })
			.where(eq(activos.id, input.activo_id));

		await registrarEvento(tx, {
			entidad: "mantenimiento",
			entidad_id: creado.id,
			accion: "mantenimiento.abierto",
			actor_id: actorId,
			nuevos: {
				activo_id: input.activo_id,
				responsable: input.responsable,
				tipo: input.tipo,
				fecha_salida: input.fecha_salida,
			},
		});

		return {
			id: creado.id,
			...input,
			responsable_label: etiqueta("responsable", input.responsable),
			tipo_label: etiqueta("tipoMantenimiento", input.tipo),
			estado_label: "Abierto",
		};
	});
}

export async function actualizarMantenimiento(
	id: number,
	input: {
		responsable?: "interno" | "externo";
		tecnico_id?: number;
		proveedor_id?: number;
		tipo?: "preventivo" | "correctivo";
		fecha_salida?: string;
		diagnostico?: string;
		costo?: number;
	},
	actorId: number,
) {
	const [existente] = await db
		.select()
		.from(mantenimientos)
		.where(eq(mantenimientos.id, id))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "El mantenimiento no existe");
	}

	if (existente.estado === "cerrado") {
		throw new ErrorHttp(400, "El mantenimiento ya está cerrado");
	}

	const cambios: Partial<typeof mantenimientos.$inferInsert> = {};
	if (input.responsable) cambios.responsable = input.responsable;
	if (input.tecnico_id !== undefined) cambios.tecnico_id = input.tecnico_id;
	if (input.proveedor_id !== undefined)
		cambios.proveedor_id = input.proveedor_id;
	if (input.tipo) cambios.tipo = input.tipo;
	if (input.fecha_salida) cambios.fecha_salida = input.fecha_salida;
	if (input.diagnostico !== undefined) {
		cambios.diagnostico = input.diagnostico || null;
	}
	if (input.costo !== undefined) {
		cambios.costo = input.costo != null ? String(input.costo) : null;
	}

	if (Object.keys(cambios).length === 0) {
		throw new ErrorHttp(400, "No se proporcionaron campos para actualizar");
	}

	await db.transaction(async (tx) => {
		await tx
			.update(mantenimientos)
			.set(cambios)
			.where(eq(mantenimientos.id, id));

		await registrarEvento(tx, {
			entidad: "mantenimiento",
			entidad_id: id,
			accion: "mantenimiento.actualizado",
			actor_id: actorId,
			anteriores: {
				tipo: existente.tipo,
				fecha_salida: existente.fecha_salida,
			},
			nuevos: cambios as Record<string, unknown>,
		});
	});

	return { id, ...cambios };
}

// Cierra el mantenimiento y libera el activo
export async function cerrarMantenimiento(
	id: number,
	input: { fecha_retorno: string; diagnostico?: string; costo?: number },
	actorId: number,
) {
	const [existente] = await db
		.select()
		.from(mantenimientos)
		.where(eq(mantenimientos.id, id))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "El mantenimiento no existe");
	}

	if (existente.estado === "cerrado") {
		throw new ErrorHttp(400, "El mantenimiento ya está cerrado");
	}

	if (new Date(input.fecha_retorno) < new Date(existente.fecha_salida)) {
		throw new ErrorHttp(
			400,
			"La fecha de retorno no puede ser anterior a la de salida",
		);
	}

	await db.transaction(async (tx) => {
		await tx
			.update(mantenimientos)
			.set({
				estado: "cerrado",
				fecha_retorno: input.fecha_retorno,
				diagnostico: input.diagnostico ?? existente.diagnostico,
				costo: input.costo != null ? String(input.costo) : existente.costo,
			})
			.where(eq(mantenimientos.id, id));

		await tx
			.update(activos)
			.set({ estado: "disponible" })
			.where(eq(activos.id, existente.activo_id));

		await registrarEvento(tx, {
			entidad: "mantenimiento",
			entidad_id: id,
			accion: "mantenimiento.cerrado",
			actor_id: actorId,
			nuevos: {
				activo_id: existente.activo_id,
				fecha_retorno: input.fecha_retorno,
				costo: input.costo ?? null,
			},
		});
	});

	return {
		id,
		activo_id: existente.activo_id,
		...input,
		estado: "cerrado",
		estado_label: etiqueta("estadoMantenimiento", "cerrado"),
	};
}
