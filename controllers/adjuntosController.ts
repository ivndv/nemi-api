// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
// Servicio
import * as adjuntosService from "../services/adjuntosService.js";

// GET /api/adjuntos
export const listar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { entidad, entidad_id } = req.validatedQuery as {
			entidad?: string;
			entidad_id?: number;
		};
		const data = await adjuntosService.listarAdjuntos(entidad, entidad_id);
		res.json({ data });
	} catch (error) {
		next(error);
	}
};

// POST /api/adjuntos
export const crear = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const file = (req as unknown as { file?: Express.Multer.File }).file;
		if (!file) {
			res.status(400).json({ error: "No se recibió ningún archivo." });
			return;
		}
		const data = await adjuntosService.crearAdjunto(
			file,
			req.validated as Parameters<typeof adjuntosService.crearAdjunto>[1],
			req.user?.id as number,
		);
		res.status(201).json({ data, message: "Adjunto agregado" });
	} catch (error) {
		next(error);
	}
};

// DELETE /api/adjuntos/:id
export const eliminar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await adjuntosService.eliminarAdjunto(
			Number(req.params.id),
			req.user?.id as number,
		);
		res.json({ data, message: "Adjunto eliminado" });
	} catch (error) {
		next(error);
	}
};
