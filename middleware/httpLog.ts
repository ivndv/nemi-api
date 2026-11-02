import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
import { contextoActual } from "../services/contexto.js";
import { logger } from "../services/logger.js";

// Registra cada petición HTTP al terminar, con duración y requestId
export function httpLog(req: Request, res: Response, next: NextFunction) {
	const inicio = performance.now();
	const requestId = req.id;

	res.on("finish", () => {
		logger.info("http", {
			requestId,
			method: req.method,
			path: req.originalUrl.split("?")[0],
			status: res.statusCode,
			durationMs: Math.round(performance.now() - inicio),
			cache: contextoActual()?.cache,
		});
	});

	next();
}
