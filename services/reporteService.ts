import { and, eq } from "drizzle-orm";
import type { ExecuteValues, RowDataPacket } from "mysql2/promise";
import db, { pool } from "../config/db.js";
import {
	personas,
	proveedores,
	reportesGenerados,
	roles,
	tiposActivo,
	tiposReporte,
	tiposReporteRoles,
	ubicaciones,
} from "../db/schema.js";
import { ErrorHttp } from "./errors.js";
import { codigoRol } from "./presentacion.js";
import { obtenerDefinicion } from "./reportes/registroReporte.js";

// Tipos de reporte disponibles

export async function getTiposReporte(rolUsuario: string) {
	const slug = codigoRol(rolUsuario) ?? rolUsuario;

	const [rol] = await db
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.slug, slug))
		.limit(1);

	if (!rol) {
		return [];
	}

	const lista = await db
		.select({
			id: tiposReporte.id,
			slug: tiposReporte.slug,
			nombre: tiposReporte.nombre,
			descripcion: tiposReporte.descripcion,
			alcance: tiposReporte.alcance,
			activo: tiposReporte.activo,
		})
		.from(tiposReporte)
		.innerJoin(
			tiposReporteRoles,
			eq(tiposReporteRoles.tipo_id, tiposReporte.id),
		)
		.where(
			and(eq(tiposReporte.activo, true), eq(tiposReporteRoles.rol_id, rol.id)),
		)
		.orderBy(tiposReporte.nombre);

	return lista;
}

// Datos auxiliares para filtros de reportes
export async function getDatosAuxiliares() {
	const tipos = await db
		.select({ id: tiposActivo.id, nombre: tiposActivo.nombre })
		.from(tiposActivo);
	const personasList = await db
		.select({ id: personas.id, nombre: personas.nombre })
		.from(personas);
	const ubicacionesList = await db
		.select({ id: ubicaciones.id, nombre: ubicaciones.nombre })
		.from(ubicaciones);
	const proveedoresList = await db
		.select({ id: proveedores.id, nombre: proveedores.nombre })
		.from(proveedores);

	return {
		tiposActivo: tipos,
		usuarios: personasList,
		ubicaciones: ubicacionesList,
		proveedores: proveedoresList,
	};
}

// Tablas permitidas para resolver nombres de filtros
const TABLAS_NOMBRE: Record<string, string> = {
	tipos: "tipos_activo",
	usuarios: "personas",
	ubicaciones: "ubicaciones",
	proveedores: "proveedores",
};

// Genera un reporte usando la estrategia correspondiente al tipo
export async function generarReporte(
	tipo_id: number,
	filtros: Record<string, unknown>,
	usuario: { id: number; rol: string },
) {
	const slugRol = codigoRol(usuario.rol) ?? usuario.rol;

	const [rol] = await db
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.slug, slugRol))
		.limit(1);

	if (!rol) {
		throw new ErrorHttp(403, "No autorizado para generar reportes");
	}

	const [tipo] = await db
		.select({
			id: tiposReporte.id,
			slug: tiposReporte.slug,
			nombre: tiposReporte.nombre,
			descripcion: tiposReporte.descripcion,
			alcance: tiposReporte.alcance,
		})
		.from(tiposReporte)
		.innerJoin(
			tiposReporteRoles,
			eq(tiposReporteRoles.tipo_id, tiposReporte.id),
		)
		.where(
			and(
				eq(tiposReporte.id, tipo_id),
				eq(tiposReporte.activo, true),
				eq(tiposReporteRoles.rol_id, rol.id),
			),
		)
		.limit(1);

	if (!tipo) {
		throw new ErrorHttp(403, "No autorizado para generar este reporte");
	}

	const definicion = obtenerDefinicion(tipo.slug);
	const filtrosFinales =
		tipo.alcance === "propio"
			? { ...filtros, usuario_id: usuario.id }
			: filtros;

	const { query, params } = definicion.estrategia.buildQuery(filtrosFinales);

	const [results] = (await pool.execute(query, params as ExecuteValues[])) as [
		RowDataPacket[],
		unknown,
	];
	const { resumen, detalles } = definicion.estrategia.procesar(
		results as unknown as Record<string, unknown>[],
	);

	await db.insert(reportesGenerados).values({
		usuario_id: usuario.id,
		tipo_id: tipo.id,
		filtros: filtrosFinales,
		filas: detalles.length,
	});

	async function getNombre(campo: unknown, tabla: string) {
		if (!campo) return "Todos";
		const tablaValida = TABLAS_NOMBRE[tabla];
		if (!tablaValida) return "Desconocido";
		const [rows] = (await pool.execute(
			`SELECT nombre FROM ${tablaValida} WHERE id = ?`,
			[String(campo)],
		)) as [RowDataPacket[], unknown];
		return rows.length > 0
			? ((rows[0] as Record<string, unknown>).nombre as string)
			: "Desconocido";
	}

	return {
		tipo_reporte: tipo.nombre,
		descripcion: tipo.descripcion,
		alcance: tipo.alcance,
		filtros: {
			tipo_activo: await getNombre(filtrosFinales.tipo_activo_id, "tipos"),
			usuario: await getNombre(filtrosFinales.usuario_id, "usuarios"),
			ubicacion: await getNombre(filtrosFinales.ubicacion_id, "ubicaciones"),
			proveedor: await getNombre(filtrosFinales.proveedor_id, "proveedores"),
			fecha_inicio: (filtrosFinales.fecha_inicio as string) || null,
			fecha_fin: (filtrosFinales.fecha_fin as string) || null,
		},
		resultados: { resumen, detalles },
	};
}
