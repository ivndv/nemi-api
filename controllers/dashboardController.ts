// Express
import type { Request, Response } from "express-serve-static-core";
// Servicios
import { cacheWrap } from "../services/cacheService.js";
import { getAlertas, getResumen } from "../services/dashboardService.js";

// Controller: dashboard con estadísticas
export const resumen = async (_req: Request, res: Response) => {
	const data = await cacheWrap("nemi:dashboard:resumen", 60, getResumen);
	res.setHeader("Cache-Control", "private, max-age=30");
	res.status(200).json({ data });
};

// Controller: alertas del sistema
export const alertas = async (_req: Request, res: Response) => {
	const data = await cacheWrap("nemi:dashboard:alertas", 60, getAlertas);
	res.setHeader("Cache-Control", "private, max-age=30");
	res.status(200).json({ data });
};
