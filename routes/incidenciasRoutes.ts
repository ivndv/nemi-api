// Express
import express from "express";
// Controladores
import * as incidenciasController from "../controllers/incidenciasController.js";
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
	abrirMantenimientoIncidenciaSchema,
	cambiarEstadoIncidenciaSchema,
	crearIncidenciaSchema,
} from "../schemas/incidencias.js";
import { incidenciasQuerySchema } from "../schemas/query.js";

const router = express.Router();

// Valida el id de la ruta antes del controller
router.param("id", validarParamId);

// Administrador, técnico y empleado pueden reportar y consultar
router.get(
	"/",
	autenticar,
	permisos("Administrador", "Técnico", "Empleado"),
	validarQuery(incidenciasQuerySchema),
	incidenciasController.listar,
);
router.get(
	"/:id",
	autenticar,
	permisos("Administrador", "Técnico", "Empleado"),
	incidenciasController.detalle,
);
router.post(
	"/",
	autenticar,
	permisos("Administrador", "Técnico", "Empleado"),
	validar(crearIncidenciaSchema),
	incidenciasController.crear,
);

// Atención: administrador y técnico
router.patch(
	"/:id/estado",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(cambiarEstadoIncidenciaSchema),
	incidenciasController.cambiarEstado,
);

router.post(
	"/:id/mantenimiento",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(abrirMantenimientoIncidenciaSchema),
	incidenciasController.abrirMantenimiento,
);

export default router;
