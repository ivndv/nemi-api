// Express
import express from "express";
// Controladores
import * as licenciasController from "../controllers/licenciasController.js";
// Middleware
import { autenticar } from "../middleware/autenticar.js";
import { permisos } from "../middleware/permisos.js";
import {
	validar,
	validarParamAsiento,
	validarParamId,
	validarQuery,
} from "../middleware/validar.js";
// Schemas
import {
	asignarAsientoSchema,
	crearRenovacionSchema,
} from "../schemas/licencias.js";
import { licenciasQuerySchema } from "../schemas/query.js";

const router = express.Router();

// Valida el id de la ruta antes del controller
router.param("id", validarParamId);
router.param("asiento", validarParamAsiento);

// Lectura para todos los usuarios autenticados
router.get(
	"/",
	autenticar,
	validarQuery(licenciasQuerySchema),
	licenciasController.listar,
);
router.get("/:id", autenticar, licenciasController.detalle);
router.get("/:id/asientos", autenticar, licenciasController.asientos);
router.get("/:id/renovaciones", autenticar, licenciasController.renovaciones);

// Escritura
router.post(
	"/:id/asientos",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	validar(asignarAsientoSchema),
	licenciasController.asignarAsiento,
);

router.patch(
	"/:id/asientos/:asiento/liberar",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	licenciasController.liberarAsiento,
);

router.post(
	"/:id/renovaciones",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(crearRenovacionSchema),
	licenciasController.crearRenovacion,
);

export default router;
