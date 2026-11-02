import { z } from "zod";

export const crearIncidenciaSchema = z.object({
	activo_id: z.coerce
		.number({ error: "Debe ser un número válido" })
		.int()
		.positive({ error: "El activo es obligatorio" }),
	descripcion: z
		.string({ error: "Debe ser un texto válido" })
		.min(5, { error: "Describe la incidencia con al menos 5 caracteres" }),
	prioridad: z
		.enum(["baja", "media", "alta"], { error: "Prioridad no válida" })
		.default("media"),
});

export const cambiarEstadoIncidenciaSchema = z.object({
	estado: z.enum(["abierta", "en_revision", "resuelta", "cerrada"], {
		error: "Estado no válido",
	}),
	fecha_resolucion: z.string().optional(),
});

export const abrirMantenimientoIncidenciaSchema = z
	.object({
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
