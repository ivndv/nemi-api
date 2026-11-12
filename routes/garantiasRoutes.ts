// Express
import express from "express";

const router = express.Router();

// Valida el id de la ruta antes del controller
router.param("id", validarParamId);

// Controladores
import {
	actualizarGarantia,
	crearGarantia,
	eliminarGarantia,
	listarGarantias,
} from "../controllers/garantiasController.js";
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
	createGarantiaSchema,
	updateGarantiaSchema,
} from "../schemas/garantias.js";
import { garantiasQuerySchema } from "../schemas/query.js";

// GET /api/garantias/ — lista paginada de garantías
router.get(
	"/",
	autenticar,
	permisos("Administrador", "Técnico"),
	validarQuery(garantiasQuerySchema),
	listarGarantias,
);

// POST /api/garantias/ — registra nueva garantía
router.post(
	"/",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(createGarantiaSchema),
	crearGarantia,
);

// PUT /api/garantias/:id — actualiza garantía existente
router.put(
	"/:id",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(updateGarantiaSchema),
	actualizarGarantia,
);

// DELETE /api/garantias/:id — elimina garantía físicamente
router.delete(
	"/:id",
	autenticar,
	permisos("Administrador", "Técnico"),
	eliminarGarantia,
);

export default router;
