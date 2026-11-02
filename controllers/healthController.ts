// Express
import type { Request, Response } from "express-serve-static-core";
// Base de datos
import { pool } from "../config/db.js";

// Controller: health check con verificación real de la base
export const health = async (_req: Request, res: Response) => {
	const inicio = performance.now();

	try {
		await pool.query("SELECT 1");

		res.status(200).json({
			data: {
				status: "ok",
				db: "ok",
				latency_ms: Math.round(performance.now() - inicio),
				uptime: process.uptime(),
				timestamp: new Date().toISOString(),
			},
			message: "Nemi API is running correctly!",
		});
	} catch {
		res.status(503).json({
			data: {
				status: "degraded",
				db: "error",
				latency_ms: Math.round(performance.now() - inicio),
				uptime: process.uptime(),
				timestamp: new Date().toISOString(),
			},
			message: "La base de datos no está disponible",
		});
	}
};
