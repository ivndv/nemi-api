// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
// Autorización
import { puedeVerCostos } from "../services/autorizacion.js";
// Servicio
import { invalidarOperacion } from "../services/cacheInvalidation.js";
import * as licenciasService from "../services/licenciasService.js";

// GET /api/licencias — lista con ocupación de asientos
export const listar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await licenciasService.listarLicencias(
			req.validatedQuery as Record<string, string | undefined>,
			puedeVerCostos(req.user?.rol),
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
};

// GET /api/licencias/:id — detalle con asientos y renovaciones
export const detalle = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await licenciasService.getLicencia(
			Number(req.params.id),
			puedeVerCostos(req.user?.rol),
		);
		res.json({ data });
	} catch (error) {
		next(error);
	}
};

// GET /api/licencias/:id/asientos
export const asientos = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await licenciasService.listarAsientos(Number(req.params.id));
		res.json({ data });
	} catch (error) {
		next(error);
	}
};

// POST /api/licencias/:id/asientos
export const asignarAsiento = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await licenciasService.asignarAsiento(
			Number(req.params.id),
			req.validated as Parameters<typeof licenciasService.asignarAsiento>[1],
			req.user?.id as number,
		);
		await invalidarOperacion();
		res.status(201).json({ data, message: "Asiento asignado correctamente" });
	} catch (error) {
		next(error);
	}
};

// PATCH /api/licencias/:id/asientos/:asiento/liberar
export const liberarAsiento = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await licenciasService.liberarAsiento(
			Number(req.params.id),
			Number(req.params.asiento),
			req.user?.id as number,
		);
		await invalidarOperacion();
		res.json({ data, message: "Asiento liberado correctamente" });
	} catch (error) {
		next(error);
	}
};

// GET /api/licencias/:id/renovaciones
export const renovaciones = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await licenciasService.listarRenovaciones(
			Number(req.params.id),
			puedeVerCostos(req.user?.rol),
		);
		res.json({ data });
	} catch (error) {
		next(error);
	}
};

// POST /api/licencias/:id/renovaciones
export const crearRenovacion = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await licenciasService.crearRenovacion(
			Number(req.params.id),
			req.validated as Parameters<typeof licenciasService.crearRenovacion>[1],
			req.user?.id as number,
		);
		await invalidarOperacion();
		res.status(201).json({ data, message: "Renovación registrada" });
	} catch (error) {
		next(error);
	}
};
