// Express
import express from "express";
// Controladores
import * as mantenimientosController from "../controllers/mantenimientosController.js";
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
	actualizarMantenimientoSchema,
	cerrarMantenimientoSchema,
	crearMantenimientoSchema,
} from "../schemas/mantenimientos.js";
import { mantenimientosQuerySchema } from "../schemas/query.js";

const router = express.Router();

// Valida el id de la ruta antes del controller
router.param("id", validarParamId);

// Lectura para autenticados (el empleado solo los de sus activos)
router.get(
	"/",
	autenticar,
	validarQuery(mantenimientosQuerySchema),
	mantenimientosController.listar,
);
router.get("/:id", autenticar, mantenimientosController.detalle);

// Escritura
router.post(
	"/",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(crearMantenimientoSchema),
	mantenimientosController.crear,
);

router.put(
	"/:id",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(actualizarMantenimientoSchema),
	mantenimientosController.actualizar,
);

router.patch(
	"/:id/cerrar",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(cerrarMantenimientoSchema),
	mantenimientosController.cerrar,
);

export default router;
