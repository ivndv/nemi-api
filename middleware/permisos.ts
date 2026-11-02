// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
// Logger
import { logger } from "../services/logger.js";
import { codigoRol } from "../services/presentacion.js";

// Middleware: autoriza el acceso según el rol del usuario
export function permisos(...requiredRoles: string[]) {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = req.user;

		// 1. Rechaza si el usuario no tiene datos válidos en el token
		if (!user?.id || !user?.email) {
			logger.warn("Acceso denegado: usuario sin datos", {
				ip: req.ip,
				path: req.path,
			});
			res.status(403).json({
				error: "No tienes permisos para esta acción.",
				codigo: "SIN_PERMISOS",
			});
			return;
		}

		// 2. Valida que los roles requeridos sean un arreglo de strings
		if (
			!Array.isArray(requiredRoles) ||
			requiredRoles.some((role) => typeof role !== "string")
		) {
			logger.error("permisos: roles inválidos", { requiredRoles });
			res.status(500).json({ error: "Error interno del servidor" });
			return;
		}

		// 3. Compara el rol del usuario contra los roles permitidos
		const rolUsuario = codigoRol(user.rol) ?? user.rol?.toLowerCase();
		const rolesPermitidos = requiredRoles
			.map((role) => codigoRol(role) ?? role.toLowerCase())
			.filter(Boolean);

		if (rolUsuario && rolesPermitidos.includes(rolUsuario)) {
			// 3a. Coincide — permite el acceso
			next();
		} else {
			// 3b. No coincide — deniega el acceso
			logger.warn("Acceso denegado: rol insuficiente", {
				usuario: user.id,
				rol: user.rol,
				requerido: requiredRoles.join(", "),
				path: req.path,
			});
			res.status(403).json({
				error: "No tienes permisos para esta acción.",
				codigo: "SIN_PERMISOS",
			});
		}
	};
}
