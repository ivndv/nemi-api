import { and, asc, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
	activos,
	asignaciones,
	departamentos,
	licencias,
	personas,
	proveedores,
	tiposActivo,
	ubicaciones,
} from "../db/schema.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import { etiquetaEstado } from "./presentacion.js";
import { fechaHoyEnZona } from "./zonaHoraria.js";

// Consultas de asignaciones

export async function getAsignaciones(
	queryParams_: {
		page?: number;
		limit?: number;
		orden?: string;
		search?: string;
		tipo?: string;
		ubicacion?: string;
		usuario_asignado?: string;
	},
	usuarioId?: number,
) {
	const page = Number(queryParams_.page) || 1;
	const limit = Math.min(Number(queryParams_.limit) || 10, 100);
	const offset = (page - 1) * limit;

	const orden = queryParams_.orden || "asc";
	const safeOrder = orden.toLowerCase() === "desc" ? "DESC" : "ASC";

	const { search = "", tipo, ubicacion, usuario_asignado } = queryParams_;

	const filtros = [
		...(search
			? [
					or(
						sql`CAST(${activos.id} AS CHAR) LIKE ${`%${search}%`}`,
						like(activos.nombre, `%${search}%`),
					),
				]
			: []),
		...(tipo ? [eq(tiposActivo.id, Number(tipo))] : []),
		...(ubicacion ? [eq(ubicaciones.id, Number(ubicacion))] : []),
		...(usuario_asignado ? [eq(personas.id, Number(usuario_asignado))] : []),
		...(usuarioId ? [eq(asignaciones.persona_id, usuarioId)] : []),
	];

	const filas = await db
		.select({
			id: asignaciones.id,
			nombre: activos.nombre,
			tipo_activo: tiposActivo.nombre,
			estado_activo: activos.estado,
			usuario: personas.nombre,
			ubicacion: ubicaciones.nombre,
			foto_url: activos.foto_url,
			usuario_id: asignaciones.persona_id,
			ubicacion_id: asignaciones.ubicacion_id,
			fecha_asignacion: asignaciones.fecha_asignacion,
			fecha_devolucion_real: asignaciones.fecha_devolucion_real,
			fecha_devolucion_pactada: asignaciones.fecha_devolucion_pactada,
			comentarios: asignaciones.comentarios,
		})
		.from(asignaciones)
		.innerJoin(activos, eq(asignaciones.activo_id, activos.id))
		.leftJoin(tiposActivo, eq(activos.tipo_id, tiposActivo.id))
		.innerJoin(personas, eq(asignaciones.persona_id, personas.id))
		.innerJoin(ubicaciones, eq(asignaciones.ubicacion_id, ubicaciones.id))
		.where(filtros.length > 0 ? and(...filtros) : undefined)
		.orderBy(
			safeOrder === "DESC"
				? desc(asignaciones.fecha_asignacion)
				: asc(asignaciones.fecha_asignacion),
		)
		.limit(limit)
		.offset(offset);

	const [totalResult] = await db
		.select({ total: count() })
		.from(asignaciones)
		.innerJoin(activos, eq(asignaciones.activo_id, activos.id))
		.leftJoin(tiposActivo, eq(activos.tipo_id, tiposActivo.id))
		.innerJoin(personas, eq(asignaciones.persona_id, personas.id))
		.innerJoin(ubicaciones, eq(asignaciones.ubicacion_id, ubicaciones.id))
		.where(filtros.length > 0 ? and(...filtros) : undefined);

	const data = filas.map((fila) => ({
		id: fila.id,
		nombre: fila.nombre,
		tipo_activo: fila.tipo_activo,
		estado_activo: etiquetaEstado(fila.estado_activo),
		usuario: fila.usuario,
		ubicacion: fila.ubicacion,
		foto_url: fila.foto_url,
		usuario_id: fila.usuario_id,
		ubicacion_id: fila.ubicacion_id,
		fecha_asignacion: fila.fecha_asignacion,
		fecha_devolucion:
			fila.fecha_devolucion_real ?? fila.fecha_devolucion_pactada,
		comentarios: fila.comentarios,
	}));

	return {
		data,
		pagination: {
			page,
			limit,
			total: totalResult.total,
			totalPages: Math.ceil(totalResult.total / limit),
		},
	};
}

