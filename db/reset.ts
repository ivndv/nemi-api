import "dotenv/config";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db.js";

// Elimina todas las tablas de la base actual (no borra la base)
async function main() {
	const [tablas] = await pool.query<RowDataPacket[]>(
		`SELECT table_name AS nombre
		 FROM information_schema.tables
		 WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`,
	);

	await pool.query("SET FOREIGN_KEY_CHECKS = 0");
	for (const tabla of tablas) {
		const nombre = String(tabla.nombre);
		await pool.query(`DROP TABLE IF EXISTS \`${nombre}\``);
		console.log(`🗑️  ${nombre}`);
	}
	await pool.query("SET FOREIGN_KEY_CHECKS = 1");

	console.log("✅ Base limpia. Ejecuta db:migrate y db:seed.");
}

main()
	.catch((error: unknown) => {
		console.error("❌ Error al reiniciar:", (error as Error).message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
