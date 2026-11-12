import { and, desc, eq, isNull } from "drizzle-orm";
import db from "../config/db.js";
import env from "../config/env.js";
import { adjuntos, personas } from "../db/schema.js";
import { esEmpleado, exigirEntidadAdjunto } from "./autorizacion.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import { etiqueta } from "./presentacion.js";
import * as r2Service from "./r2Service.js";

// Lista los adjuntos de una entidad
export async function listarAdjuntos(
	entidad?: string,
	entidadId?: number,
	usuario?: { id?: number; rol?: string },
) {
	// Un empleado solo ve adjuntos de sus activos, incidencias, solicitudes o mantenimientos
	if (esEmpleado(usuario?.rol)) {
		if (!entidad || !entidadId) {
			throw new ErrorHttp(404, "No se encontraron adjuntos");
		}
		await exigirEntidadAdjunto(usuario, entidad, entidadId);
	}

	const filtros = [isNull(adjuntos.deleted_at)];
	if (entidad) {
		filtros.push(
			eq(
				adjuntos.entidad,
				entidad as
					| "activo"
					| "licencia"
					| "garantia"
					| "mantenimiento"
					| "incidencia"
					| "solicitud",
			),
		);
	}
	if (entidadId) filtros.push(eq(adjuntos.entidad_id, entidadId));

	const filas = await db
		.select({
			id: adjuntos.id,
			entidad: adjuntos.entidad,
			entidad_id: adjuntos.entidad_id,
			tipo: adjuntos.tipo,
			nombre: adjuntos.nombre,
			url: adjuntos.url,
			mime: adjuntos.mime,
			tamano: adjuntos.tamano,
			subido_por: adjuntos.subido_por,
			autor: personas.nombre,
			created_at: adjuntos.created_at,
		})
		.from(adjuntos)
		.leftJoin(personas, eq(adjuntos.subido_por, personas.id))
		.where(filtros.length > 0 ? and(...filtros) : undefined)
		.orderBy(desc(adjuntos.created_at));

	return filas.map((fila) => ({
		...fila,
		entidad_label: etiqueta("entidadAdjunto", fila.entidad),
		tipo_label: etiqueta("tipoAdjunto", fila.tipo),
	}));
}

export async function crearAdjunto(
	file: Express.Multer.File,
	input: {
		entidad: (typeof adjuntos.$inferInsert)["entidad"];
		entidad_id: number;
		tipo: (typeof adjuntos.$inferInsert)["tipo"];
		nombre?: string;
	},
	actorId: number,
) {
	const nombre = input.nombre || file.originalname || "adjunto";
	const key = r2Service.generarClave(nombre, file.mimetype);

	let subido: { url: string };
	try {
		subido = await r2Service.subirAR2(file.buffer, key, file.mimetype);
	} catch {
		throw new ErrorHttp(502, "No se pudo subir el archivo a R2");
	}

	return await db.transaction(async (tx) => {
		const [creado] = await tx
			.insert(adjuntos)
			.values({
				entidad: input.entidad,
				entidad_id: input.entidad_id,
				tipo: input.tipo,
				nombre,
				key,
				url: subido.url,
				mime: file.mimetype,
				tamano: file.size,
				subido_por: actorId,
			})
			.$returningId();

		await registrarEvento(tx, {
			entidad: input.entidad,
			entidad_id: input.entidad_id,
			accion: "adjunto.creado",
			actor_id: actorId,
			nuevos: {
				adjunto_id: creado.id,
				tipo: input.tipo,
				nombre,
			},
		});

		return { id: creado.id, url: subido.url, nombre, ...input };
	});
}

// Elimina el archivo de R2 y el registro
export async function eliminarAdjunto(id: number, actorId: number) {
	const [existente] = await db
		.select()
		.from(adjuntos)
		.where(eq(adjuntos.id, id))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "El adjunto no existe");
	}

	const prefijo = `${env.R2_PUBLIC_URL}/`;
	const key =
		existente.key ??
		(existente.url.startsWith(prefijo)
			? existente.url.slice(prefijo.length)
			: existente.url.split("/").pop());

	if (key) {
		try {
			await r2Service.eliminarDeR2(key);
		} catch {
			throw new ErrorHttp(502, "No se pudo eliminar el archivo de R2");
		}
	}

	await db.transaction(async (tx) => {
		await tx
			.update(adjuntos)
			.set({ deleted_at: new Date() })
			.where(eq(adjuntos.id, id));

		await registrarEvento(tx, {
			entidad: existente.entidad,
			entidad_id: existente.entidad_id,
			accion: "adjunto.eliminado",
			actor_id: actorId,
			anteriores: { adjunto_id: id, nombre: existente.nombre },
		});
	});

	return { id, eliminado: true };
}
