// Express
import type { Request, Response } from "express-serve-static-core";
// Servicios
import {
	createGarantia,
	deleteGarantia,
	getGarantias,
	updateGarantia,
} from "../services/garantiasService.js";

// Controller: lista paginada de garantías
export const listarGarantias = async (req: Request, res: Response) => {
	const { page, limit } = req.validatedQuery as { page: number; limit: number };
	const result = await getGarantias(page, limit);
	res.json(result);
};

// Controller: registra nueva garantía
export const crearGarantia = async (req: Request, res: Response) => {
	const result = await createGarantia(
		req.validated as Parameters<typeof createGarantia>[0],
		req.user?.id,
	);
	res
		.status(201)
		.json({ data: result, message: "Garantía registrada correctamente" });
};

// Controller: actualiza garantía existente
export const actualizarGarantia = async (req: Request, res: Response) => {
	const result = await updateGarantia(
		req.params.id as string,
		req.validated as Parameters<typeof updateGarantia>[1],
		req.user?.id,
	);
	res.json({ data: result, message: "Garantía actualizada correctamente" });
};

// Controller: elimina garantía (baja lógica)
export const eliminarGarantia = async (req: Request, res: Response) => {
	await deleteGarantia(req.params.id as string, req.user?.id);
	res.json({ data: null, message: "Garantía eliminada correctamente" });
};
