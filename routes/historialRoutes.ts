// Express
import express from "express";

const router = express.Router();

// Valida el id de la ruta antes del controller
router.param("id", validarParamId);

// Controladores
import {
	datosAuxiliares,
	historialActivo,
	registrarAccionHistorial,
} from "../controllers/historialController.js";
// Middleware
import { autenticar } from "../middleware/autenticar.js";
import { permisos } from "../middleware/permisos.js";
import {
	validar,
	validarParamId,
	validarQuery,
} from "../middleware/validar.js";
// Schemas
import { registrarAccionSchema } from "../schemas/historial.js";
import { historialQuerySchema } from "../schemas/query.js";

// GET /api/historial/activos/:id — historial paginado de un activo
router.get(
	"/activos/:id",
	autenticar,
	validarQuery(historialQuerySchema),
	historialActivo,
);

// GET /api/historial/filtros-auxiliares — acciones y usuarios para filtros
router.get("/filtros-auxiliares", autenticar, datosAuxiliares);

// POST /api/historial/activos/:id — registra acción en el historial
router.post(
	"/activos/:id",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(registrarAccionSchema),
	registrarAccionHistorial,
);

export default router;
