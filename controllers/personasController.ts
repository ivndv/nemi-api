// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
// Servicio
import {
	invalidarCatalogos,
	invalidarOperacion,
} from "../services/cacheInvalidation.js";
import * as personasService from "../services/personasService.js";

// GET /api/personas
export const listar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await personasService.listarPersonas(
			req.validatedQuery as Parameters<
				typeof personasService.listarPersonas
			>[0],
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
};

// GET /api/personas/catalogos
export const catalogos = async (
	_req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await personasService.obtenerCatalogos();
		res.json({ data });
	} catch (error) {
		next(error);
	}
};

// GET /api/personas/:id
export const detalle = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await personasService.getPersona(Number(req.params.id));
		res.json({ data });
	} catch (error) {
		next(error);
	}
};

// POST /api/personas
export const crear = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await personasService.crearPersona(
			req.validated as Parameters<typeof personasService.crearPersona>[0],
			req.user?.id as number,
		);
		await Promise.all([invalidarCatalogos(), invalidarOperacion()]);
		res.status(201).json({ data, message: "Usuario creado correctamente" });
	} catch (error) {
		next(error);
	}
};

// PUT /api/personas/:id
export const actualizar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await personasService.actualizarPersona(
			Number(req.params.id),
			req.validated as Parameters<typeof personasService.actualizarPersona>[1],
			req.user?.id as number,
		);
		await Promise.all([invalidarCatalogos(), invalidarOperacion()]);
		res.json({ data, message: "Usuario actualizado correctamente" });
	} catch (error) {
		next(error);
	}
};

// PATCH /api/personas/:id/password
export const cambiarPassword = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { contrasena } = req.validated as { contrasena: string };
		await personasService.cambiarPasswordPersona(
			Number(req.params.id),
			contrasena,
			req.user?.id as number,
		);
		res.json({ message: "Contraseña actualizada correctamente" });
	} catch (error) {
		next(error);
	}
};

// PATCH /api/personas/:id/baja
export const darDeBaja = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		await personasService.darDeBajaPersona(
			Number(req.params.id),
			req.user?.id as number,
		);
		await Promise.all([invalidarCatalogos(), invalidarOperacion()]);
		res.json({ message: "Usuario dado de baja correctamente" });
	} catch (error) {
		next(error);
	}
};

// PATCH /api/personas/:id/desbloquear
export const desbloquear = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		await personasService.desbloquearPersona(
			Number(req.params.id),
			req.user?.id as number,
		);
		res.json({ message: "Cuenta desbloqueada correctamente" });
	} catch (error) {
		next(error);
	}
};
