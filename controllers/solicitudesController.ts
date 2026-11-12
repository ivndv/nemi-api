// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
// Autorización
import { esEmpleado } from "../services/autorizacion.js";
// Servicio
import * as solicitudesService from "../services/solicitudesService.js";

// GET /api/solicitudes
export const listar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await solicitudesService.listarSolicitudes(
			req.validatedQuery as Record<string, string | undefined>,
			esEmpleado(req.user?.rol) ? req.user?.id : undefined,
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
};

// GET /api/solicitudes/:id
export const detalle = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await solicitudesService.getSolicitud(
			Number(req.params.id),
			esEmpleado(req.user?.rol) ? req.user?.id : undefined,
		);
		res.json({ data });
	} catch (error) {
		next(error);
	}
};

// POST /api/solicitudes
export const crear = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await solicitudesService.crearSolicitud(
			req.validated as Parameters<typeof solicitudesService.crearSolicitud>[0],
			req.user?.id as number,
		);
		res.status(201).json({ data, message: "Solicitud creada" });
	} catch (error) {
		next(error);
	}
};

// PATCH /api/solicitudes/:id/aprobar
export const aprobar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { comentario } = (req.validated ?? {}) as { comentario?: string };
		const data = await solicitudesService.aprobarSolicitud(
			Number(req.params.id),
			req.user?.id as number,
			comentario,
		);
		res.json({ data, message: "Solicitud aprobada" });
	} catch (error) {
		next(error);
	}
};

// PATCH /api/solicitudes/:id/rechazar
export const rechazar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { comentario } = (req.validated ?? {}) as { comentario?: string };
		const data = await solicitudesService.rechazarSolicitud(
			Number(req.params.id),
			req.user?.id as number,
			comentario,
		);
		res.json({ data, message: "Solicitud rechazada" });
	} catch (error) {
		next(error);
	}
};

// PATCH /api/solicitudes/:id/entregar
export const entregar = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await solicitudesService.entregarSolicitud(
			Number(req.params.id),
			req.validated as Parameters<
				typeof solicitudesService.entregarSolicitud
			>[1],
			req.user?.id as number,
		);
		res.json({ data, message: "Solicitud entregada" });
	} catch (error) {
		next(error);
	}
};
