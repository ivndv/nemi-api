// Rate limiter
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { crearRateLimitStore } from "../services/rateLimitStore.js";

// Middleware: limita los intentos de login a 5 cada 15 minutos
export const limiteIntentos = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: {
		error: "Demasiados intentos. Espera 15 minutos.",
		codigo: "DEMASIADOS_INTENTOS",
	},
	standardHeaders: true,
	legacyHeaders: false,
	passOnStoreError: true,
	store: crearRateLimitStore("login"),
	keyGenerator: (req) => {
		const email = String(req.body?.email ?? "").toLowerCase();
		return `${ipKeyGenerator(req.ip ?? "")}:${email}`;
	},
});