export async function getAsignacionPorId(id: string) {
	const [fila] = await db
		.select({
			id: asignaciones.id,
			activo_id: asignaciones.activo_id,
			nombre: activos.nombre,
			tipo_activo: tiposActivo.nombre,
			estado_activo: activos.estado,
			usuario: personas.nombre,
			ubicacion: ubicaciones.nombre,
			foto_url: activos.foto_url,
			usuario_id: asignaciones.persona_id,
			ubicacion_id: asignaciones.ubicacion_id,
			fecha_asignacion: asignaciones.fecha_asignacion,
			fecha_devolucion_real: asignaciones.fecha_devolucion_real,
			fecha_devolucion_pactada: asignaciones.fecha_devolucion_pactada,
			comentarios: asignaciones.comentarios,
		})
		.from(asignaciones)
		.innerJoin(activos, eq(asignaciones.activo_id, activos.id))
		.leftJoin(tiposActivo, eq(activos.tipo_id, tiposActivo.id))
		.innerJoin(personas, eq(asignaciones.persona_id, personas.id))
		.innerJoin(ubicaciones, eq(asignaciones.ubicacion_id, ubicaciones.id))
		.where(eq(asignaciones.id, Number(id)))
		.limit(1);

	if (!fila) {
		throw new ErrorHttp(404, "La asignación no existe.");
	}

	return {
		id: fila.id,
		activo_id: fila.activo_id,
		nombre: fila.nombre,
		tipo_activo: fila.tipo_activo,
		estado_activo: etiquetaEstado(fila.estado_activo),
		usuario: fila.usuario,
		ubicacion: fila.ubicacion,
		foto_url: fila.foto_url,
		usuario_id: fila.usuario_id,
		ubicacion_id: fila.ubicacion_id,
		fecha_asignacion: fila.fecha_asignacion,
		fecha_devolucion:
			fila.fecha_devolucion_real ?? fila.fecha_devolucion_pactada,
		comentarios: fila.comentarios,
	};
}

// Creación de asignaciones
export async function createAsignacion(
	input: {
		activo_id: number;
		usuario_id: number;
		ubicacion_id: number;
		fecha_asignacion: string;
		fecha_devolucion?: string;
	},
	usuarioResponsableId?: number,
) {
	const {
		activo_id,
		usuario_id,
		ubicacion_id,
		fecha_asignacion,
		fecha_devolucion,
	} = input;

	if (!usuarioResponsableId) {
		throw new ErrorHttp(403, "Acceso no autorizado.");
	}

	const [persona] = await db
		.select({
			nombre: personas.nombre,
			departamento_id: personas.departamento_id,
		})
		.from(personas)
		.where(and(eq(personas.id, usuario_id), isNull(personas.deleted_at)))
		.limit(1);

	if (!persona) {
		throw new ErrorHttp(404, "El usuario no existe.");
	}

	if (!persona.departamento_id) {
		throw new ErrorHttp(400, "El usuario no tiene departamento asignado.");
	}

	const [ubicacion] = await db
		.select({ nombre: ubicaciones.nombre })
		.from(ubicaciones)
		.where(eq(ubicaciones.id, ubicacion_id))
		.limit(1);

	if (!ubicacion) {
		throw new ErrorHttp(404, "La ubicación no existe.");
	}

	return await db.transaction(async (tx) => {
		// Bloquea el activo para evitar asignaciones simultáneas
		const [activo] = await tx
			.select({
				id: activos.id,
				nombre: activos.nombre,
				estado: activos.estado,
			})
			.from(activos)
			.where(and(eq(activos.id, activo_id), isNull(activos.deleted_at)))
			.for("update")
			.limit(1);

		if (!activo) {
			throw new ErrorHttp(404, "El activo no existe o está dado de baja.");
		}

		if (activo.estado !== "disponible") {
			throw new ErrorHttp(400, "El activo no está disponible para asignar.");
		}

		// Las licencias se asignan por asientos, no como hardware
		const [licencia] = await tx
			.select({ activo_id: licencias.activo_id })
			.from(licencias)
			.where(eq(licencias.activo_id, activo_id))
			.limit(1);

		if (licencia) {
			throw new ErrorHttp(
				400,
				"Las licencias se asignan por asientos, no como activo de hardware.",
			);
		}

		const comentarios = `Activo "${activo.nombre}" asignado a "${persona.nombre}" en "${ubicacion.nombre}".`;

		const [creada] = await tx
			.insert(asignaciones)
			.values({
				activo_id,
				persona_id: usuario_id,
				departamento_id: persona.departamento_id as number,
				ubicacion_id,
				fecha_asignacion,
				fecha_devolucion_pactada: fecha_devolucion || null,
				comentarios,
			})
			.$returningId();

		await tx
			.update(activos)
			.set({ estado: "asignado", ubicacion_id })
			.where(eq(activos.id, activo_id));

		await registrarEvento(tx, {
			entidad: "asignacion",
			entidad_id: creada.id,
			accion: "asignacion.creada",
			actor_id: usuarioResponsableId,
			nuevos: {
				activo_id,
				persona_id: usuario_id,
				ubicacion_id,
				detalles: comentarios,
			},
		});

		return {
			id: creada.id,
			activo_id,
			usuario_id,
			ubicacion_id,
			fecha_asignacion,
			fecha_devolucion: fecha_devolucion || null,
			comentarios,
		};
	});
}

