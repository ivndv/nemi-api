// Rate limiter
import rateLimit from "express-rate-limit";

// Middleware: limita todas las solicitudes a la API a 100 cada 15 minutos
export const limiteGlobal = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
	message: { error: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos." },
	standardHeaders: true,
	legacyHeaders: false,
});
