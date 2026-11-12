// Drizzle
import { and, eq, isNull } from "drizzle-orm";
// Base de datos
import db from "../config/db.js";
// Esquema
import {
	asignaciones,
	incidencias,
	mantenimientos,
	solicitudes,
} from "../db/schema.js";
// Errores
import { ErrorHttp } from "./errors.js";
// Presentación
import { codigoRol } from "./presentacion.js";

// Normaliza el rol del token a su slug
function slugRol(rol?: string): string | null {
	if (!rol) return null;
	return codigoRol(rol) ?? rol.toLowerCase();
}

// Verifica si el rol es Empleado
export function esEmpleado(rol?: string): boolean {
	return slugRol(rol) === "empleado";
}

// Costos y datos financieros: solo Administrador y Técnico
export function puedeVerCostos(rol?: string): boolean {
	const slug = slugRol(rol);
	return slug === "administrador" || slug === "tecnico";
}

// Dueño administrativo del activo: solo Administrador y Técnico
export function puedeVerDueno(rol?: string): boolean {
	return puedeVerCostos(rol);
}

// Garantías completas: solo Administrador y Técnico
export function puedeVerGarantias(rol?: string): boolean {
	return puedeVerCostos(rol);
}

// Verifica que el activo esté asignado actualmente a la persona
export async function tieneActivoAsignado(
	personaId: number,
	activoId: number,
): Promise<boolean> {
	const [asignacion] = await db
		.select({ id: asignaciones.id })
		.from(asignaciones)
		.where(
			and(
				eq(asignaciones.activo_id, activoId),
				eq(asignaciones.persona_id, personaId),
				isNull(asignaciones.fecha_devolucion_real),
			),
		)
		.limit(1);

	return Boolean(asignacion);
}

// Exige asignación activa para un empleado; 404 para no revelar existencia
export async function exigirActivoAsignado(
	usuario: { id?: number; rol?: string } | undefined,
	activoId: number,
): Promise<void> {
	if (!usuario?.id || !esEmpleado(usuario.rol)) return;

	if (!(await tieneActivoAsignado(usuario.id, activoId))) {
		throw new ErrorHttp(404, "El activo no existe");
	}
}

// Exige acceso del empleado a los adjuntos de una entidad
export async function exigirEntidadAdjunto(
	usuario: { id?: number; rol?: string } | undefined,
	entidad: string,
	entidadId: number,
): Promise<void> {
	if (!esEmpleado(usuario?.rol)) return;
	if (!usuario?.id) throw new ErrorHttp(401, "Debes iniciar sesión.");

	if (entidad === "activo") {
		await exigirActivoAsignado(usuario, entidadId);
		return;
	}

	if (entidad === "incidencia") {
		const [fila] = await db
			.select({
				reportante_id: incidencias.reportante_id,
				activo_id: incidencias.activo_id,
			})
			.from(incidencias)
			.where(eq(incidencias.id, entidadId))
			.limit(1);

		if (!fila) throw new ErrorHttp(404, "La incidencia no existe");
		if (fila.reportante_id === usuario.id) return;
		if (await tieneActivoAsignado(usuario.id, fila.activo_id)) return;

		throw new ErrorHttp(404, "La incidencia no existe");
	}

	if (entidad === "solicitud") {
		const [fila] = await db
			.select({ solicitante_id: solicitudes.solicitante_id })
			.from(solicitudes)
			.where(eq(solicitudes.id, entidadId))
			.limit(1);

		if (fila?.solicitante_id === usuario.id) return;
		throw new ErrorHttp(404, "La solicitud no existe");
	}

	if (entidad === "mantenimiento") {
		const [fila] = await db
			.select({ activo_id: mantenimientos.activo_id })
			.from(mantenimientos)
			.where(eq(mantenimientos.id, entidadId))
			.limit(1);

		if (fila && (await tieneActivoAsignado(usuario.id, fila.activo_id))) {
			return;
		}
		throw new ErrorHttp(404, "El mantenimiento no existe");
	}

	throw new ErrorHttp(404, "No se encontraron adjuntos");
}
