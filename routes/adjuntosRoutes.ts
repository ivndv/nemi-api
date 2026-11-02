// Express
import express from "express";
// Controladores
import * as adjuntosController from "../controllers/adjuntosController.js";
// Middleware
import { autenticar } from "../middleware/autenticar.js";
import { limiteSubidas } from "../middleware/limite.js";
import { permisos } from "../middleware/permisos.js";
import { subirAdjunto } from "../middleware/subida.js";
import {
	validar,
	validarParamId,
	validarQuery,
} from "../middleware/validar.js";
// Schemas
import { crearAdjuntoSchema } from "../schemas/adjuntos.js";
import { adjuntosQuerySchema } from "../schemas/query.js";

const router = express.Router();

// Valida el id de la ruta antes del controller
router.param("id", validarParamId);

router.get(
	"/",
	autenticar,
	validarQuery(adjuntosQuerySchema),
	adjuntosController.listar,
);

router.post(
	"/",
	autenticar,
	limiteSubidas,
	permisos("Administrador", "Técnico", "Almacén"),
	subirAdjunto,
	validar(crearAdjuntoSchema),
	adjuntosController.crear,
);

router.delete(
	"/:id",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	adjuntosController.eliminar,
);

export default router;
