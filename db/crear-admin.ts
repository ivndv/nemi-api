import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import db, { pool } from "../config/db.js";
import hashService from "../services/hashService.js";
import { departamentos, personas, roles } from "./schema.js";

// Crea el primer administrador en una base nueva.
// Uso:
//   ADMIN_EMAIL=admin@empresa.com ADMIN_PASSWORD=Secreta123 bun db/crear-admin.ts
//   bun db/crear-admin.ts --email admin@empresa.com --password Secreta123

function argumento(nombre: string): string | undefined {
	const indice = process.argv.indexOf(`--${nombre}`);
	return indice >= 0 ? process.argv[indice + 1] : undefined;
}

async function main() {
	const email = argumento("email") ?? process.env.ADMIN_EMAIL;
	const contrasena = argumento("password") ?? process.env.ADMIN_PASSWORD;
	const nombre =
		argumento("nombre") ?? process.env.ADMIN_NOMBRE ?? "Administrador";

	if (!email || !contrasena) {
		throw new Error(
			"Faltan credenciales. Usa --email y --password o ADMIN_EMAIL / ADMIN_PASSWORD.",
		);
	}

	if (contrasena.length < 8) {
		throw new Error("La contraseña debe tener al menos 8 caracteres.");
	}

	const [rol] = await db
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.slug, "administrador"))
		.limit(1);

	if (!rol) {
		throw new Error(
			"No existe el rol administrador. Ejecuta primero las migraciones y el seed de roles.",
		);
	}

	const [existente] = await db
		.select({ id: personas.id })
		.from(personas)
		.where(and(eq(personas.email, email), isNull(personas.deleted_at)))
		.limit(1);

	if (existente) {
		console.log(`ℹ️  Ya existe una persona con el correo ${email}`);
		return;
	}

	const [departamento] = await db
		.select({ id: departamentos.id })
		.from(departamentos)
		.where(eq(departamentos.nombre, "TI"))
		.limit(1);

	const departamentoId =
		departamento?.id ??
		(await db.insert(departamentos).values({ nombre: "TI" }).$returningId())[0]
			?.id;

	const hash = await hashService.generarHash(contrasena);

	await db.insert(personas).values({
		nombre,
		email,
		contrasena: hash,
		rol_id: rol.id,
		departamento_id: departamentoId,
		fecha_ingreso: new Date().toISOString().slice(0, 10),
	});

	console.log(`✅ Administrador creado: ${email}`);
}

main()
	.catch((error: unknown) => {
		console.error(
			"❌ Error al crear el administrador:",
			(error as Error).message,
		);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
