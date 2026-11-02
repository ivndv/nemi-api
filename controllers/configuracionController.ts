// Express
import type { Request, Response } from "express-serve-static-core";
// Servicios
import {
	cambiarContrasenaUsuario,
	getAjustesSistema,
	getConfiguracionAplicacion,
	getPerfilUsuario,
	subirImagenPerfil,
	updateConfiguracionAplicacion,
	updatePerfilUsuario,
} from "../services/configuracionService.js";
// Errores
import { ErrorHttp } from "../services/errors.js";

// Controller: configuración global de la app
export const obtenerConfiguracion = async (_req: Request, res: Response) => {
	const data = await getConfiguracionAplicacion();
	res.json({ data });
};

// Controller: actualiza configuración global
export const actualizarConfiguracion = async (req: Request, res: Response) => {
	const input = req.validated as Parameters<
		typeof updateConfiguracionAplicacion
	>[0];
	await updateConfiguracionAplicacion(input);
	res.json({
		message: "Configuración global actualizada correctamente",
		data: { nuevaConfiguracion: input },
	});
};

// Controller: ajustes básicos para cualquier usuario autenticado
export const obtenerAjustes = async (_req: Request, res: Response) => {
	const data = await getAjustesSistema();
	res.json({ data });
};

// Controller: perfil del usuario autenticado
export const perfilUsuario = async (req: Request, res: Response) => {
	if (!req.user) {
		throw new ErrorHttp(401, "ID de usuario no proporcionado.");
	}
	const data = await getPerfilUsuario(req.user.id);
	res.json({ data });
};

// Controller: actualiza perfil del usuario
export const actualizarPerfil = async (req: Request, res: Response) => {
	await updatePerfilUsuario(
		req.user?.id,
		req.validated as Parameters<typeof updatePerfilUsuario>[1],
	);
	res.json({
		data: null,
		message: "Datos del perfil actualizados correctamente.",
	});
};

// Controller: cambia la contraseña del usuario autenticado
export const cambiarContrasena = async (req: Request, res: Response) => {
	await cambiarContrasenaUsuario(
		req.user?.id,
		req.validated as Parameters<typeof cambiarContrasenaUsuario>[1],
	);
	res.json({
		data: null,
		message: "Contraseña actualizada correctamente.",
	});
};

// Controller: sube imagen de perfil a R2
export const subirImagen = async (req: Request, res: Response) => {
	const file = (req as unknown as { file?: Express.Multer.File }).file;
	if (!file) {
		throw new ErrorHttp(400, "No se recibió ninguna imagen.");
	}
	const result = await subirImagenPerfil(file.buffer, file.mimetype);
	res.json({ data: { url: result.url } });
};
