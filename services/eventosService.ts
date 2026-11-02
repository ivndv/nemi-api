import { eq } from "drizzle-orm";
import type db from "../config/db.js";
import { acciones, eventos } from "../db/schema.js";
import { ErrorHttp } from "./errors.js";

// Tipo de la transacción de Drizzle
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Caché de ids de acciones por slug
const cacheAcciones = new Map<string, number>();

async function obtenerAccionId(tx: Tx, slug: string): Promise<number> {
	const enCache = cacheAcciones.get(slug);
	if (enCache) return enCache;

	const [fila] = await tx
		.select({ id: acciones.id })
		.from(acciones)
		.where(eq(acciones.slug, slug))
		.limit(1);

	if (!fila) throw new ErrorHttp(500, `Acción no registrada: ${slug}`);

	cacheAcciones.set(slug, fila.id);
	return fila.id;
}

// Registra un evento dentro de la transacción de la operación
export async function registrarEvento(
	tx: Tx,
	datos: {
		entidad: (typeof eventos.$inferInsert)["entidad"];
		entidad_id: number;
		accion: string;
		actor_id?: number | null;
		anteriores?: Record<string, unknown> | null;
		nuevos?: Record<string, unknown> | null;
	},
): Promise<void> {
	await tx.insert(eventos).values({
		entidad: datos.entidad,
		entidad_id: datos.entidad_id,
		accion_id: await obtenerAccionId(tx, datos.accion),
		actor_id: datos.actor_id ?? null,
		datos_anteriores: datos.anteriores ?? null,
		datos_nuevos: datos.nuevos ?? null,
	});
}
