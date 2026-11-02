// Express
import express from "express";

const router = express.Router();

// Controladores
import {
	actualizarConfiguracion,
	actualizarPerfil,
	cambiarContrasena,
	obtenerAjustes,
	obtenerConfiguracion,
	perfilUsuario,
	subirImagen,
} from "../controllers/configuracionController.js";
// Middleware
import { autenticar } from "../middleware/autenticar.js";
import { limiteSubidas } from "../middleware/limite.js";
import { permisos } from "../middleware/permisos.js";
import { subirArchivo } from "../middleware/subida.js";
import { validar } from "../middleware/validar.js";
// Schemas
import {
	updateConfigSchema,
	updatePasswordSchema,
	updatePerfilSchema,
} from "../schemas/configuracion.js";

// GET /api/configuracion/aplicacion — configuración global del sistema
router.get(
	"/aplicacion",
	autenticar,
	permisos("Administrador"),
	obtenerConfiguracion,
);

// GET /api/configuracion/ajustes — zona y formatos para cualquier usuario
router.get("/ajustes", autenticar, obtenerAjustes);

// PUT /api/configuracion/aplicacion — actualiza configuración global (admin)
router.put(
	"/aplicacion",
	autenticar,
	permisos("Administrador"),
	validar(updateConfigSchema),
	actualizarConfiguracion,
);

// GET /api/configuracion/perfil — perfil del usuario autenticado
router.get("/perfil", autenticar, perfilUsuario);

// PUT /api/configuracion/perfil — actualiza datos del perfil del usuario
router.put(
	"/perfil",
	autenticar,
	validar(updatePerfilSchema),
	actualizarPerfil,
);

// PUT /api/configuracion/perfil/contrasena — cambia la contraseña
router.put(
	"/perfil/contrasena",
	autenticar,
	validar(updatePasswordSchema),
	cambiarContrasena,
);

// POST /api/configuracion/perfil/imagen — sube imagen de perfil a R2
router.post(
	"/perfil/imagen",
	autenticar,
	limiteSubidas,
	subirArchivo,
	subirImagen,
);

export default router;
