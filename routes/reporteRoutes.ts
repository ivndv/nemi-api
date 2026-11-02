// Express
import express from "express";

const router = express.Router();

// Controladores
import {
	datosAuxiliares,
	generar,
	tiposReporte,
} from "../controllers/reporteController.js";
// Middleware
import { autenticar } from "../middleware/autenticar.js";
import { limiteReportes } from "../middleware/limite.js";
import { permisos } from "../middleware/permisos.js";
import { validar } from "../middleware/validar.js";
// Schemas
import { generarReporteSchema } from "../schemas/reporte.js";

// GET /api/reportes/tipos — tipos de reporte disponibles
router.get("/tipos", autenticar, tiposReporte);

// GET /api/reportes/datos-auxiliares — catálogos para filtros de reporte
router.get(
	"/datos-auxiliares",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	datosAuxiliares,
);

// POST /api/reportes/generar — genera reporte según tipo y filtros
router.post(
	"/generar",
	autenticar,
	limiteReportes,
	validar(generarReporteSchema),
	generar,
);

export default router;
