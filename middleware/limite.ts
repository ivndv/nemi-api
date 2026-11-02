// Rate limiter
import rateLimit from "express-rate-limit";
import { crearRateLimitStore } from "../services/rateLimitStore.js";

// Middleware: limita todas las solicitudes a la API a 1000 cada 15 minutos
export const limiteGlobal = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
	message: {
		error: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos.",
		codigo: "LIMITE_GLOBAL",
	},
	standardHeaders: true,
	legacyHeaders: false,
	passOnStoreError: true,
	store: crearRateLimitStore("global"),
});

// Middleware: limita las subidas de archivos a 20 cada 15 minutos
export const limiteSubidas = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: {
		error: "Demasiadas subidas de archivos. Intenta de nuevo en 15 minutos.",
		codigo: "LIMITE_SUBIDAS",
	},
	standardHeaders: true,
	legacyHeaders: false,
	passOnStoreError: true,
	store: crearRateLimitStore("subidas"),
});

// Middleware: limita la generación de reportes a 20 por hora
export const limiteReportes = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 20,
	message: {
		error: "Demasiados reportes generados. Intenta de nuevo en una hora.",
		codigo: "LIMITE_REPORTES",
	},
	standardHeaders: true,
	legacyHeaders: false,
	passOnStoreError: true,
	store: crearRateLimitStore("reportes"),
});
