// Express

import { eq } from "drizzle-orm";
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
// JWT
import jwt from "jsonwebtoken";
import db from "../config/db.js";
// Configuración, BD y logger
import env from "../config/env.js";
import { personas } from "../db/schema.js";
import { logger } from "../services/logger.js";

interface TokenDecodificado {
	id: number;
	email: string;
	nombre: string;
	rol: string;
	tv?: number;
}

// Responde un error de autenticación con código estable para el frontend
function rechazar(res: Response, error: string, codigo: string): void {
	res.status(401).json({ error, codigo });
}

// Middleware: verifica el token JWT y que siga vigente para el usuario
export async function autenticar(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const authHeader = req.header("Authorization");

	if (!authHeader?.startsWith("Bearer ")) {
		logger.warn("Auth fallida: sin token", { ip: req.ip, path: req.path });
		rechazar(res, "Debes iniciar sesión para continuar.", "SIN_TOKEN");
		return;
	}

	const token = authHeader.split(" ")[1];

	let decoded: TokenDecodificado;
	try {
		decoded = jwt.verify(token, env.JWT_SECRET) as TokenDecodificado;
	} catch (error: unknown) {
		const errName = (error as Error).name;
		logger.warn("Auth fallida: token inválido", { ip: req.ip, error: errName });

		if (errName === "TokenExpiredError") {
			rechazar(
				res,
				"Tu sesión expiró. Vuelve a iniciar sesión.",
				"TOKEN_EXPIRADO",
			);
			return;
		}

		rechazar(
			res,
			"Tu sesión no es válida. Vuelve a iniciar sesión.",
			"TOKEN_INVALIDO",
		);
		return;
	}

	if (!decoded.id || !decoded.email) {
		logger.warn("Auth fallida: token sin datos esenciales", { ip: req.ip });
		rechazar(
			res,
			"Tu sesión no es válida. Vuelve a iniciar sesión.",
			"TOKEN_INVALIDO",
		);
		return;
	}

	try {
		const [actual] = await db
			.select({
				tv: personas.token_version,
				deleted_at: personas.deleted_at,
			})
			.from(personas)
			.where(eq(personas.id, decoded.id))
			.limit(1);

		if (!actual || actual.deleted_at) {
			rechazar(res, "Tu cuenta ya no está activa.", "CUENTA_INACTIVA");
			return;
		}

		if (decoded.tv === undefined || actual.tv !== decoded.tv) {
			rechazar(
				res,
				"Tu sesión se cerró porque cambió la contraseña o se cerró en otro dispositivo.",
				"SESION_INVALIDADA",
			);
			return;
		}

		req.user = { ...decoded, tv: actual.tv };
		next();
	} catch (error) {
		next(error);
	}
}
