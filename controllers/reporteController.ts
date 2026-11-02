// Express
import type { Request, Response } from "express-serve-static-core";
// Servicios
import { cacheGet, cacheWrap } from "../services/cacheService.js";
import {
	generarReporte,
	getDatosAuxiliares,
	getTiposReporte,
} from "../services/reporteService.js";

// Controller: tipos de reporte disponibles
export const tiposReporte = async (req: Request, res: Response) => {
	const tipos = await getTiposReporte(req.user?.rol ?? "empleado");
	res.status(200).json({ data: { tiposReporte: tipos } });
};

// Controller: datos auxiliares para reportes
export const datosAuxiliares = async (_req: Request, res: Response) => {
	const data = await getDatosAuxiliares();
	res.json({ data });
};

// Controller: genera reporte según tipo y filtros
export const generar = async (req: Request, res: Response) => {
	const { tipo_id, filtros = {} } = req.validated as {
		tipo_id: number;
		filtros?: Record<string, unknown>;
	};
	const version = (await cacheGet<number>("nemi:reportes:version")) ?? 0;
	const cacheKey = `nemi:reportes:v${version}:${req.user?.rol ?? "empleado"}:${req.user?.id ?? 0}:${tipo_id}:${JSON.stringify(filtros)}`;
	const result = await cacheWrap(cacheKey, 5 * 60, () =>
		generarReporte(tipo_id, filtros, {
			id: req.user?.id as number,
			rol: req.user?.rol ?? "empleado",
		}),
	);
	res.json({ message: "Reporte generado exitosamente.", data: result });
};
