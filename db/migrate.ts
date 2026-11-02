import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
import db, { pool } from "../config/db.js";

// Aplica las migraciones pendientes de ./drizzle
async function main() {
	await migrate(db, { migrationsFolder: "./drizzle" });
	console.log("✅ Migraciones aplicadas");
}

main()
	.catch((error: unknown) => {
		console.error("❌ Error al migrar:", (error as Error).message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
