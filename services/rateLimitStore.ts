import { type RedisReply, RedisStore } from "rate-limit-redis";
import { redis } from "./redis.js";

/**
 * Crea un store de rate limit en Redis.
 * Si no hay Redis configurado, express-rate-limit usa memoria.
 */
export function crearRateLimitStore(prefijo: string): RedisStore | undefined {
	const client = redis;
	if (!client) return undefined;

	return new RedisStore({
		prefix: `nemi:rl:${prefijo}:`,
		sendCommand: (...args: string[]) => {
			const [command, ...rest] = args;
			return client.call(command, rest) as Promise<RedisReply>;
		},
	});
}
