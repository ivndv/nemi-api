// Express
import express from "express";

const router = express.Router();

// Valida el id de la ruta antes del controller
router.param("id", validarParamId);

// Controladores
import * as asignacionesController from "../controllers/asignacionesController.js";
// Middleware
import { autenticar } from "../middleware/autenticar.js";
import { permisos } from "../middleware/permisos.js";
import {
	validar,
	validarParamId,
	validarQuery,
} from "../middleware/validar.js";
// Schemas
import {
	createAsignacionSchema,
	updateAsignacionSchema,
} from "../schemas/asignaciones.js";
import { asignacionesQuerySchema } from "../schemas/query.js";

// GET /api/asignaciones/activos-disponibles — activos libres para asignar
router.get(
	"/activos-disponibles",
	autenticar,
	validarQuery(asignacionesQuerySchema),
	asignacionesController.getActivosDisponibles,
);

// GET /api/asignaciones/datos-auxiliares/:id — datos para formulario de asignación
router.get(
	"/datos-auxiliares/:id",
	autenticar,
	asignacionesController.obtenerDatosAuxiliares,
);

// GET /api/asignaciones/:id — asignación individual
router.get("/:id", autenticar, asignacionesController.getAsignacionPorId);

// GET /api/asignaciones/ — lista paginada de asignaciones
router.get(
	"/",
	autenticar,
	validarQuery(asignacionesQuerySchema),
	asignacionesController.getAsignaciones,
);

// POST /api/asignaciones/ — crea asignación (cambia estado del activo)
router.post(
	"/",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	validar(createAsignacionSchema),
	asignacionesController.createAsignacion,
);

// PUT /api/asignaciones/:id — actualiza asignación existente
router.put(
	"/:id",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	validar(updateAsignacionSchema),
	asignacionesController.updateAsignacion,
);

// DELETE /api/asignaciones/:id — elimina asignación (libera el activo)
router.delete(
	"/:id",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	asignacionesController.deleteAsignacion,
);

export default router;
