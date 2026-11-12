import { z } from "zod";

// Roles aceptados por el API (etiquetas y códigos)
const rolSchema = z.enum(
	["Administrador", "Técnico", "Almacén", "Empleado", "Usuario"],
	{ error: "Rol no válido" },
);

export const crearPersonaSchema = z.object({
	nombre: z
		.string({ error: "Debe ser un texto válido" })
		.min(1, { error: "El nombre es obligatorio" })
		.max(255),
	email: z
		.string({ error: "Debe ser un texto válido" })
		.email({ error: "El correo electrónico no es válido" }),
	contrasena: z
		.string({ error: "Debe ser un texto válido" })
		.min(12, { error: "La contraseña debe tener al menos 12 caracteres" }),
	rol: rolSchema,
	departamento: z
		.string({ error: "Debe ser un texto válido" })
		.min(1, { error: "El departamento es obligatorio" }),
	sede_id: z.coerce.number().int().positive().optional(),
	fecha_ingreso: z
		.string({ error: "Debe ser un texto válido" })
		.min(1, { error: "La fecha de ingreso es obligatoria" }),
});

export const actualizarPersonaSchema = z.object({
	nombre: z.string().min(1).max(255).optional(),
	email: z
		.string()
		.email({ error: "El correo electrónico no es válido" })
		.optional(),
	rol: rolSchema.optional(),
	departamento: z.string().min(1).optional(),
	sede_id: z.coerce.number().int().positive().nullable().optional(),
	fecha_ingreso: z.string().optional(),
});

export const cambiarPasswordSchema = z.object({
	contrasena: z
		.string({ error: "Debe ser un texto válido" })
		.min(12, { error: "La contraseña debe tener al menos 12 caracteres" }),
});

export const listarPersonasQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	search: z.string().trim().max(100).optional(),
	rol_id: z.coerce.number().int().positive().optional(),
	sede_id: z.coerce.number().int().positive().optional(),
	departamento_id: z.coerce.number().int().positive().optional(),
});

export type CrearPersonaInput = z.infer<typeof crearPersonaSchema>;
export type ActualizarPersonaInput = z.infer<typeof actualizarPersonaSchema>;
