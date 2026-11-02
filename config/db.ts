import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../db/schema.js";
import env from "./env.js";

// Pool de conexiones MySQL
const pool = mysql.createPool({
	host: env.DB_HOST,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
	port: env.DB_PORT,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	timezone: "Z",
	supportBigNumbers: true,
});

// Fuerza la sesión MySQL en UTC para que TIMESTAMP sea siempre un instante
pool.on("connection", (connection) => {
	connection.query("SET time_zone = '+00:00'");
});

// Instancia de Drizzle con el schema completo
const db = drizzle(pool, { schema, mode: "default" });

export { pool };
export default db;
