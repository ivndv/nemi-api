import env from "../config/env.js";
import { ErrorHttp } from "./errors.js";
import { logger } from "./logger.js";

// Servicio externo de hash — delega el hasheo a un microservicio dedicado
class HashService {
	private url: string;
	private apiKey: string;

	constructor() {
		this.url = env.HASH_SERVICE_URL;
		this.apiKey = env.HASH_SERVICE_KEY;
	}

	// Encripta una contraseña llamando al servicio externo
	async generarHash(password: string): Promise<string> {
		try {
			const response = await fetch(`${this.url}/hash`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": this.apiKey || "",
				},
				body: JSON.stringify({ password }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				logger.error("Hash service: respuesta no válida al generar", {
					status: response.status,
					detalle: errorText,
				});
				throw new ErrorHttp(
					503,
					"No se pudo procesar la contraseña. Intenta más tarde.",
					"SERVICIO_NO_DISPONIBLE",
				);
			}

			const result = (await response.json()) as { data: { hash: string } };
			return result.data.hash;
		} catch (error) {
			if (error instanceof ErrorHttp) throw error;

			logger.error("Hash service: error al generar hash", { error });
			throw new ErrorHttp(
				503,
				"No se pudo procesar la contraseña. Intenta más tarde.",
				"SERVICIO_NO_DISPONIBLE",
			);
		}
	}

	// Verifica una contraseña contra su hash mediante el servicio externo
	async verificarHash(password: string, hash: string): Promise<boolean> {
		try {
			const response = await fetch(`${this.url}/verify`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": this.apiKey || "",
				},
				body: JSON.stringify({ password, hash }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				logger.error("Hash service: respuesta no válida al verificar", {
					status: response.status,
					detalle: errorText,
				});
				throw new ErrorHttp(
					503,
					"No se pudo validar la contraseña. Intenta más tarde.",
					"SERVICIO_NO_DISPONIBLE",
				);
			}

			const result = (await response.json()) as { data: { match: boolean } };
			return result.data.match;
		} catch (error) {
			if (error instanceof ErrorHttp) throw error;

			logger.error("Hash service: error al verificar hash", { error });
			throw new ErrorHttp(
				503,
				"No se pudo validar la contraseña. Intenta más tarde.",
				"SERVICIO_NO_DISPONIBLE",
			);
		}
	}
}

export default new HashService();
