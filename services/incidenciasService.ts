import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
	activos,
	asignaciones,
	incidencias,
	mantenimientos,
	personas,
} from "../db/schema.js";
import { exigirActivoAsignado } from "./autorizacion.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import { etiqueta } from "./presentacion.js";
import { fechaHoyEnZona } from "./zonaHoraria.js";

// Incidencias visibles según el rol
function filtroVisibilidad(personaId?: number) {
	if (!personaId) return undefined;
	return or(
		eq(incidencias.reportante_id, personaId),
		sql`EXISTS (SELECT 1 FROM asignaciones s
		      WHERE s.activo_id = ${incidencias.activo_id}
		        AND s.persona_id = ${personaId}
		        AND s.fecha_devolucion_real IS NULL)`,
	);
}

export async function listarIncidencias(
	query: {
		page?: number;
		limit?: number;
		estado?: string;
		prioridad?: string;
		activo_id?: string;
	},
	personaId?: number,
) {
	const page = Number(query.page) || 1;
	const limit = Math.min(Number(query.limit) || 20, 100);
	const offset = (page - 1) * limit;

	const filtros = [];
	if (query.estado) {
		filtros.push(
			eq(
				incidencias.estado,
				query.estado as "abierta" | "en_revision" | "resuelta" | "cerrada",
			),
		);
	}
	if (query.prioridad) {
		filtros.push(
			eq(incidencias.prioridad, query.prioridad as "baja" | "media" | "alta"),
		);
	}
	if (query.activo_id) {
		filtros.push(eq(incidencias.activo_id, Number(query.activo_id)));
	}
	const visibilidad = filtroVisibilidad(personaId);
	if (visibilidad) filtros.push(visibilidad);

	const where = filtros.length > 0 ? and(...filtros) : undefined;

	const filas = await db
		.select({
			id: incidencias.id,
			activo_id: incidencias.activo_id,
			activo: activos.nombre,
			reportante_id: incidencias.reportante_id,
			reportante: personas.nombre,
			descripcion: incidencias.descripcion,
			prioridad: incidencias.prioridad,
			estado: incidencias.estado,
			mantenimiento_id: incidencias.mantenimiento_id,
			fecha_resolucion: incidencias.fecha_resolucion,
			created_at: incidencias.created_at,
		})
		.from(incidencias)
		.innerJoin(activos, eq(incidencias.activo_id, activos.id))
		.leftJoin(personas, eq(incidencias.reportante_id, personas.id))
		.where(where)
		.orderBy(desc(incidencias.created_at))
		.limit(limit)
		.offset(offset);

	const [totalResult] = await db
		.select({ total: count() })
		.from(incidencias)
		.innerJoin(activos, eq(incidencias.activo_id, activos.id))
		.where(where);

	return {
		data: filas.map((fila) => ({
			...fila,
			prioridad_label: etiqueta("prioridad", fila.prioridad),
			estado_label: etiqueta("estadoIncidencia", fila.estado),
		})),
		pagination: {
			page,
			limit,
			total: Number(totalResult.total),
			totalPages: Math.ceil(Number(totalResult.total) / limit),
		},
	};
}

export async function getIncidencia(id: number, personaId?: number) {
	const [fila] = await db
		.select({
			id: incidencias.id,
			activo_id: incidencias.activo_id,
			activo: activos.nombre,
			reportante_id: incidencias.reportante_id,
			reportante: personas.nombre,
			descripcion: incidencias.descripcion,
			prioridad: incidencias.prioridad,
			estado: incidencias.estado,
			mantenimiento_id: incidencias.mantenimiento_id,
			fecha_resolucion: incidencias.fecha_resolucion,
			created_at: incidencias.created_at,
		})
		.from(incidencias)
		.innerJoin(activos, eq(incidencias.activo_id, activos.id))
		.leftJoin(personas, eq(incidencias.reportante_id, personas.id))
		.where(eq(incidencias.id, id))
		.limit(1);

	if (!fila) {
		throw new ErrorHttp(404, "La incidencia no existe");
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

		if (fila.reportante_id !== personaId && !asignado) {
			throw new ErrorHttp(404, "La incidencia no existe");
		}
	}

	return {
		...fila,
		prioridad_label: etiqueta("prioridad", fila.prioridad),
		estado_label: etiqueta("estadoIncidencia", fila.estado),
	};
}

