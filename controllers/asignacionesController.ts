// Express
import type { Request, Response } from "express-serve-static-core";
import * as asignacionesService from "../services/asignacionesService.js";
// Servicios
import { invalidarOperacion } from "../services/cacheInvalidation.js";
// Errores
import { ErrorHttp } from "../services/errors.js";

// Controller: lista paginada de asignaciones
export const getAsignaciones = async (req: Request, res: Response) => {
	const esEmpleado = req.user?.rol === "empleado";
	const result = await asignacionesService.getAsignaciones(
		req.validatedQuery as Record<string, string | undefined>,
		esEmpleado ? req.user?.id : undefined,
	);
	res.json(result);
};

// Controller: asignación individual por ID
export const getAsignacionPorId = async (req: Request, res: Response) => {
	const result = await asignacionesService.getAsignacionPorId(
		req.params.id as string,
	);

	if (req.user?.rol === "empleado" && result.usuario_id !== req.user.id) {
		throw new ErrorHttp(403, "No autorizado para ver esta asignación");
	}

	res.json({ data: result });
};

// Controller: crea nueva asignación
export const createAsignacion = async (req: Request, res: Response) => {
	const result = await asignacionesService.createAsignacion(
		req.validated as Parameters<typeof asignacionesService.createAsignacion>[0],
		req.user?.id,
	);
	await invalidarOperacion();
	res
		.status(201)
		.json({ data: result, message: "Asignación creada exitosamente" });
};

// Controller: actualiza asignación existente
export const updateAsignacion = async (req: Request, res: Response) => {
	await asignacionesService.updateAsignacion(
		req.params.id as string,
		req.validated as Parameters<typeof asignacionesService.updateAsignacion>[1],
		req.user?.id,
	);
	await invalidarOperacion();
	res.json({ message: "Asignación actualizada exitosamente" });
};

// Controller: registra devolución de una asignación
export const deleteAsignacion = async (req: Request, res: Response) => {
	await asignacionesService.deleteAsignacion(
		req.params.id as string,
		req.user?.id,
	);
	await invalidarOperacion();
	res.json({ message: "Asignación eliminada exitosamente" });
};

// Controller: activos disponibles para asignar
export const getActivosDisponibles = async (req: Request, res: Response) => {
	const data = await asignacionesService.getActivosDisponibles(
		req.validatedQuery as Record<string, string | undefined>,
	);
	res.json(data);
};

// Controller: datos auxiliares del formulario
export const obtenerDatosAuxiliares = async (req: Request, res: Response) => {
	const data = await asignacionesService.obtenerDatosAuxiliares(
		req.params.id as string | undefined,
	);
	res.json({ data });
};
