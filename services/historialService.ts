import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import db from "../config/db.js";
import { acciones, activos, eventos, personas } from "../db/schema.js";
import { ErrorHttp } from "./errors.js";

// Extrae el detalle legible guardado en el JSON del evento
const detalleEvento = sql<
	string | null
>`JSON_UNQUOTE(JSON_EXTRACT(${eventos.datos_nuevos}, '$.detalles'))`;

// Consultas de historial (eventos)

export async function getHistorialActivo(
	id: number,
	page: number,
	limit: number,
	orden: string,
	search: string,
	accion: string,
	usuario_responsable: string,
) {
	const [activo] = await db
		.select({ id: activos.id })
		.from(activos)
		.where(eq(activos.id, id))
		.limit(1);

	if (!activo) {
		throw new ErrorHttp(404, `No se encontró ningún activo con el ID ${id}.`);
	}

	const safeLimit = Math.min(limit, 100);
	const offset = (page - 1) * safeLimit;

	const condiciones = [
		eq(eventos.entidad, "activo"),
		eq(eventos.entidad_id, id),
	];

	if (search) {
		const condicion = or(
			like(acciones.nombre, `%${search}%`),
			sql`JSON_EXTRACT(${eventos.datos_nuevos}, '$.detalles') LIKE ${`%${search}%`}`,
		);
		if (condicion) condiciones.push(condicion);
	}

	if (accion) {
		const condicion = or(
			eq(acciones.slug, accion),
			eq(acciones.nombre, accion),
		);
		if (condicion) condiciones.push(condicion);
	}

	if (usuario_responsable) {
		condiciones.push(eq(eventos.actor_id, Number(usuario_responsable)));
	}

	const filas = await db
		.select({
			id: eventos.id,
			accion: acciones.nombre,
			slug: acciones.slug,
			fecha: eventos.created_at,
			usuario_responsable: personas.nombre,
			detalles: detalleEvento,
		})
		.from(eventos)
		.innerJoin(acciones, eq(eventos.accion_id, acciones.id))
		.leftJoin(personas, eq(eventos.actor_id, personas.id))
		.where(and(...condiciones))
		.orderBy(
			orden === "desc" ? desc(eventos.created_at) : asc(eventos.created_at),
		)
		.limit(safeLimit)
		.offset(offset);

	const [totalResult] = await db
		.select({ total: count() })
		.from(eventos)
		.innerJoin(acciones, eq(eventos.accion_id, acciones.id))
		.leftJoin(personas, eq(eventos.actor_id, personas.id))
		.where(and(...condiciones));

	return {
		data: filas,
		pagination: {
			page,
			limit: safeLimit,
			total: totalResult.total,
			totalPages: Math.ceil(totalResult.total / safeLimit),
		},
	};
}

// Acciones y personas que aparecen en el historial
export async function getDatosAuxiliares() {
	const listaAcciones = await db
		.selectDistinct({
			id: acciones.id,
			nombre: acciones.nombre,
			slug: acciones.slug,
		})
		.from(acciones)
		.innerJoin(eventos, eq(eventos.accion_id, acciones.id))
		.orderBy(asc(acciones.nombre));

	const listaPersonas = await db
		.selectDistinct({ id: personas.id, nombre: personas.nombre })
		.from(personas)
		.innerJoin(eventos, eq(eventos.actor_id, personas.id))
		.orderBy(asc(personas.nombre));

	return {
		acciones: listaAcciones,
		usuarios: listaPersonas,
	};
}

// Registro manual de una acción en el historial
export async function registrarAccion(
	activoId: number,
	accion: string,
	detalles: string | undefined,
	fecha: string | undefined,
	usuarioResponsable: number | undefined,
	usuarioAsignado: number | undefined,
	ubicacionNueva: number | undefined,
) {
	const [activo] = await db
		.select({ id: activos.id })
		.from(activos)
		.where(eq(activos.id, activoId))
		.limit(1);

	if (!activo) {
		throw new ErrorHttp(
			404,
			`No se encontró ningún activo con el ID ${activoId}.`,
		);
	}

	const [accionRegistrada] = await db
		.select({ id: acciones.id, nombre: acciones.nombre })
		.from(acciones)
		.where(or(eq(acciones.slug, accion), eq(acciones.nombre, accion)))
		.limit(1);

	const accionId =
		accionRegistrada?.id ??
		(
			await db
				.select({ id: acciones.id })
				.from(acciones)
				.where(eq(acciones.slug, "activo.actualizado"))
				.limit(1)
		)[0]?.id;

	if (!accionId) {
		throw new ErrorHttp(500, "No hay acciones registradas en el catálogo.");
	}

	const [creado] = await db
		.insert(eventos)
		.values({
			entidad: "activo",
			entidad_id: activoId,
			accion_id: accionId,
			actor_id: usuarioResponsable ?? null,
			datos_nuevos: {
				detalles: detalles ?? null,
				usuario_asignado: usuarioAsignado ?? null,
				ubicacion_nueva: ubicacionNueva ?? null,
			},
			...(fecha ? { created_at: new Date(fecha) } : {}),
		})
		.$returningId();

	return {
		id: creado.id,
		accion,
		fecha: fecha ?? new Date().toISOString(),
		usuario_responsable: usuarioResponsable,
		usuario_asignado: usuarioAsignado,
		ubicacion_nueva: ubicacionNueva,
		detalles,
	};
}
