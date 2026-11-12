import { z } from "zod";

// Schema de actualización de configuración del sistema
export const updateConfigSchema = z
	.object({
		idioma: z
			.enum(["es", "en", "fr"], { error: "Idioma no válido." })
			.optional(),
		zona_horaria: z
			.string({ error: "Debe ser un texto válido" })
			.min(1, { error: "La zona horaria es obligatoria" })
			.refine(
				(valor) => {
					try {
						new Intl.DateTimeFormat("en-CA", { timeZone: valor });
						return true;
					} catch {
						return false;
					}
				},
				{ error: "La zona horaria no es válida" },
			)
			.optional(),
		formato_fecha: z
			.string({ error: "Debe ser un texto válido" })
			.min(1, { error: "El formato de fecha es obligatorio" })
			.optional(),
		formato_moneda: z
			.string({ error: "Debe ser un texto válido" })
			.min(1, { error: "El formato de moneda es obligatorio" })
			.optional(),
		dias_alerta_licencia: z.coerce.number().int().min(1).max(365).optional(),
		dias_alerta_garantia: z.coerce.number().int().min(1).max(365).optional(),
		dias_alerta_devolucion: z.coerce.number().int().min(1).max(365).optional(),
		dias_alerta_mantenimiento: z.coerce
			.number()
			.int()
			.min(1)
			.max(365)
			.optional(),
	})
	.refine((data) => Object.values(data).some((valor) => valor !== undefined), {
		error: "Debes proporcionar al menos un ajuste para actualizar.",
	});

// Schema de actualización de perfil de usuario (sin contraseña)
export const updatePerfilSchema = z
	.object({
		nombre: z
			.string({ error: "Debe ser un texto válido" })
			.min(1, { error: "El nombre debe ser un texto válido" })
			.optional(),
		email: z
			.string({ error: "Debe ser un texto válido" })
			.email({ error: "El correo electrónico no es válido." })
			.optional(),
		departamento: z
			.string({ error: "Debe ser un texto válido" })
			.min(1, { error: "El departamento debe ser un texto válido" })
			.optional(),
		foto_url: z.string({ error: "Debe ser un texto válido" }).optional(),
	})
	.refine((data) => Object.values(data).some((valor) => valor !== undefined), {
		error: "Debes proporcionar al menos un campo para actualizar.",
	});

// Schema de cambio de contraseña
export const updatePasswordSchema = z
	.object({
		contrasena_actual: z
			.string({ error: "Debe ser un texto válido" })
			.min(1, { error: "La contraseña actual es obligatoria" }),
		nueva_contrasena: z
			.string()
			.min(12, { error: "La contraseña debe tener al menos 12 caracteres" }),
		confirmar_nueva_contrasena: z
			.string({ error: "Debe ser un texto válido" })
			.min(1, { error: "Debes confirmar la nueva contraseña" }),
	})
	.refine((data) => data.nueva_contrasena === data.confirmar_nueva_contrasena, {
		error: "La nueva contraseña y su confirmación no coinciden.",
	});
