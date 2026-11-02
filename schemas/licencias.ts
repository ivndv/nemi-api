import { z } from "zod";

// Asignación de un asiento de licencia a una persona o a un activo
export const asignarAsientoSchema = z
	.object({
		destino_tipo: z.enum(["persona", "activo"], {
			error: "El destino debe ser 'persona' o 'activo'",
		}),
		persona_id: z.coerce
			.number({ error: "Debe ser un número válido" })
			.int()
			.positive()
			.optional(),
		activo_id: z.coerce
			.number({ error: "Debe ser un número válido" })
			.int()
			.positive()
			.optional(),
		fecha_asignacion: z
			.string({ error: "Debe ser un texto válido" })
			.min(1, { error: "La fecha de asignación es obligatoria" }),
	})
	.refine(
		(datos) =>
			datos.destino_tipo === "persona"
				? Boolean(datos.persona_id) && !datos.activo_id
				: Boolean(datos.activo_id) && !datos.persona_id,
		{ error: "El destino no coincide con los datos enviados" },
	);

// Registro de una renovación de licencia
export const crearRenovacionSchema = z.object({
	fecha: z
		.string({ error: "Debe ser un texto válido" })
		.min(1, { error: "La fecha es obligatoria" }),
	asientos: z.coerce
		.number({ error: "Debe ser un número válido" })
		.int()
		.positive({ error: "Los asientos deben ser mayores a cero" }),
	costo: z.coerce
		.number({ error: "Debe ser un número válido" })
		.min(0, { error: "El costo no puede ser negativo" })
		.optional(),
	adjunto_id: z.coerce.number().int().positive().optional(),
});

export type AsignarAsientoInput = z.infer<typeof asignarAsientoSchema>;
export type CrearRenovacionInput = z.infer<typeof crearRenovacionSchema>;
