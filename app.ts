/**
 * Configuración y montaje de la aplicación Express
 */

// Express
import compression from "compression";
import express from "express";
// Documentación
import swaggerUi from "swagger-ui-express";
// Config
import env from "./config/env.js";
// Middleware
import { errores } from "./middleware/errores.js";
import { httpLog } from "./middleware/httpLog.js";
import { limiteGlobal } from "./middleware/limite.js";
import { requestId } from "./middleware/requestId.js";
import { corsMiddleware, helmetMiddleware } from "./middleware/seguridad.js";
// OpenAPI
import { apiDoc } from "./openapi/documento.js";
// Rutas
import activosRoutes from "./routes/activosRoutes.js";
import adjuntosRoutes from "./routes/adjuntosRoutes.js";
import asignacionesRoutes from "./routes/asignacionesRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import configuracionRoutes from "./routes/configuracionRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import garantiasRoutes from "./routes/garantiasRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import historialRoutes from "./routes/historialRoutes.js";
import incidenciasRoutes from "./routes/incidenciasRoutes.js";
import licenciasRoutes from "./routes/licenciasRoutes.js";
import mantenimientosRoutes from "./routes/mantenimientosRoutes.js";
import personasRoutes from "./routes/personasRoutes.js";
import reporteRoutes from "./routes/reporteRoutes.js";
import solicitudesRoutes from "./routes/solicitudesRoutes.js";

const app = express();

// Identificación de peticiones
app.use(requestId);
app.use(httpLog);

// Seguridad
app.set("trust proxy", 1);
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(compression());

// Parseo
app.use(express.json());

// Rate limiting global
app.use("/api", limiteGlobal);

// Raíz informativa
app.get("/", (_req, res) => {
	res.json({
		name: "Nemi API",
		version: "2.0.0",
		health: "/api/health",
		docs: "/api/docs/",
		openapi: "/api/doc",
	});
});

// Documentación (generada desde Zod) — pública
app.get("/api/doc", (_req, res) => {
	res.json(apiDoc);
});
app.use(
	"/api/docs",
	swaggerUi.serve,
	swaggerUi.setup(apiDoc as unknown as Record<string, unknown>),
);

// Rutas de la API
app.use("/api/health", healthRoutes);
app.use("/api/gestion-activos", activosRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/historial", historialRoutes);
app.use("/api/asignaciones", asignacionesRoutes);
app.use("/api/garantias", garantiasRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/licencias", licenciasRoutes);
app.use("/api/mantenimientos", mantenimientosRoutes);
app.use("/api/incidencias", incidenciasRoutes);
app.use("/api/solicitudes", solicitudesRoutes);
app.use("/api/adjuntos", adjuntosRoutes);
app.use("/api/personas", personasRoutes);

// Ruta desconocida
app.use((_req, res) => {
	res.status(404).json({ error: "Ruta no encontrada" });
});

// Error handler global
app.use(errores);

export default app;
