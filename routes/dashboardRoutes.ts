// Express
import express from "express";

const router = express.Router();

// Controladores
import { alertas, resumen } from "../controllers/dashboardController.js";
// Middleware
import { autenticar } from "../middleware/autenticar.js";
import { permisos } from "../middleware/permisos.js";

// GET /api/dashboard/resumen — estadísticas generales
router.get(
	"/resumen",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	resumen,
);

// GET /api/dashboard/alertas — alertas del sistema
router.get(
	"/alertas",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	alertas,
);

export default router;
