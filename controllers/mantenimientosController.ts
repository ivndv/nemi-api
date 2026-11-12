// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
// Autorización
import { esEmpleado } from "../services/autorizacion.js";
// Servicio
import { invalidarOperacion } from "../services/cacheInvalidation.js";
import * as mantenimientosService from "../services/mantenimientosService.js";

// GET /api/mantenimientos
export const listar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await mantenimientosService.listarMantenimientos(
			req.validatedQuery as Record<string, string | undefined>,
			esEmpleado(req.user?.rol) ? req.user?.id : undefined,
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
};

// GET /api/mantenimientos/:id
export const detalle = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await mantenimientosService.getMantenimiento(
			Number(req.params.id),
			esEmpleado(req.user?.rol) ? req.user?.id : undefined,
		);
		res.json({ data });
	} catch (error) {
		next(error);
	}
};

// POST /api/mantenimientos
export const crear = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await mantenimientosService.crearMantenimiento(
			req.validated as Parameters<
				typeof mantenimientosService.crearMantenimiento
			>[0],
			req.user?.id as number,
		);
		await invalidarOperacion();
		res.status(201).json({ data, message: "Mantenimiento abierto" });
	} catch (error) {
		next(error);
	}
};

// PUT /api/mantenimientos/:id
export const actualizar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await mantenimientosService.actualizarMantenimiento(
			Number(req.params.id),
			req.validated as Parameters<
				typeof mantenimientosService.actualizarMantenimiento
			>[1],
			req.user?.id as number,
		);
		await invalidarOperacion();
		res.json({ data, message: "Mantenimiento actualizado" });
	} catch (error) {
		next(error);
	}
};

// PATCH /api/mantenimientos/:id/cerrar
export const cerrar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await mantenimientosService.cerrarMantenimiento(
			Number(req.params.id),
			req.validated as Parameters<
				typeof mantenimientosService.cerrarMantenimiento
			>[1],
			req.user?.id as number,
		);
		await invalidarOperacion();
		res.json({ data, message: "Mantenimiento cerrado" });
	} catch (error) {
		next(error);
	}
};
