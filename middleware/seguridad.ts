// Seguridad HTTP

import cors from "cors";
import helmet from "helmet";
// Configuración
import env from "../config/env.js";

// Orígenes permitidos: CORS_ORIGINS o, si no existe, FRONTEND_URL
const origenes = (env.CORS_ORIGINS ?? env.FRONTEND_URL)
	.split(",")
	.map((origen) => origen.trim())
	.filter(Boolean);

// Middleware: CORS — solo permite los orígenes configurados
export const corsMiddleware = cors({
	origin: origenes.length === 1 ? origenes[0] : origenes,
});

// Middleware: Helmet — cabeceras de seguridad HTTP
export const helmetMiddleware = helmet({
	contentSecurityPolicy: false,
	crossOriginResourcePolicy: { policy: "cross-origin" },
});
