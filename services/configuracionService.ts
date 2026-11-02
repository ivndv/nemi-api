import { and, eq, isNull, ne, sql } from "drizzle-orm";
import db from "../config/db.js";
import { configuracion, departamentos, personas, roles } from "../db/schema.js";
import hashService from "../services/hashService.js";
import { etiquetaRol } from "../services/presentacion.js";
import * as r2Service from "../services/r2Service.js";
import { ErrorHttp } from "./errors.js";
import { setZonaActual } from "./zonaHoraria.js";

// Configuración general de la aplicación

export async function getConfiguracionAplicacion() {
	const [fila] = await db
		.select()
		.from(configuracion)
		.where(eq(configuracion.id, 1))
		.limit(1);

	if (!fila) {
		throw new ErrorHttp(404, "Configuración no encontrada");
	}

	// El frontend sigue esperando "formato_moneda"
	return { ...fila, formato_moneda: fila.moneda };
}

// Actualiza la configuración global de la aplicación
export async function updateConfiguracionAplicacion(input: {
	idioma?: string;
	zona_horaria?: string;
	formato_fecha?: string;
	formato_moneda?: string;
	dias_alerta_licencia?: number;
	dias_alerta_garantia?: number;
	dias_alerta_devolucion?: number;
	dias_alerta_mantenimiento?: number;
}) {
	const updates: {
		idioma?: string;
		zona_horaria?: string;
		formato_fecha?: string;
		moneda?: string;
		dias_alerta_licencia?: number;
		dias_alerta_garantia?: number;
		dias_alerta_devolucion?: number;
		dias_alerta_mantenimiento?: number;
	} = {};

	if (input.idioma !== undefined) updates.idioma = input.idioma;
	if (input.zona_horaria !== undefined)
		updates.zona_horaria = input.zona_horaria;
	if (input.formato_fecha !== undefined)
		updates.formato_fecha = input.formato_fecha;
	if (input.formato_moneda !== undefined) updates.moneda = input.formato_moneda;
	if (input.dias_alerta_licencia !== undefined)
		updates.dias_alerta_licencia = input.dias_alerta_licencia;
	if (input.dias_alerta_garantia !== undefined)
		updates.dias_alerta_garantia = input.dias_alerta_garantia;
	if (input.dias_alerta_devolucion !== undefined)
		updates.dias_alerta_devolucion = input.dias_alerta_devolucion;
	if (input.dias_alerta_mantenimiento !== undefined)
		updates.dias_alerta_mantenimiento = input.dias_alerta_mantenimiento;

	if (Object.keys(updates).length === 0) {
		throw new ErrorHttp(
			400,
			"Debes proporcionar al menos un ajuste para actualizar.",
		);
	}

	await db.update(configuracion).set(updates).where(eq(configuracion.id, 1));

	if (updates.zona_horaria) {
		setZonaActual(updates.zona_horaria);
	}
}

// Ajustes básicos del sistema para cualquier usuario autenticado
export async function getAjustesSistema() {
	const [fila] = await db
		.select({
			zona_horaria: configuracion.zona_horaria,
			formato_fecha: configuracion.formato_fecha,
			moneda: configuracion.moneda,
		})
		.from(configuracion)
		.where(eq(configuracion.id, 1))
		.limit(1);

	if (!fila) {
		throw new ErrorHttp(404, "Configuración no encontrada");
	}

	return fila;
}

// Perfil de usuario

export async function getPerfilUsuario(userId: number) {
	if (!userId) {
		throw new ErrorHttp(401, "ID de usuario no proporcionado.");
	}

	const [persona] = await db
		.select({
			id: personas.id,
			nombre: personas.nombre,
			email: personas.email,
			fecha_ingreso: personas.fecha_ingreso,
			rol: roles.slug,
			rol_nombre: roles.nombre,
			foto_url: personas.foto_url,
			departamento: departamentos.nombre,
		})
		.from(personas)
		.leftJoin(roles, eq(personas.rol_id, roles.id))
		.leftJoin(departamentos, eq(personas.departamento_id, departamentos.id))
		.where(eq(personas.id, userId))
		.limit(1);

	if (!persona) {
		throw new ErrorHttp(404, "Usuario no encontrado.");
	}

	return {
		...persona,
		rol: persona.rol_nombre ?? etiquetaRol(persona.rol),
		rol_slug: persona.rol ?? "",
	};
}