// Actualización de asignaciones (devolución o cambio de persona/ubicación)
export async function updateAsignacion(
	id: string,
	input: {
		fecha_devolucion?: string;
		usuario_id?: number;
		ubicacion_id?: number;
	},
	usuarioResponsableId?: number,
) {
	const { fecha_devolucion, usuario_id, ubicacion_id } = input;

	if (!usuarioResponsableId) {
		throw new ErrorHttp(403, "Acceso no autorizado.");
	}

	await db.transaction(async (tx) => {
		const [existente] = await tx
			.select()
			.from(asignaciones)
			.where(eq(asignaciones.id, Number(id)))
			.for("update")
			.limit(1);

		if (!existente) {
			throw new ErrorHttp(404, "La asignación no existe.");
		}

		const cambios: Partial<typeof asignaciones.$inferInsert> = {};

		if (usuario_id && usuario_id !== existente.persona_id) {
			const [persona] = await tx
				.select({
					nombre: personas.nombre,
					departamento_id: personas.departamento_id,
				})
				.from(personas)
				.where(and(eq(personas.id, usuario_id), isNull(personas.deleted_at)))
				.limit(1);

			if (!persona) throw new Error("El nuevo usuario no existe.");
			if (!persona.departamento_id) {
				throw new ErrorHttp(
					400,
					"El nuevo usuario no tiene departamento asignado.",
				);
			}

			cambios.persona_id = usuario_id;
			cambios.departamento_id = persona.departamento_id;
		}

		if (ubicacion_id && ubicacion_id !== existente.ubicacion_id) {
			const [ubicacion] = await tx
				.select({ id: ubicaciones.id })
				.from(ubicaciones)
				.where(eq(ubicaciones.id, ubicacion_id))
				.limit(1);

			if (!ubicacion) throw new ErrorHttp(404, "La nueva ubicación no existe.");
			cambios.ubicacion_id = ubicacion_id;
		}

		if (fecha_devolucion) {
			cambios.fecha_devolucion_real = fecha_devolucion;
		}

		if (Object.keys(cambios).length === 0) {
			throw new ErrorHttp(400, "No se proporcionaron cambios válidos.");
		}

		await tx
			.update(asignaciones)
			.set(cambios)
			.where(eq(asignaciones.id, existente.id));

		// Si se registra la devolución, el activo queda disponible
		if (fecha_devolucion && !existente.fecha_devolucion_real) {
			await tx
				.update(activos)
				.set({ estado: "disponible" })
				.where(eq(activos.id, existente.activo_id));
		}

		await registrarEvento(tx, {
			entidad: "asignacion",
			entidad_id: existente.id,
			accion: fecha_devolucion
				? "asignacion.devuelta"
				: "asignacion.actualizada",
			actor_id: usuarioResponsableId,
			anteriores: {
				persona_id: existente.persona_id,
				ubicacion_id: existente.ubicacion_id,
				fecha_devolucion_real: existente.fecha_devolucion_real,
			},
			nuevos: {
				persona_id: cambios.persona_id ?? existente.persona_id,
				ubicacion_id: cambios.ubicacion_id ?? existente.ubicacion_id,
				fecha_devolucion_real:
					cambios.fecha_devolucion_real ?? existente.fecha_devolucion_real,
			},
		});
	});
}

