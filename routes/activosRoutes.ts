// Express
import express from "express";

const router = express.Router();

// Valida el id de la ruta antes del controller
router.param("id", validarParamId);

// Controladores
import * as activosController from "../controllers/activosController.js";
// Middleware
import { autenticar } from "../middleware/autenticar.js";
import { limiteSubidas } from "../middleware/limite.js";
import { permisos } from "../middleware/permisos.js";
import { subirArchivo } from "../middleware/subida.js";
import {
	validar,
	validarParamId,
	validarQuery,
} from "../middleware/validar.js";
// Schemas
import {
	createActivoSchema,
	updateActivoSchema,
	validarEtiquetaSchema,
} from "../schemas/activos.js";
import { activosQuerySchema } from "../schemas/query.js";

// GET /api/gestion-activos/activos — lista paginada de activos
router.get(
	"/activos",
	autenticar,
	validarQuery(activosQuerySchema),
	activosController.getActivos,
);

// GET /api/gestion-activos/activos/:id — activo individual
router.get("/activos/:id", autenticar, activosController.getActivoById);

// POST /api/gestion-activos/activos — crea activo con imagen opcional
router.post(
	"/activos",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	subirArchivo,
	validar(createActivoSchema),
	activosController.createActivo,
);

// PATCH /api/gestion-activos/baja/:id — da de baja lógica un activo
router.patch(
	"/baja/:id",
	autenticar,
	permisos("Administrador", "Técnico"),
	activosController.darDeBajaActivo,
);

// PUT /api/gestion-activos/activos/:id — actualiza activo existente
router.put(
	"/activos/:id",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	subirArchivo,
	validar(updateActivoSchema),
	activosController.updateActivo,
);

// DELETE /api/gestion-activos/activos/:id — elimina activo físicamente
router.delete(
	"/activos/:id",
	autenticar,
	permisos("Administrador", "Técnico"),
	activosController.deleteActivo,
);

// POST /api/gestion-activos/activos/upload — sube imagen a R2
router.post(
	"/activos/upload",
	autenticar,
	limiteSubidas,
	permisos("Administrador", "Técnico", "Almacén"),
	subirArchivo,
	activosController.subirImagen,
);

// GET /api/gestion-activos/datos-auxiliares — catálogos para formularios
router.get(
	"/datos-auxiliares",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	activosController.obtenerDatosAuxiliares,
);

// POST /api/gestion-activos/validar-etiqueta-serial — verifica disponibilidad
router.post(
	"/validar-etiqueta-serial",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	validar(validarEtiquetaSchema),
	activosController.validarEtiquetaSerial,
);

export default router;
