import { z } from "zod";

export const crearSolicitudSchema = z.object({
	tipo: z.enum(["equipo", "licencia", "accesorio", "reemplazo"], {
		error: "Tipo de solicitud no válido",
	}),
	tipo_activo_id: z.coerce.number().int().positive().optional(),
	motivo: z
		.string({ error: "Debe ser un texto válido" })
		.min(5, { error: "Explica el motivo con al menos 5 caracteres" }),
	prioridad: z
		.enum(["baja", "media", "alta"], { error: "Prioridad no válida" })
		.default("media"),
});

export const entregarSolicitudSchema = z.object({
	activo_id: z.coerce
		.number({ error: "Debe ser un número válido" })
		.int()
		.positive({ error: "El activo es obligatorio" }),
	ubicacion_id: z.coerce
		.number({ error: "Debe ser un número válido" })
		.int()
		.positive({ error: "La ubicación es obligatoria" }),
	persona_id: z.coerce.number().int().positive().optional(),
});

// Motivo opcional al aprobar o rechazar
export const resolverSolicitudSchema = z.object({
	comentario: z.string().optional(),
});
