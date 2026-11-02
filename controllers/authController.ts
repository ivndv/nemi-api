// Express
import type { Request, Response } from "express-serve-static-core";
// Servicios
import {
	cerrarSesionEnTodos,
	iniciarSesion,
	registrarUsuario,
} from "../services/authService.js";
import { ErrorHttp } from "../services/errors.js";

// Controller: registra usuario nuevo
export const registro = async (req: Request, res: Response) => {
	await registrarUsuario(
		req.validated as Parameters<typeof registrarUsuario>[0],
	);
	res
		.status(201)
		.json({ data: null, message: "Usuario registrado exitosamente" });
};

// Controller: inicia sesión de usuario
export const login = async (req: Request, res: Response) => {
	const { email, contrasena } = req.validated as {
		email: string;
		contrasena: string;
	};
	const result = await iniciarSesion({ email, contrasena });
	res.setHeader("Cache-Control", "no-store");
	res.json({ data: result, message: "Sesión iniciada correctamente" });
};

// Controller: cierra la sesión en todos los dispositivos
export const logoutAll = async (req: Request, res: Response) => {
	if (!req.user) {
		throw new ErrorHttp(401, "Debes iniciar sesión.", "SIN_TOKEN");
	}

	await cerrarSesionEnTodos(req.user.id);
	res.setHeader("Cache-Control", "no-store");
	res.json({
		data: null,
		message: "Sesión cerrada en todos los dispositivos.",
	});
};

// Controller: verifica token JWT
export const test = (req: Request, res: Response) => {
	res.json({ data: { user: req.user }, message: "Token válido" });
};
