import { and, asc, count, eq, isNull, like, ne, or, sql } from "drizzle-orm";
import db from "../config/db.js";
import { departamentos, personas, roles, sedes } from "../db/schema.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import hashService from "./hashService.js";
import { codigoRol, etiquetaRol } from "./presentacion.js";

// Tipo de transacción de Drizzle
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Resuelve un rol por su etiqueta o slug
async function resolverRol(valor: string, tx: Tx) {
	const slug = codigoRol(valor);
	if (!slug) throw new ErrorHttp(400, "Rol no válido");

	const [rol] = await tx
		.select({ id: roles.id, slug: roles.slug })
		.from(roles)
		.where(eq(roles.slug, slug))
		.limit(1);

	if (!rol) throw new ErrorHttp(400, "Rol no válido");
	return rol;
}

// Busca o crea un departamento por nombre
async function resolverDepartamento(nombre: string, tx: Tx) {
	const [existente] = await tx
		.select({ id: departamentos.id })
		.from(departamentos)
		.where(eq(departamentos.nombre, nombre))
		.limit(1);

	if (existente) return existente.id;

	const [creado] = await tx
		.insert(departamentos)
		.values({ nombre })
		.$returningId();

	return creado.id;
}

// Lista personas activas con sus catálogos
export async function listarPersonas(query: {
	page?: number;
	limit?: number;
	search?: string;
	rol_id?: number;
	sede_id?: number;
	departamento_id?: number;
}) {
	const page = Number(query.page) || 1;
	const limit = Math.min(Number(query.limit) || 20, 100);
	const offset = (page - 1) * limit;

	const filtros = [isNull(personas.deleted_at)];

	if (query.search) {
		const condicion = or(
			like(personas.nombre, `%${query.search}%`),
			like(personas.email, `%${query.search}%`),
		);
		if (condicion) filtros.push(condicion);
	}
	if (query.rol_id) filtros.push(eq(personas.rol_id, Number(query.rol_id)));
	if (query.sede_id) filtros.push(eq(personas.sede_id, Number(query.sede_id)));
	if (query.departamento_id) {
		filtros.push(eq(personas.departamento_id, Number(query.departamento_id)));
	}

	const where = and(...filtros);

	const filas = await db
		.select({
			id: personas.id,
			nombre: personas.nombre,
			email: personas.email,
			rol_id: personas.rol_id,
			rol_slug: roles.slug,
			rol: roles.nombre,
			departamento_id: personas.departamento_id,
			departamento: departamentos.nombre,
			sede_id: personas.sede_id,
			sede: sedes.nombre,
			fecha_ingreso: personas.fecha_ingreso,
			ultimo_acceso: personas.ultimo_acceso,
			created_at: personas.created_at,
			intentos_fallidos: personas.intentos_fallidos,
			bloqueado_hasta: personas.bloqueado_hasta,
		})
		.from(personas)
		.leftJoin(roles, eq(personas.rol_id, roles.id))
		.leftJoin(departamentos, eq(personas.departamento_id, departamentos.id))
		.leftJoin(sedes, eq(personas.sede_id, sedes.id))
		.where(where)
		.orderBy(asc(personas.nombre))
		.limit(limit)
		.offset(offset);

	const [totalResult] = await db
		.select({ total: count() })
		.from(personas)
		.where(where);

	return {
		data: filas,
		pagination: {
			page,
			limit,
			total: Number(totalResult.total),
			totalPages: Math.ceil(Number(totalResult.total) / limit),
		},
	};
}

