// Express
import express from "express";

const router = express.Router();

// Controladores
import * as authController from "../controllers/authController.js";
import { autenticar } from "../middleware/autenticar.js";
// Middleware
import { limiteIntentos } from "../middleware/intentos.js";
import { permisos } from "../middleware/permisos.js";
import { validar } from "../middleware/validar.js";
// Schemas
import { loginSchema, registroSchema } from "../schemas/auth.js";

// POST /api/auth/registro — registra usuario nuevo (solo admin)
router.post(
	"/registro",
	autenticar,
	permisos("Administrador"),
	validar(registroSchema),
	authController.registro,
);

// POST /api/auth/login — inicia sesión (con rate limit)
router.post(
	"/login",
	limiteIntentos,
	validar(loginSchema),
	authController.login,
);

// POST /api/auth/logout-all — invalida todas las sesiones del usuario
router.post("/logout-all", autenticar, authController.logoutAll);

// GET /api/auth/test — verifica que el token sea válido
router.get("/test", autenticar, permisos("Administrador"), authController.test);

export default router;
