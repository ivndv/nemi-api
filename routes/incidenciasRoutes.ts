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

// Cualquier usuario autenticado puede reportar y consultar
router.get(
	"/",
	autenticar,
	validarQuery(incidenciasQuerySchema),
	incidenciasController.listar,
);
router.get("/:id", autenticar, incidenciasController.detalle);
router.post(
	"/",
	autenticar,
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
