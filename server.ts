// Dotenv
import "dotenv/config";
// App
import app from "./app.js";
// BD
import { pool } from "./config/db.js";
// Config
import env from "./config/env.js";
import { cerrarRedis } from "./services/redis.js";
import { cargarZonaHoraria } from "./services/zonaHoraria.js";

const PORT = env.SERVER_PORT;

// 0. Carga la zona horaria de negocio para cálculos de "hoy"
try {
	await cargarZonaHoraria();
} catch (error) {
	console.warn(
		"[SERVER] No se pudo cargar la zona horaria, se usará UTC.",
		error instanceof Error ? error.message : error,
	);
}

// 1. Inicia el servidor en el puerto configurado
const server = app.listen(PORT, "0.0.0.0", () => {
	console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
	console.log(
		`📚 Documentación API disponible en http://localhost:${PORT}/api/docs`,
	);
	console.log(
		`🏥 Health check disponible en http://localhost:${PORT}/api/health`,
	);
});

// 2. Cierra conexiones de forma graceful al recibir señal de terminación
const apagadoGraceful = async (signal: string) => {
	console.log(`[SERVER] ${signal} recibido, cerrando conexiones...`);
	server.close(() => {
		Promise.all([pool.end(), cerrarRedis()]).then(() => {
			console.log("[SERVER] Conexiones cerradas, adiós.");
			process.exit(0);
		});
	});
	setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => apagadoGraceful("SIGTERM"));
process.on("SIGINT", () => apagadoGraceful("SIGINT"));
