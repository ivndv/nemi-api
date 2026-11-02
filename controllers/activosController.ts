// Express
import type { Request, Response } from "express-serve-static-core";
import * as activosService from "../services/activosService.js";
// Servicios
import { invalidarOperacion } from "../services/cacheInvalidation.js";
import { cacheWrap } from "../services/cacheService.js";
// Errores
import { ErrorHttp } from "../services/errors.js";

// Controller: lista paginada de activos con filtros
export const getActivos = async (req: Request, res: Response) => {
	const esEmpleado = req.user?.rol === "empleado";
	const result = await activosService.getActivos(
		req.validatedQuery as Record<string, string | undefined>,
		esEmpleado ? req.user?.id : undefined,
	);
	res.json(result);
};

// Controller: activo individual por ID
export const getActivoById = async (req: Request, res: Response) => {
	const esEmpleado = req.user?.rol === "empleado";
	const result = await activosService.getActivoById(
		req.params.id as string,
		esEmpleado ? req.user?.id : undefined,
	);
	res.json({ data: result });
};

// Controller: crea activo con imagen opcional
export const createActivo = async (req: Request, res: Response) => {
	const file = (req as unknown as { file?: Express.Multer.File }).file;
	const result = await activosService.createActivo(
		req.validated as Parameters<typeof activosService.createActivo>[0],
		file,
		req.user?.id,
	);
	await invalidarOperacion();
	res.status(201).json({ data: result, message: "Activo creado exitosamente" });
};

// Controller: actualiza activo existente
export const updateActivo = async (req: Request, res: Response) => {
	const file = (req as unknown as { file?: Express.Multer.File }).file;
	const cambios = await activosService.updateActivo(
		req.params.id as string,
		req.validated as Parameters<typeof activosService.updateActivo>[1],
		file,
		req.user?.id,
	);
	await invalidarOperacion();
	res.json({ message: "Activo actualizado exitosamente", data: { cambios } });
};

// Controller: elimina (baja lógica) un activo
export const deleteActivo = async (req: Request, res: Response) => {
	await activosService.deleteActivo(req.params.id as string, req.user?.id);
	await invalidarOperacion();
	res.json({ message: "Activo eliminado correctamente" });
};

// Controller: da de baja lógica un activo
export const darDeBajaActivo = async (req: Request, res: Response) => {
	await activosService.darDeBajaActivo(req.params.id as string, req.user?.id);
	await invalidarOperacion();
	res.json({ message: "Activo dado de baja exitosamente" });
};

// Controller: catálogos auxiliares
export const obtenerDatosAuxiliares = async (_req: Request, res: Response) => {
	const data = await cacheWrap(
		"nemi:catalogos:activos",
		10 * 60,
		activosService.obtenerDatosAuxiliares,
	);
	res.setHeader("Cache-Control", "private, max-age=60");
	res.json({ data });
};

// Controller: valida disponibilidad de etiqueta serial
export const validarEtiquetaSerial = async (req: Request, res: Response) => {
	const { etiqueta_serial } = req.validated as { etiqueta_serial: string };
	const disponible =
		await activosService.validarEtiquetaSerial(etiqueta_serial);

	if (!disponible) {
		throw new ErrorHttp(400, "La etiqueta serial ya está registrada");
	}

	res.json({ message: "La etiqueta serial está disponible" });
};

// Controller: sube imagen a R2
export const subirImagen = async (req: Request, res: Response) => {
	const file = (req as unknown as { file?: Express.Multer.File }).file;
	if (!file) {
		throw new ErrorHttp(400, "No se recibió ninguna imagen.");
	}
	const result = await activosService.subirImagen(file.buffer, file.mimetype);
	res.json({ url: result.url });
};
