// Express
import type { Request, Response } from "express-serve-static-core";
// Errores
import { ErrorHttp } from "../services/errors.js";
// Servicios
import {
	getDatosAuxiliares,
	getHistorialActivo,
	registrarAccion,
} from "../services/historialService.js";

// Controller: historial de un activo
export const historialActivo = async (req: Request, res: Response) => {
	const id = Number(req.params.id);
	if (Number.isNaN(id)) {
		throw new ErrorHttp(400, "ID del activo debe ser un número válido.");
	}

	const {
		page,
		limit,
		orden,
		search = "",
		accion = "",
		usuario_responsable,
	} = req.validatedQuery as {
		page: number;
		limit: number;
		orden: "asc" | "desc";
		search?: string;
		accion?: string;
		usuario_responsable?: number;
	};

	const result = await getHistorialActivo(
		id,
		page,
		limit,
		orden,
		search,
		accion,
		usuario_responsable ? String(usuario_responsable) : "",
	);
	res.json(result);
};

// Controller: filtros auxiliares del historial
export const datosAuxiliares = async (_req: Request, res: Response) => {
	const data = await getDatosAuxiliares();
	res.status(200).json({ data });
};

// Controller: registra acción en historial
export const registrarAccionHistorial = async (req: Request, res: Response) => {
	const { accion, detalles, fecha, usuario_asignado, ubicacion_nueva } =
		req.validated as {
			accion: string;
			detalles?: string;
			fecha?: string;
			usuario_asignado?: number;
			ubicacion_nueva?: number;
		};

	const historial = await registrarAccion(
		Number(req.params.id),
		accion,
		detalles,
		fecha,
		req.user?.id,
		usuario_asignado,
		ubicacion_nueva,
	);

	res.status(201).json({
		data: { historial },
		message: "Acción registrada correctamente en el historial.",
	});
};
