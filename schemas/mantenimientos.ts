import { z } from "zod";

// Apertura de un mantenimiento
export const crearMantenimientoSchema = z
	.object({
		activo_id: z.coerce
			.number({ error: "Debe ser un número válido" })
			.int()
			.positive({ error: "El activo es obligatorio" }),
		responsable: z.enum(["interno", "externo"], {
			error: "El responsable debe ser 'interno' o 'externo'",
		}),
		tecnico_id: z.coerce.number().int().positive().optional(),
		proveedor_id: z.coerce.number().int().positive().optional(),
		tipo: z.enum(["preventivo", "correctivo"], {
			error: "El tipo debe ser 'preventivo' o 'correctivo'",
		}),
		fecha_salida: z
			.string({ error: "Debe ser un texto válido" })
			.min(1, { error: "La fecha de salida es obligatoria" }),
		diagnostico: z.string().optional(),
		costo: z.coerce.number().min(0).optional(),
	})
	.refine(
		(datos) =>
			datos.responsable === "interno"
				? Boolean(datos.tecnico_id)
				: Boolean(datos.proveedor_id),
		{ error: "El responsable no coincide con los datos enviados" },
	);

// Edición de datos del mantenimiento
export const actualizarMantenimientoSchema = z.object({
	responsable: z.enum(["interno", "externo"]).optional(),
	tecnico_id: z.coerce.number().int().positive().optional(),
	proveedor_id: z.coerce.number().int().positive().optional(),
	tipo: z.enum(["preventivo", "correctivo"]).optional(),
	fecha_salida: z.string().optional(),
	diagnostico: z.string().optional(),
	costo: z.coerce.number().min(0).optional(),
});

// Cierre del mantenimiento
export const cerrarMantenimientoSchema = z.object({
	fecha_retorno: z
		.string({ error: "Debe ser un texto válido" })
		.min(1, { error: "La fecha de retorno es obligatoria" }),
	diagnostico: z.string().optional(),
	costo: z.coerce.number().min(0).optional(),
});

export type CrearMantenimientoInput = z.infer<typeof crearMantenimientoSchema>;