// Actualiza los datos del perfil del usuario (sin contraseña)
export async function updatePerfilUsuario(
	userId: number | undefined,
	input: {
		nombre?: string;
		email?: string;
		departamento?: string;
		foto_url?: string;
	},
) {
	if (!userId) throw new ErrorHttp(401, "ID de usuario no proporcionado.");
	const { nombre, email, departamento, foto_url } = input;

	const [persona] = await db
		.select({ id: personas.id })
		.from(personas)
		.where(eq(personas.id, userId))
		.limit(1);

	if (!persona) {
		throw new ErrorHttp(404, "Usuario no encontrado.");
	}

	if (email) {
		const [existente] = await db
			.select({ id: personas.id })
			.from(personas)
			.where(and(eq(personas.email, email), ne(personas.id, userId)))
			.limit(1);

		if (existente) {
			throw new ErrorHttp(409, "El correo electrónico ya está registrado.");
		}
	}

	const updates: {
		nombre?: string;
		email?: string;
		departamento_id?: number;
		foto_url?: string;
	} = {};

	if (nombre) updates.nombre = nombre;
	if (email) updates.email = email;
	if (foto_url) updates.foto_url = foto_url;

	if (departamento) {
		const [existente] = await db
			.select({ id: departamentos.id })
			.from(departamentos)
			.where(eq(departamentos.nombre, departamento))
			.limit(1);

		updates.departamento_id =
			existente?.id ??
			(
				await db
					.insert(departamentos)
					.values({ nombre: departamento })
					.$returningId()
			)[0]?.id;
	}

	if (Object.keys(updates).length === 0) {
		throw new ErrorHttp(
			400,
			"No se proporcionaron cambios válidos para actualizar.",
		);
	}

	await db.update(personas).set(updates).where(eq(personas.id, userId));
}

// Cambia la contraseña del usuario autenticado
export async function cambiarContrasenaUsuario(
	userId: number | undefined,
	input: {
		contrasena_actual: string;
		nueva_contrasena: string;
		confirmar_nueva_contrasena: string;
	},
) {
	if (!userId) throw new ErrorHttp(401, "ID de usuario no proporcionado.");
	const { contrasena_actual, nueva_contrasena, confirmar_nueva_contrasena } =
		input;

	if (nueva_contrasena !== confirmar_nueva_contrasena) {
		throw new ErrorHttp(
			400,
			"La nueva contraseña y su confirmación no coinciden.",
		);
	}

	const [persona] = await db
		.select({ id: personas.id, contrasena: personas.contrasena })
		.from(personas)
		.where(eq(personas.id, userId))
		.limit(1);

	if (!persona) {
		throw new ErrorHttp(404, "Usuario no encontrado.");
	}

	const coincide = await hashService.verificarHash(
		contrasena_actual,
		persona.contrasena,
	);
	if (!coincide) {
		throw new ErrorHttp(400, "La contraseña actual es incorrecta.");
	}

	if (contrasena_actual === nueva_contrasena) {
		throw new ErrorHttp(
			400,
			"La nueva contraseña debe ser diferente a la actual.",
		);
	}

	const hash = await hashService.generarHash(nueva_contrasena);

	await db
		.update(personas)
		.set({
			contrasena: hash,
			token_version: sql`${personas.token_version} + 1`,
		})
		.where(eq(personas.id, userId));
}

// Sube la foto de perfil a R2 y devuelve su URL
export async function subirImagenPerfil(fileBuffer: Buffer, mimetype: string) {
	const key = r2Service.generarClave("perfil", mimetype);
	const result = await r2Service.subirAR2(fileBuffer, key, mimetype);

	return { url: result.url };
}

// Personas activas para catálogos
export async function listarPersonasActivas() {
	return db
		.select({
			id: personas.id,
			nombre: personas.nombre,
			email: personas.email,
			rol: roles.slug,
			rol_nombre: roles.nombre,
		})
		.from(personas)
		.leftJoin(roles, eq(personas.rol_id, roles.id))
		.where(isNull(personas.deleted_at));
}
