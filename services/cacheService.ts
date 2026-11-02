import { contextoActual } from "./contexto.js";
import { redis } from "./redis.js";

interface EntradaMemoria {
	valor: unknown;
	expira: number;
}

const memoria = new Map<string, EntradaMemoria>();

function leerMemoria<T>(key: string): T | null {
	const entrada = memoria.get(key);
	if (!entrada) return null;

	if (entrada.expira <= Date.now()) {
		memoria.delete(key);
		return null;
	}

	return entrada.valor as T;
}

/**
 * Obtiene un valor de caché. Si Redis falla, usa la memoria del proceso.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
	if (redis) {
		try {
			const raw = await redis.get(key);
			if (raw) return JSON.parse(raw) as T;
		} catch {
			// Fallback silencioso a memoria
		}
	}

	return leerMemoria<T>(key);
}

/**
 * Guarda un valor en caché con TTL en segundos.
 */
export async function cacheSet(
	key: string,
	valor: unknown,
	ttlSegundos: number,
): Promise<void> {
	memoria.set(key, {
		valor,
		expira: Date.now() + ttlSegundos * 1000,
	});

	if (!redis) return;

	try {
		await redis.set(key, JSON.stringify(valor), "EX", ttlSegundos);
	} catch {
		// La memoria ya tiene el valor
	}
}

export async function cacheIncr(key: string): Promise<number> {
	if (redis) {
		try {
			return await redis.incr(key);
		} catch {
			// Fallback a memoria
		}
	}

	const actual = Number(leerMemoria<number>(key) ?? 0) + 1;
	memoria.set(key, {
		valor: actual,
		expira: Date.now() + 365 * 24 * 60 * 60 * 1000,
	});
	return actual;
}

export async function cacheDel(...keys: string[]): Promise<void> {
	for (const key of keys) {
		memoria.delete(key);
	}

	if (!redis) return;

	try {
		if (keys.length > 0) await redis.del(...keys);
	} catch {
		// La memoria ya fue limpiada
	}
}

/**
 * Devuelve el valor cacheado o ejecuta la función y guarda el resultado.
 */
export async function cacheWrap<T>(
	key: string,
	ttlSegundos: number,
	fn: () => Promise<T>,
): Promise<T> {
	const cacheado = await cacheGet<T>(key);

	if (cacheado !== null) {
		const contexto = contextoActual();
		if (contexto) {
			contexto.cache = "HIT";
			contexto.setCacheHeader?.("HIT");
		}
		return cacheado;
	}

	const valor = await fn();
	await cacheSet(key, valor, ttlSegundos);

	const contexto = contextoActual();
	if (contexto) {
		contexto.cache = "MISS";
		contexto.setCacheHeader?.("MISS");
	}

	return valor;
}
