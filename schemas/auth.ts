import { z } from "zod";

// Schema de inicio de sesión
export const loginSchema = z.object({
	email: z
		.string({ error: "Debe ser un texto válido" })
		.email({ error: "El correo electrónico no es válido" }),
	contrasena: z
		.string({ error: "Debe ser un texto válido" })
		.min(1, { error: "La contraseña es obligatoria" }),
});

// Schema de registro de usuario nuevo
export const registroSchema = z.object({
	nombre: z
		.string({ error: "Debe ser un texto válido" })
		.min(1, { error: "El nombre es obligatorio" }),
	email: z
		.string({ error: "Debe ser un texto válido" })
		.email({ error: "El correo electrónico no es válido" }),
	contrasena: z
		.string()
		.min(8, { error: "La contraseña debe tener al menos 8 caracteres" }),
	departamento: z
		.string({ error: "Debe ser un texto válido" })
		.min(1, { error: "El departamento es obligatorio" }),
	fecha_ingreso: z
		.string({ error: "Debe ser un texto válido" })
		.min(1, { error: "La fecha de ingreso es obligatoria" }),
	rol: z.enum(["Administrador", "Técnico", "Almacén", "Empleado", "Usuario"], {
		error: "Rol no válido",
	}),
});