export async function getPersona(id: number) {
	const [fila] = await db
		.select({
			id: personas.id,
			nombre: personas.nombre,
			email: personas.email,
			rol_id: personas.rol_id,
			rol_slug: roles.slug,
			rol: roles.nombre,
			departamento_id: personas.departamento_id,
			departamento: departamentos.nombre,
			sede_id: personas.sede_id,
			sede: sedes.nombre,
			fecha_ingreso: personas.fecha_ingreso,
			ultimo_acceso: personas.ultimo_acceso,
			created_at: personas.created_at,
			intentos_fallidos: personas.intentos_fallidos,
			bloqueado_hasta: personas.bloqueado_hasta,
		})
		.from(personas)
		.leftJoin(roles, eq(personas.rol_id, roles.id))
		.leftJoin(departamentos, eq(personas.departamento_id, departamentos.id))
		.leftJoin(sedes, eq(personas.sede_id, sedes.id))
		.where(and(eq(personas.id, id), isNull(personas.deleted_at)))
		.limit(1);

	if (!fila) throw new ErrorHttp(404, "Persona no encontrada");
	return fila;
}

export async function crearPersona(
	input: {
		nombre: string;
		email: string;
		contrasena: string;
		rol: string;
		departamento: string;
		sede_id?: number;
		fecha_ingreso: string;
	},
	actorId: number,
) {
	const [existente] = await db
		.select({ id: personas.id })
		.from(personas)
		.where(and(eq(personas.email, input.email), isNull(personas.deleted_at)))
		.limit(1);

	if (existente) {
		throw new ErrorHttp(409, "El correo electrónico ya está registrado");
	}

	const hashedPassword = await hashService.generarHash(input.contrasena);

	return await db.transaction(async (tx) => {
		const rol = await resolverRol(input.rol, tx);
		const departamentoId = await resolverDepartamento(input.departamento, tx);

		const [creada] = await tx
			.insert(personas)
			.values({
				nombre: input.nombre,
				email: input.email,
				contrasena: hashedPassword,
				rol_id: rol.id,
				departamento_id: departamentoId,
				sede_id: input.sede_id ?? null,
				fecha_ingreso: input.fecha_ingreso,
			})
			.$returningId();

		await registrarEvento(tx, {
			entidad: "persona",
			entidad_id: creada.id,
			accion: "persona.creada",
			actor_id: actorId,
			nuevos: {
				nombre: input.nombre,
				email: input.email,
				rol: rol.slug,
			},
		});

		return {
			id: creada.id,
			nombre: input.nombre,
			email: input.email,
			rol: etiquetaRol(rol.slug),
			rol_slug: rol.slug,
		};
	});
}

export async function actualizarPersona(
	id: number,
	input: {
		nombre?: string;
		email?: string;
		rol?: string;
		departamento?: string;
		sede_id?: number | null;
		fecha_ingreso?: string;
	},
	actorId: number,
) {
	const [existente] = await db
		.select({
			id: personas.id,
			rol_id: personas.rol_id,
			token_version: personas.token_version,
		})
		.from(personas)
		.where(and(eq(personas.id, id), isNull(personas.deleted_at)))
		.limit(1);

	if (!existente) throw new ErrorHttp(404, "Persona no encontrada");

	if (input.email) {
		const [duplicado] = await db
			.select({ id: personas.id })
			.from(personas)
			.where(
				and(
					eq(personas.email, input.email),
					ne(personas.id, id),
					isNull(personas.deleted_at),
				),
			)
			.limit(1);

		if (duplicado) {
			throw new ErrorHttp(409, "El correo electrónico ya está registrado");
		}
	}

	return await db.transaction(async (tx) => {
		const valores: Partial<typeof personas.$inferInsert> = {};
		let cambiaRol = false;

		if (input.nombre) valores.nombre = input.nombre;
		if (input.email) valores.email = input.email;
		if (input.fecha_ingreso) valores.fecha_ingreso = input.fecha_ingreso;
		if (input.sede_id !== undefined) valores.sede_id = input.sede_id;

		if (input.rol) {
			const rol = await resolverRol(input.rol, tx);
			valores.rol_id = rol.id;
			cambiaRol = rol.id !== existente.rol_id;
		}

		// Un cambio de rol invalida las sesiones anteriores del usuario
		if (cambiaRol) {
			valores.token_version = existente.token_version + 1;
		}

		if (input.departamento) {
			valores.departamento_id = await resolverDepartamento(
				input.departamento,
				tx,
			);
		}

		if (Object.keys(valores).length === 0) {
			throw new ErrorHttp(400, "No se proporcionaron campos para actualizar");
		}

		await tx.update(personas).set(valores).where(eq(personas.id, id));

		await registrarEvento(tx, {
			entidad: "persona",
			entidad_id: id,
			accion: "persona.actualizada",
			actor_id: actorId,
			nuevos: valores as Record<string, unknown>,
		});

		return { id, ...valores };
	});
}

