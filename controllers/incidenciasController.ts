// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
// Autorización
import { esEmpleado } from "../services/autorizacion.js";
// Servicio
import * as incidenciasService from "../services/incidenciasService.js";

// GET /api/incidencias
export const listar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await incidenciasService.listarIncidencias(
			req.validatedQuery as Record<string, string | undefined>,
			esEmpleado(req.user?.rol) ? req.user?.id : undefined,
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
};

// GET /api/incidencias/:id
export const detalle = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await incidenciasService.getIncidencia(
			Number(req.params.id),
			esEmpleado(req.user?.rol) ? req.user?.id : undefined,
		);
		res.json({ data });
	} catch (error) {
		next(error);
	}
};

// POST /api/incidencias
export const crear = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await incidenciasService.crearIncidencia(
			req.validated as Parameters<typeof incidenciasService.crearIncidencia>[0],
			req.user?.id as number,
			req.user?.rol,
		);
		res.status(201).json({ data, message: "Incidencia reportada" });
	} catch (error) {
		next(error);
	}
};

// PATCH /api/incidencias/:id/estado
export const cambiarEstado = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await incidenciasService.cambiarEstadoIncidencia(
			Number(req.params.id),
			req.validated as Parameters<
				typeof incidenciasService.cambiarEstadoIncidencia
			>[1],
			req.user?.id as number,
		);
		res.json({ data, message: "Incidencia actualizada" });
	} catch (error) {
		next(error);
	}
};

// POST /api/incidencias/:id/mantenimiento
export const abrirMantenimiento = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await incidenciasService.abrirMantenimiento(
			Number(req.params.id),
			req.validated as Parameters<
				typeof incidenciasService.abrirMantenimiento
			>[1],
			req.user?.id as number,
		);
		res
			.status(201)
			.json({ data, message: "Mantenimiento abierto desde la incidencia" });
	} catch (error) {
		next(error);
	}
};
