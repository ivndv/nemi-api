import { z } from "zod";

// Esquema de validación de variables de entorno con Zod
const envSchema = z.object({
	// Servidor
	SERVER_PORT: z.coerce.number().default(3030),
	FRONTEND_URL: z
		.string()
		.url({ error: "FRONTEND_URL debe ser una URL válida" })
		.default("http://localhost:4200"),

	// Base de datos
	DB_HOST: z.string().min(1, { error: "DB_HOST es requerido" }),
	DB_PORT: z.coerce.number().default(3306),
	DB_USER: z.string().min(1, { error: "DB_USER es requerido" }),
	DB_PASSWORD: z.string().min(1, { error: "DB_PASSWORD es requerido" }),
	DB_NAME: z.string().min(1, { error: "DB_NAME es requerido" }),

	// JWT
	JWT_SECRET: z.string().min(32, {
		error: "JWT_SECRET debe tener al menos 32 caracteres",
	}),
	JWT_EXPIRES_IN: z.string().default("1h"),

	// Hash service
	HASH_SERVICE_URL: z
		.string()
		.url({ error: "HASH_SERVICE_URL debe ser una URL válida" })
		.default("http://localhost:3010"),
	HASH_SERVICE_KEY: z
		.string()
		.min(1, { error: "HASH_SERVICE_KEY es requerido" }),

	// R2 (Cloudflare)
	R2_ACCOUNT_ID: z.string().min(1, { error: "R2_ACCOUNT_ID es requerido" }),
	R2_ACCESS_KEY_ID: z
		.string()
		.min(1, { error: "R2_ACCESS_KEY_ID es requerido" }),
	R2_SECRET_ACCESS_KEY: z
		.string()
		.min(1, { error: "R2_SECRET_ACCESS_KEY es requerido" }),
	R2_BUCKET_NAME: z.string().min(1, { error: "R2_BUCKET_NAME es requerido" }),
	R2_PUBLIC_URL: z
		.string()
		.url({ error: "R2_PUBLIC_URL debe ser una URL válida" })
		.default("https://assets.mgdc.site/nemi"),
});

// Valida las variables de entorno contra el esquema
const parsed = envSchema.safeParse(process.env);

// Error de validación — muestra detalles y termina el proceso
if (!parsed.success) {
	console.error("❌ Error en variables de entorno:");
	for (const issue of parsed.error.issues) {
		console.error(`   ${issue.path.join(".")}: ${issue.message}`);
	}
	process.exit(1);
}

// Exporta las variables validadas y tipadas
export default parsed.data;