export async function deleteAsignacion(
	id: string,
	usuarioResponsableId?: number,
) {
	if (!usuarioResponsableId) {
		throw new ErrorHttp(403, "Acceso no autorizado.");
	}

	await db.transaction(async (tx) => {
		const [existente] = await tx
			.select()
			.from(asignaciones)
			.where(eq(asignaciones.id, Number(id)))
			.for("update")
			.limit(1);

		if (!existente) {
			throw new ErrorHttp(404, "Asignación no encontrada");
		}

		if (!existente.fecha_devolucion_real) {
			await tx
				.update(asignaciones)
				.set({ fecha_devolucion_real: fechaHoyEnZona() })
				.where(eq(asignaciones.id, existente.id));

			await tx
				.update(activos)
				.set({ estado: "disponible" })
				.where(eq(activos.id, existente.activo_id));
		}

		await registrarEvento(tx, {
			entidad: "asignacion",
			entidad_id: existente.id,
			accion: "asignacion.devuelta",
			actor_id: usuarioResponsableId,
			nuevos: { activo_id: existente.activo_id, motivo: "desasignación" },
		});
	});
}

export async function getActivosDisponibles(queryParams_: {
	page?: number;
	limit?: number;
	orden?: string;
	search?: string;
	tipo?: string;
	ubicacion?: string;
	proveedores?: string;
}) {
	const page = Number(queryParams_.page) || 1;
	const limit = Math.min(Number(queryParams_.limit) || 10, 100);
	const offset = (page - 1) * limit;

	const orden = queryParams_.orden || "asc";
	const safeOrder = orden.toLowerCase() === "desc" ? "DESC" : "ASC";

	const {
		search = "",
		tipo,
		ubicacion,
		proveedores: proveedorId,
	} = queryParams_;

	const filtros = [
		isNull(activos.deleted_at),
		eq(activos.estado, "disponible"),
		...(search ? [like(activos.nombre, `%${search}%`)] : []),
		...(tipo ? [eq(activos.tipo_id, Number(tipo))] : []),
		...(ubicacion ? [eq(activos.ubicacion_id, Number(ubicacion))] : []),
		...(proveedorId ? [eq(activos.proveedor_id, Number(proveedorId))] : []),
	];

	const filas = await db
		.select({
			id: activos.id,
			activo: activos.nombre,
			tipo_activo: tiposActivo.nombre,
			estado_activo: activos.estado,
			proveedor: proveedores.nombre,
			ubicacion: ubicaciones.nombre,
			foto_url: activos.foto_url,
		})
		.from(activos)
		.leftJoin(tiposActivo, eq(activos.tipo_id, tiposActivo.id))
		.leftJoin(proveedores, eq(activos.proveedor_id, proveedores.id))
		.leftJoin(ubicaciones, eq(activos.ubicacion_id, ubicaciones.id))
		.where(and(...filtros))
		.orderBy(safeOrder === "DESC" ? desc(activos.id) : asc(activos.id))
		.limit(limit)
		.offset(offset);

	const [totalResult] = await db
		.select({ total: count() })
		.from(activos)
		.where(and(...filtros));

	const total = Number(totalResult.total);

	return {
		data: filas.map((fila) => ({
			...fila,
			estado_activo: etiquetaEstado(fila.estado_activo),
		})),
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
}

export async function obtenerDatosAuxiliares(activoId?: string) {
	if (activoId && Number.isNaN(Number(activoId))) {
		throw new ErrorHttp(400, "El ID proporcionado no es válido");
	}

	const personasData = await db
		.select({ id: personas.id, nombre: personas.nombre })
		.from(personas)
		.where(isNull(personas.deleted_at));

	const tiposActivos = await db
		.select({ id: tiposActivo.id, nombre: tiposActivo.nombre })
		.from(tiposActivo);

	const proveedoresData = await db
		.select({ id: proveedores.id, nombre: proveedores.nombre })
		.from(proveedores);

	const ubicacionesData = await db
		.select({ id: ubicaciones.id, nombre: ubicaciones.nombre })
		.from(ubicaciones);

	let nombreActivo: string | null = null;
	let fotoActivo: string | null = null;

	if (activoId) {
		const [activo] = await db
			.select({ nombre: activos.nombre, foto_url: activos.foto_url })
			.from(activos)
			.where(eq(activos.id, Number(activoId)))
			.limit(1);

		if (!activo) {
			throw new ErrorHttp(404, "Activo no encontrado");
		}

		nombreActivo = activo.nombre;
		fotoActivo = activo.foto_url;
	}

	return {
		usuarios: personasData,
		tiposActivos,
		proveedores: proveedoresData,
		ubicaciones: ubicacionesData,
		nombre: nombreActivo,
		foto_url: fotoActivo,
	};
}

// Departamentos disponibles (utilidad para catálogos)
export async function getDepartamentos() {
	return db
		.select({ id: departamentos.id, nombre: departamentos.nombre })
		.from(departamentos);
}
