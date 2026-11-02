// Express
import express from "express";
// Controladores
import * as solicitudesController from "../controllers/solicitudesController.js";
// Middleware
import { autenticar } from "../middleware/autenticar.js";
import { permisos } from "../middleware/permisos.js";
import {
	validar,
	validarParamId,
	validarQuery,
} from "../middleware/validar.js";
import { solicitudesQuerySchema } from "../schemas/query.js";
// Schemas
import {
	crearSolicitudSchema,
	entregarSolicitudSchema,
	resolverSolicitudSchema,
} from "../schemas/solicitudes.js";

const router = express.Router();

// Valida el id de la ruta antes del controller
router.param("id", validarParamId);

// Cualquier usuario puede crear y consultar las suyas
router.get(
	"/",
	autenticar,
	validarQuery(solicitudesQuerySchema),
	solicitudesController.listar,
);
router.get("/:id", autenticar, solicitudesController.detalle);
router.post(
	"/",
	autenticar,
	validar(crearSolicitudSchema),
	solicitudesController.crear,
);

// Resolución: administrador y técnico
router.patch(
	"/:id/aprobar",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(resolverSolicitudSchema),
	solicitudesController.aprobar,
);

router.patch(
	"/:id/rechazar",
	autenticar,
	permisos("Administrador", "Técnico"),
	validar(resolverSolicitudSchema),
	solicitudesController.rechazar,
);

// Entrega: administrador, técnico y almacén
router.patch(
	"/:id/entregar",
	autenticar,
	permisos("Administrador", "Técnico", "Almacén"),
	validar(entregarSolicitudSchema),
	solicitudesController.entregar,
);

export default router;
