import { and, count, desc, eq, isNull } from "drizzle-orm";
import db from "../config/db.js";
import {
	activos,
	asignaciones,
	personas,
	solicitudes,
	tiposActivo,
	ubicaciones,
} from "../db/schema.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import { etiqueta } from "./presentacion.js";
import { fechaHoyEnZona } from "./zonaHoraria.js";

export async function listarSolicitudes(
	query: {
		page?: number;
		limit?: number;
		estado?: string;
		tipo?: string;
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
				solicitudes.estado,
				query.estado as "pendiente" | "aprobada" | "rechazada" | "entregada",
			),
		);
	}
	if (query.tipo) {
		filtros.push(
			eq(
				solicitudes.tipo,
				query.tipo as "equipo" | "licencia" | "accesorio" | "reemplazo",
			),
		);
	}
	if (personaId) filtros.push(eq(solicitudes.solicitante_id, personaId));

	const where = filtros.length > 0 ? and(...filtros) : undefined;

	const filas = await db
		.select({
			id: solicitudes.id,
			solicitante_id: solicitudes.solicitante_id,
			solicitante: personas.nombre,
			tipo: solicitudes.tipo,
			tipo_activo_id: solicitudes.tipo_activo_id,
			tipo_activo: tiposActivo.nombre,
			motivo: solicitudes.motivo,
			prioridad: solicitudes.prioridad,
			estado: solicitudes.estado,
			resuelta_por: solicitudes.resuelta_por,
			activo_id: solicitudes.activo_id,
			fecha_resolucion: solicitudes.fecha_resolucion,
			created_at: solicitudes.created_at,
		})
		.from(solicitudes)
		.innerJoin(personas, eq(solicitudes.solicitante_id, personas.id))
		.leftJoin(tiposActivo, eq(solicitudes.tipo_activo_id, tiposActivo.id))
		.where(where)
		.orderBy(desc(solicitudes.created_at))
		.limit(limit)
		.offset(offset);

	const [totalResult] = await db
		.select({ total: count() })
		.from(solicitudes)
		.where(where);

	return {
		data: filas.map((fila) => ({
			...fila,
			tipo_label: etiqueta("tipoSolicitud", fila.tipo),
			prioridad_label: etiqueta("prioridad", fila.prioridad),
			estado_label: etiqueta("estadoSolicitud", fila.estado),
		})),
		pagination: {
			page,
			limit,
			total: Number(totalResult.total),
			totalPages: Math.ceil(Number(totalResult.total) / limit),
		},
	};
}

export async function getSolicitud(id: number, personaId?: number) {
	const [fila] = await db
		.select({
			id: solicitudes.id,
			solicitante_id: solicitudes.solicitante_id,
			solicitante: personas.nombre,
			tipo: solicitudes.tipo,
			tipo_activo_id: solicitudes.tipo_activo_id,
			motivo: solicitudes.motivo,
			prioridad: solicitudes.prioridad,
			estado: solicitudes.estado,
			resuelta_por: solicitudes.resuelta_por,
			activo_id: solicitudes.activo_id,
			fecha_resolucion: solicitudes.fecha_resolucion,
			created_at: solicitudes.created_at,
		})
		.from(solicitudes)
		.innerJoin(personas, eq(solicitudes.solicitante_id, personas.id))
		.where(eq(solicitudes.id, id))
		.limit(1);

	if (!fila) {
		throw new ErrorHttp(404, "La solicitud no existe");
	}

	if (personaId && fila.solicitante_id !== personaId) {
		throw new ErrorHttp(403, "No autorizado para ver esta solicitud");
	}

	return {
		...fila,
		tipo_label: etiqueta("tipoSolicitud", fila.tipo),
		prioridad_label: etiqueta("prioridad", fila.prioridad),
		estado_label: etiqueta("estadoSolicitud", fila.estado),
	};
}

export async function crearSolicitud(
	input: {
		tipo: "equipo" | "licencia" | "accesorio" | "reemplazo";
		tipo_activo_id?: number;
		motivo: string;
		prioridad: "baja" | "media" | "alta";
	},
	solicitanteId: number,
) {
	return await db.transaction(async (tx) => {
		const [creada] = await tx
			.insert(solicitudes)
			.values({
				solicitante_id: solicitanteId,
				tipo: input.tipo,
				tipo_activo_id: input.tipo_activo_id ?? null,
				motivo: input.motivo,
				prioridad: input.prioridad,
			})
			.$returningId();

		await registrarEvento(tx, {
			entidad: "solicitud",
			entidad_id: creada.id,
			accion: "solicitud.creada",
			actor_id: solicitanteId,
			nuevos: {
				tipo: input.tipo,
				prioridad: input.prioridad,
			},
		});

		return {
			id: creada.id,
			...input,
			estado: "pendiente",
			estado_label: etiqueta("estadoSolicitud", "pendiente"),
			tipo_label: etiqueta("tipoSolicitud", input.tipo),
			prioridad_label: etiqueta("prioridad", input.prioridad),
		};
	});
}