export async function darDeBajaPersona(id: number, actorId: number) {
	if (id === actorId) {
		throw new ErrorHttp(400, "No puedes darte de baja a ti mismo");
	}

	const [existente] = await db
		.select({ id: personas.id, rol_id: personas.rol_id })
		.from(personas)
		.where(and(eq(personas.id, id), isNull(personas.deleted_at)))
		.limit(1);

	if (!existente) throw new ErrorHttp(404, "Persona no encontrada");

	const [rol] = await db
		.select({ slug: roles.slug })
		.from(roles)
		.where(eq(roles.id, existente.rol_id))
		.limit(1);

	if (rol?.slug === "administrador") {
		const [admins] = await db
			.select({ total: count() })
			.from(personas)
			.where(
				and(eq(personas.rol_id, existente.rol_id), isNull(personas.deleted_at)),
			);

		if (Number(admins.total) <= 1) {
			throw new ErrorHttp(400, "No puedes dar de baja al último administrador");
		}
	}

	await db.transaction(async (tx) => {
		await tx
			.update(personas)
			.set({ deleted_at: new Date() })
			.where(eq(personas.id, id));

		await registrarEvento(tx, {
			entidad: "persona",
			entidad_id: id,
			accion: "persona.baja",
			actor_id: actorId,
		});
	});
}

export async function cambiarPasswordPersona(
	id: number,
	contrasena: string,
	actorId: number,
) {
	const [existente] = await db
		.select({ id: personas.id })
		.from(personas)
		.where(and(eq(personas.id, id), isNull(personas.deleted_at)))
		.limit(1);

	if (!existente) throw new ErrorHttp(404, "Persona no encontrada");

	const hash = await hashService.generarHash(contrasena);

	await db.transaction(async (tx) => {
		await tx
			.update(personas)
			.set({
				contrasena: hash,
				token_version: sql`${personas.token_version} + 1`,
			})
			.where(eq(personas.id, id));

		await registrarEvento(tx, {
			entidad: "persona",
			entidad_id: id,
			accion: "persona.actualizada",
			actor_id: actorId,
			nuevos: { campo: "contrasena" },
		});
	});
}

// Desbloquea una cuenta bloqueada por intentos fallidos
export async function desbloquearPersona(id: number, actorId: number) {
	const [existente] = await db
		.select({ id: personas.id })
		.from(personas)
		.where(and(eq(personas.id, id), isNull(personas.deleted_at)))
		.limit(1);

	if (!existente) throw new ErrorHttp(404, "Persona no encontrada");

	await db.transaction(async (tx) => {
		await tx
			.update(personas)
			.set({ intentos_fallidos: 0, bloqueado_hasta: null })
			.where(eq(personas.id, id));

		await registrarEvento(tx, {
			entidad: "persona",
			entidad_id: id,
			accion: "persona.desbloqueada",
			actor_id: actorId,
		});
	});
}

// Catálogos para el formulario de usuarios
export async function obtenerCatalogos() {
	const rolesList = await db
		.select({
			id: roles.id,
			slug: roles.slug,
			nombre: roles.nombre,
		})
		.from(roles)
		.orderBy(asc(roles.id));

	const departamentosList = await db
		.select({ id: departamentos.id, nombre: departamentos.nombre })
		.from(departamentos)
		.where(isNull(departamentos.deleted_at))
		.orderBy(asc(departamentos.nombre));

	const sedesList = await db
		.select({ id: sedes.id, nombre: sedes.nombre })
		.from(sedes)
		.where(isNull(sedes.deleted_at))
		.orderBy(asc(sedes.nombre));

	return {
		roles: rolesList,
		departamentos: departamentosList,
		sedes: sedesList,
	};
}
