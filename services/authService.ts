import { and, eq, isNull, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import env from "../config/env.js";
import { departamentos, personas, roles } from "../db/schema.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import hashService from "./hashService.js";
import { codigoRol, etiquetaRol } from "./presentacion.js";

// Interfaces de autenticación

interface AuthUser {
	id: number;
	nombre: string;
	email: string;
	rol: string;
	rol_slug: string;
	foto_url: string | null;
	departamento: string | null;
}

interface RegistroInput {
	nombre: string;
	email: string;
	contrasena: string;
	departamento: string;
	fecha_ingreso: string;
	rol: string;
}

interface LoginInput {
	email: string;
	contrasena: string;
}

interface LoginResult {
	token: string;
	userData: AuthUser;
}

// Registro de una persona nueva en el sistema
export async function registrarUsuario(input: RegistroInput): Promise<void> {
	const [existente] = await db
		.select({ id: personas.id })
		.from(personas)
		.where(and(eq(personas.email, input.email), isNull(personas.deleted_at)))
		.limit(1);

	if (existente) {
		throw new ErrorHttp(409, "El correo electrónico ya está registrado");
	}

	const hashedPassword = await hashService.generarHash(input.contrasena);
	const rol = codigoRol(input.rol) ?? "empleado";

	await db.transaction(async (tx) => {
		// Reutiliza el departamento si ya existe
		const [departamentoExistente] = await tx
			.select({ id: departamentos.id })
			.from(departamentos)
			.where(eq(departamentos.nombre, input.departamento))
			.limit(1);

		const departamentoId =
			departamentoExistente?.id ??
			(
				await tx
					.insert(departamentos)
					.values({ nombre: input.departamento })
					.$returningId()
			)[0]?.id;

		const [rolRow] = await tx
			.select({ id: roles.id })
			.from(roles)
			.where(eq(roles.slug, rol))
			.limit(1);

		if (!rolRow) {
			throw new ErrorHttp(400, "Rol no válido");
		}

		const [creada] = await tx
			.insert(personas)
			.values({
				nombre: input.nombre,
				email: input.email,
				contrasena: hashedPassword,
				departamento_id: departamentoId,
				fecha_ingreso: input.fecha_ingreso,
				rol_id: rolRow.id,
			})
			.$returningId();

		await registrarEvento(tx, {
			entidad: "persona",
			entidad_id: creada.id,
			accion: "persona.creada",
			actor_id: creada.id,
			nuevos: { nombre: input.nombre, email: input.email, rol },
		});
	});
}

// Inicio de sesión — valida credenciales, bloqueo y emite un JWT
const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

export async function iniciarSesion(input: LoginInput): Promise<LoginResult> {
	const [persona] = await db
		.select({
			id: personas.id,
			nombre: personas.nombre,
			email: personas.email,
			contrasena: personas.contrasena,
			rol: roles.slug,
			rol_nombre: roles.nombre,
			foto_url: personas.foto_url,
			departamento: departamentos.nombre,
			token_version: personas.token_version,
			intentos_fallidos: personas.intentos_fallidos,
			bloqueado_hasta: personas.bloqueado_hasta,
		})
		.from(personas)
		.leftJoin(roles, eq(personas.rol_id, roles.id))
		.leftJoin(departamentos, eq(personas.departamento_id, departamentos.id))
		.where(and(eq(personas.email, input.email), isNull(personas.deleted_at)))
		.limit(1);

	// No revelar si el correo existe
	if (!persona) {
		throw new ErrorHttp(
			401,
			"Correo o contraseña incorrectos.",
			"CREDENCIALES_INVALIDAS",
		);
	}

	const ahora = new Date();

	if (persona.bloqueado_hasta && persona.bloqueado_hasta > ahora) {
		const minutos = Math.max(
			1,
			Math.ceil((persona.bloqueado_hasta.getTime() - ahora.getTime()) / 60_000),
		);

		throw new ErrorHttp(
			423,
			`Cuenta bloqueada. Intenta de nuevo en ${minutos} minuto(s).`,
			"CUENTA_BLOQUEADA",
		);
	}

	const coincide = await hashService.verificarHash(
		input.contrasena,
		persona.contrasena,
	);

	if (!coincide) {
		const intentos = persona.intentos_fallidos + 1;
		const bloquear = intentos >= MAX_INTENTOS;

		await db
			.update(personas)
			.set({
				intentos_fallidos: bloquear ? 0 : intentos,
				bloqueado_hasta: bloquear
					? new Date(Date.now() + BLOQUEO_MINUTOS * 60_000)
					: null,
			})
			.where(eq(personas.id, persona.id));

		if (bloquear) {
			throw new ErrorHttp(
				423,
				`Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos por demasiados intentos.`,
				"CUENTA_BLOQUEADA",
			);
		}

		throw new ErrorHttp(
			401,
			"Correo o contraseña incorrectos.",
			"CREDENCIALES_INVALIDAS",
		);
	}

	const token = jwt.sign(
		{
			id: persona.id,
			nombre: persona.nombre,
			email: persona.email,
			rol: persona.rol,
			tv: persona.token_version,
		},
		env.JWT_SECRET,
		{ expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
	);

	await db
		.update(personas)
		.set({
			ultimo_acceso: new Date(),
			intentos_fallidos: 0,
			bloqueado_hasta: null,
		})
		.where(eq(personas.id, persona.id));

	return {
		token,
		userData: {
			id: persona.id,
			nombre: persona.nombre,
			email: persona.email,
			rol: persona.rol_nombre ?? etiquetaRol(persona.rol),
			rol_slug: persona.rol ?? "",
			foto_url: persona.foto_url ?? null,
			departamento: persona.departamento ?? null,
		},
	};
}

// Invalida todas las sesiones activas del usuario
export async function cerrarSesionEnTodos(userId: number): Promise<void> {
	await db
		.update(personas)
		.set({ token_version: sql`${personas.token_version} + 1` })
		.where(eq(personas.id, userId));
}
