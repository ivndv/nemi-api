import { eq } from "drizzle-orm";
import db from "../config/db.js";
import { configuracion } from "../db/schema.js";

/**
 * Utilidades de fecha con zona horaria de negocio.
 *
 * - Los instantes (TIMESTAMP) viven en UTC.
 * - Las fechas de negocio (DATE) se calculan en la zona configurada.
 */

const ZONA_POR_DEFECTO = "America/Mexico_City";
let zonaActual = ZONA_POR_DEFECTO;

/** Devuelve la zona horaria configurada en memoria. */
export function getZonaActual(): string {
	return zonaActual;
}

/** Valida y actualiza la zona horaria en memoria. */
export function setZonaActual(zona: string): void {
	try {
		new Intl.DateTimeFormat("en-CA", { timeZone: zona });
		zonaActual = zona;
	} catch {
		zonaActual = ZONA_POR_DEFECTO;
	}
}

/** Formatea un instante como YYYY-MM-DD en la zona indicada. */
export function fechaEnZona(zona: string, fecha: Date = new Date()): string {
	const partes = new Intl.DateTimeFormat("en-CA", {
		timeZone: zona,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(fecha);

	const valor = (tipo: string) =>
		partes.find((parte) => parte.type === tipo)?.value ?? "";

	return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

/** Fecha de hoy (YYYY-MM-DD) en la zona de negocio configurada. */
export function fechaHoyEnZona(fecha: Date = new Date()): string {
	return fechaEnZona(zonaActual, fecha);
}

/** Suma días a una fecha YYYY-MM-DD sin cruzar zonas horarias. */
export function sumarDias(fechaISO: string, dias: number): string {
	const [year, month, day] = fechaISO.split("-").map(Number);
	if (!year || !month || !day) return fechaISO;

	return new Date(Date.UTC(year, month - 1, day + dias))
		.toISOString()
		.slice(0, 10);
}

/** Carga desde la BD la zona horaria configurada. */
export async function cargarZonaHoraria(): Promise<string> {
	const [fila] = await db
		.select({ zona: configuracion.zona_horaria })
		.from(configuracion)
		.where(eq(configuracion.id, 1))
		.limit(1);

	setZonaActual(fila?.zona ?? ZONA_POR_DEFECTO);
	return zonaActual;
}
