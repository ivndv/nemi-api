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

// Lectura para administrador, técnico y almacén
router.get(
	"/",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	validarQuery(licenciasQuerySchema),
	licenciasController.listar,
);
router.get(
	"/:id",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	licenciasController.detalle,
);
router.get(
	"/:id/asientos",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	licenciasController.asientos,
);
router.get(
	"/:id/renovaciones",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	licenciasController.renovaciones,
);

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