async function resolver(
	id: number,
	estado: "aprobada" | "rechazada",
	actorId: number,
	comentario?: string,
) {
	const [existente] = await db
		.select({ id: solicitudes.id, estado: solicitudes.estado })
		.from(solicitudes)
		.where(eq(solicitudes.id, id))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "La solicitud no existe");
	}

	if (existente.estado !== "pendiente") {
		throw new ErrorHttp(400, "La solicitud ya fue resuelta");
	}

	await db.transaction(async (tx) => {
		await tx
			.update(solicitudes)
			.set({
				estado,
				resuelta_por: actorId,
				fecha_resolucion: fechaHoyEnZona(),
			})
			.where(eq(solicitudes.id, id));

		await registrarEvento(tx, {
			entidad: "solicitud",
			entidad_id: id,
			accion:
				estado === "aprobada" ? "solicitud.aprobada" : "solicitud.rechazada",
			actor_id: actorId,
			anteriores: { estado: existente.estado },
			nuevos: { estado, comentario: comentario ?? null },
		});
	});

	return {
		id,
		estado,
		estado_label: etiqueta("estadoSolicitud", estado),
	};
}

export function aprobarSolicitud(
	id: number,
	actorId: number,
	comentario?: string,
) {
	return resolver(id, "aprobada", actorId, comentario);
}

export function rechazarSolicitud(
	id: number,
	actorId: number,
	comentario?: string,
) {
	return resolver(id, "rechazada", actorId, comentario);
}

// Entrega: se crea la asignación al solicitante (o a quien se indique)
export async function entregarSolicitud(
	id: number,
	input: { activo_id: number; ubicacion_id: number; persona_id?: number },
	actorId: number,
) {
	const [solicitud] = await db
		.select()
		.from(solicitudes)
		.where(eq(solicitudes.id, id))
		.limit(1);

	if (!solicitud) {
		throw new ErrorHttp(404, "La solicitud no existe");
	}

	if (solicitud.estado !== "aprobada") {
		throw new ErrorHttp(
			400,
			"La solicitud debe estar aprobada antes de entregarse",
		);
	}

	const personaId = input.persona_id ?? solicitud.solicitante_id;

	return await db.transaction(async (tx) => {
		const [persona] = await tx
			.select({
				id: personas.id,
				nombre: personas.nombre,
				departamento_id: personas.departamento_id,
			})
			.from(personas)
			.where(and(eq(personas.id, personaId), isNull(personas.deleted_at)))
			.limit(1);

		if (!persona) {
			throw new ErrorHttp(404, "La persona no existe");
		}

		if (!persona.departamento_id) {
			throw new ErrorHttp(400, "La persona no tiene departamento asignado");
		}

		const [ubicacion] = await tx
			.select({ id: ubicaciones.id, nombre: ubicaciones.nombre })
			.from(ubicaciones)
			.where(eq(ubicaciones.id, input.ubicacion_id))
			.limit(1);

		if (!ubicacion) {
			throw new ErrorHttp(404, "La ubicación no existe");
		}

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

		if (activo.estado !== "disponible") {
			throw new ErrorHttp(400, "El activo no está disponible para entregar");
		}

		const [asignacion] = await tx
			.insert(asignaciones)
			.values({
				activo_id: input.activo_id,
				persona_id: personaId,
				departamento_id: persona.departamento_id as number,
				ubicacion_id: input.ubicacion_id,
				fecha_asignacion: fechaHoyEnZona(),
				comentarios: `Entrega de la solicitud #${id}`,
			})
			.$returningId();

		await tx
			.update(activos)
			.set({ estado: "asignado", ubicacion_id: input.ubicacion_id })
			.where(eq(activos.id, input.activo_id));

		await tx
			.update(solicitudes)
			.set({
				estado: "entregada",
				activo_id: input.activo_id,
				resuelta_por: actorId,
				fecha_resolucion: fechaHoyEnZona(),
			})
			.where(eq(solicitudes.id, id));

		await registrarEvento(tx, {
			entidad: "asignacion",
			entidad_id: asignacion.id,
			accion: "asignacion.creada",
			actor_id: actorId,
			nuevos: {
				activo_id: input.activo_id,
				persona_id: personaId,
				ubicacion_id: input.ubicacion_id,
				solicitud_id: id,
			},
		});

		await registrarEvento(tx, {
			entidad: "solicitud",
			entidad_id: id,
			accion: "solicitud.entregada",
			actor_id: actorId,
			nuevos: {
				activo_id: input.activo_id,
				asignacion_id: asignacion.id,
				persona_id: personaId,
			},
		});

		return {
			id,
			estado: "entregada",
			estado_label: etiqueta("estadoSolicitud", "entregada"),
			activo_id: input.activo_id,
			asignacion_id: asignacion.id,
			persona_id: personaId,
			ubicacion_id: input.ubicacion_id,
		};
	});
}
