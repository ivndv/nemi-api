import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
	schema: "./db/schema.ts",
	out: "./drizzle",
	dialect: "mysql",
	strict: true,
	verbose: true,
	dbCredentials: {
		host: process.env.DB_HOST || "localhost",
		port: Number(process.env.DB_PORT) || 3306,
		user: process.env.DB_USER || "root",
		password: process.env.DB_PASSWORD || "",
		database: process.env.DB_NAME || "nemi-db",
	},
} satisfies Config;