export async function crearIncidencia(
	input: {
		activo_id: number;
		descripcion: string;
		prioridad: "baja" | "media" | "alta";
	},
	actorId: number,
	actorRol?: string,
) {
	await exigirActivoAsignado({ id: actorId, rol: actorRol }, input.activo_id);

	const [activo] = await db
		.select({ id: activos.id })
		.from(activos)
		.where(and(eq(activos.id, input.activo_id), isNull(activos.deleted_at)))
		.limit(1);

	if (!activo) {
		throw new ErrorHttp(404, "El activo no existe o está dado de baja");
	}

	return await db.transaction(async (tx) => {
		const [creada] = await tx
			.insert(incidencias)
			.values({
				activo_id: input.activo_id,
				reportante_id: actorId,
				descripcion: input.descripcion,
				prioridad: input.prioridad,
			})
			.$returningId();

		await registrarEvento(tx, {
			entidad: "incidencia",
			entidad_id: creada.id,
			accion: "incidencia.reportada",
			actor_id: actorId,
			nuevos: {
				activo_id: input.activo_id,
				prioridad: input.prioridad,
			},
		});

		return {
			id: creada.id,
			...input,
			estado: "abierta",
			estado_label: etiqueta("estadoIncidencia", "abierta"),
			prioridad_label: etiqueta("prioridad", input.prioridad),
		};
	});
}

export async function cambiarEstadoIncidencia(
	id: number,
	input: {
		estado: "abierta" | "en_revision" | "resuelta" | "cerrada";
		fecha_resolucion?: string;
	},
	actorId: number,
) {
	const [existente] = await db
		.select({ id: incidencias.id, estado: incidencias.estado })
		.from(incidencias)
		.where(eq(incidencias.id, id))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "La incidencia no existe");
	}

	const resuelta = input.estado === "resuelta" || input.estado === "cerrada";

	await db.transaction(async (tx) => {
		await tx
			.update(incidencias)
			.set({
				estado: input.estado,
				...(resuelta && {
					fecha_resolucion: input.fecha_resolucion ?? fechaHoyEnZona(),
				}),
			})
			.where(eq(incidencias.id, id));

		await registrarEvento(tx, {
			entidad: "incidencia",
			entidad_id: id,
			accion: "incidencia.actualizada",
			actor_id: actorId,
			anteriores: { estado: existente.estado },
			nuevos: { estado: input.estado },
		});
	});

	return {
		id,
		estado: input.estado,
		estado_label: etiqueta("estadoIncidencia", input.estado),
	};
}

// Abre un mantenimiento a partir de una incidencia
export async function abrirMantenimiento(
	id: number,
	input: {
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
	const [incidencia] = await db
		.select()
		.from(incidencias)
		.where(eq(incidencias.id, id))
		.limit(1);

	if (!incidencia) {
		throw new ErrorHttp(404, "La incidencia no existe");
	}

	if (incidencia.mantenimiento_id) {
		throw new ErrorHttp(400, "La incidencia ya tiene un mantenimiento");
	}

	return await db.transaction(async (tx) => {
		const [activo] = await tx
			.select({ id: activos.id, estado: activos.estado })
			.from(activos)
			.where(
				and(eq(activos.id, incidencia.activo_id), isNull(activos.deleted_at)),
			)
			.for("update")
			.limit(1);

		if (!activo) {
			throw new ErrorHttp(404, "El activo no existe o está dado de baja");
		}

		const [abierto] = await tx
			.select({ id: mantenimientos.id })
			.from(mantenimientos)
			.where(
				and(
					eq(mantenimientos.activo_id, incidencia.activo_id),
					eq(mantenimientos.estado, "abierto"),
				),
			)
			.limit(1);

		if (abierto) {
			throw new ErrorHttp(400, "El activo ya tiene un mantenimiento abierto");
		}

		const [asignacionActiva] = await tx
			.select({ id: asignaciones.id })
			.from(asignaciones)
			.where(
				and(
					eq(asignaciones.activo_id, incidencia.activo_id),
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

		const [mantenimiento] = await tx
			.insert(mantenimientos)
			.values({
				activo_id: incidencia.activo_id,
				responsable: input.responsable,
				tecnico_id: input.tecnico_id ?? null,
				proveedor_id: input.proveedor_id ?? null,
				tipo: input.tipo,
				fecha_salida: input.fecha_salida,
				diagnostico: input.diagnostico ?? incidencia.descripcion,
				costo: input.costo != null ? String(input.costo) : null,
			})
			.$returningId();

		await tx
			.update(activos)
			.set({ estado: "mantenimiento" })
			.where(eq(activos.id, incidencia.activo_id));

		await tx
			.update(incidencias)
			.set({ mantenimiento_id: mantenimiento.id, estado: "en_revision" })
			.where(eq(incidencias.id, id));

		await registrarEvento(tx, {
			entidad: "mantenimiento",
			entidad_id: mantenimiento.id,
			accion: "mantenimiento.abierto",
			actor_id: actorId,
			nuevos: {
				activo_id: incidencia.activo_id,
				incidencia_id: id,
				tipo: input.tipo,
			},
		});

		await registrarEvento(tx, {
			entidad: "incidencia",
			entidad_id: id,
			accion: "incidencia.actualizada",
			actor_id: actorId,
			anteriores: { estado: incidencia.estado },
			nuevos: {
				estado: "en_revision",
				mantenimiento_id: mantenimiento.id,
			},
		});

		return {
			incidencia_id: id,
			mantenimiento_id: mantenimiento.id,
			...input,
		};
	});
}
