// Express
import express from "express";
// Controladores
import * as personasController from "../controllers/personasController.js";
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
	actualizarPersonaSchema,
	cambiarPasswordSchema,
	crearPersonaSchema,
	listarPersonasQuerySchema,
} from "../schemas/personas.js";

const router = express.Router();

// Solo administradores gestionan usuarios
router.use(autenticar, permisos("Administrador"));
router.param("id", validarParamId);

router.get(
	"/",
	validarQuery(listarPersonasQuerySchema),
	personasController.listar,
);

router.get("/catalogos", personasController.catalogos);

router.get("/:id", personasController.detalle);

router.post("/", validar(crearPersonaSchema), personasController.crear);

router.put(
	"/:id",
	validar(actualizarPersonaSchema),
	personasController.actualizar,
);

router.patch(
	"/:id/password",
	validar(cambiarPasswordSchema),
	personasController.cambiarPassword,
);

router.patch("/:id/desbloquear", personasController.desbloquear);

router.patch("/:id/baja", personasController.darDeBaja);

export default router;
