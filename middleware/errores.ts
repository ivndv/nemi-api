// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
// Errores de negocio
import { ErrorHttp } from "../services/errors.js";
// Logger
import { logger } from "../services/logger.js";

// Middleware: captura cualquier error no controlado en la aplicación
export function errores(
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
) {
	// 1. Determina el código HTTP
	let status = (err as unknown as { status?: number }).status || 500;

	// Body JSON malformado
	if ((err as { type?: string }).type === "entity.parse.failed") {
		status = 400;
	}

	// Body demasiado grande
	if ((err as { type?: string }).type === "entity.too.large") {
		status = 413;
	}

	if (err instanceof ErrorHttp) {
		status = err.status;
	}

	// 2. Registra con contexto y stack
	const contexto = {
		error: err,
		method: req.method,
		path: req.originalUrl,
		status,
	};

	if (status >= 500) {
		logger.error("Error en la petición", contexto);
	} else {
		logger.warn("Petición rechazada", contexto);
	}

	// 3. Responde
	if (err instanceof ErrorHttp) {
		res.status(status).json({
			error: err.message,
			...(err.codigo ? { codigo: err.codigo } : {}),
		});
		return;
	}

	if (
		status === 400 &&
		(err as { type?: string }).type === "entity.parse.failed"
	) {
		res
			.status(400)
			.json({ error: "El cuerpo de la petición no es JSON válido" });
		return;
	}

	if (status === 413) {
		res
			.status(413)
			.json({ error: "El cuerpo de la petición es demasiado grande" });
		return;
	}

	res.status(status).json({
		error: status === 500 ? "Error interno del servidor" : err.message,
	});
}
