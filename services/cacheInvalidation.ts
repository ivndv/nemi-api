import { cacheDel, cacheIncr } from "./cacheService.js";

export async function invalidarDashboard(): Promise<void> {
	await cacheDel("nemi:dashboard:resumen", "nemi:dashboard:alertas");
}

export async function invalidarCatalogos(): Promise<void> {
	await cacheDel("nemi:catalogos:activos");
}

/**
 * Invalida dashboard y reportes después de una mutación de negocio.
 */
export async function invalidarOperacion(): Promise<void> {
	await Promise.all([invalidarDashboard(), cacheIncr("nemi:reportes:version")]);
}
