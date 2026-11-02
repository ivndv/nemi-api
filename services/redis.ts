import { Redis } from "ioredis";
import env from "../config/env.js";

let errorRegistrado = false;

/**
 * Cliente Redis opcional.
 * Si REDIS_URL no está definido, la app usa memoria y sigue funcionando.
 */
export const redis = env.REDIS_URL
	? new Redis(env.REDIS_URL, {
			maxRetriesPerRequest: 2,
			enableOfflineQueue: true,
			retryStrategy: (times) => Math.min(times * 200, 2000),
		})
	: null;

if (redis) {
	redis.on("connect", () => {
		console.log("[REDIS] Conectado");
	});

	redis.on("error", (error) => {
		if (errorRegistrado) return;
		errorRegistrado = true;
		console.error("[REDIS] Error de conexión:", error.message);
	});
}

export const redisDisponible = Boolean(redis);

export async function cerrarRedis(): Promise<void> {
	if (!redis) return;
	try {
		await redis.quit();
	} catch {
		redis.disconnect();
	}
}
