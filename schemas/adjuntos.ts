import { z } from "zod";

export const crearAdjuntoSchema = z.object({
	entidad: z.enum(
		[
			"activo",
			"licencia",
			"garantia",
			"mantenimiento",
			"incidencia",
			"solicitud",
		],
		{ error: "Entidad no válida" },
	),
	entidad_id: z.coerce
		.number({ error: "Debe ser un número válido" })
		.int()
		.positive({ error: "La entidad es obligatoria" }),
	tipo: z
		.enum(["factura", "poliza", "acta", "foto", "otro"], {
			error: "Tipo de adjunto no válido",
		})
		.default("otro"),
	nombre: z.string().optional(),
});
