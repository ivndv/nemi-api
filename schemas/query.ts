import { z } from "zod";

// Paginación y búsqueda comunes a todos los listados
export const paginacionQuerySchema = z.object({
	page: z.coerce
		.number({ error: "page debe ser un número" })
		.int({ error: "page debe ser entero" })
		.min(1, { error: "page debe ser mayor o igual a 1" })
		.default(1),
	limit: z.coerce
		.number({ error: "limit debe ser un número" })
		.int({ error: "limit debe ser entero" })
		.min(1, { error: "limit debe ser mayor o igual a 1" })
		.max(100, { error: "limit no puede superar 100" })
		.default(10),
	orden: z
		.enum(["asc", "desc"], { error: "orden debe ser asc o desc" })
		.default("asc"),
	search: z
		.string({ error: "search debe ser texto" })
		.trim()
		.max(100, { error: "search no puede superar 100 caracteres" })
		.optional(),
});

// Filtros que se repiten entre activos y asignaciones
const idFiltro = z.coerce
	.number({ error: "Debe ser un número" })
	.int({ error: "Debe ser un número entero" })
	.positive({ error: "Debe ser mayor a cero" })
	.optional();
const fecha = z.iso
	.date({ error: "La fecha debe tener formato YYYY-MM-DD" })
	.optional();
const booleano = z
	.enum(["true", "false"], {
		error: "El valor debe ser true o false",
	})
	.optional();

// Activos
export const activosQuerySchema = paginacionQuerySchema.extend({
	tipo: idFiltro,
	estado: z
		.enum(
			[
				"Disponible",
				"Asignado",
				"En mantenimiento",
				"disponible",
				"asignado",
				"mantenimiento",
			],
			{ error: "Estado no válido" },
		)
		.optional(),
	ubicacion: idFiltro,
	usuario_asignado: idFiltro,
	licencia_proxima: booleano,
	garantia_proxima: booleano,
	fecha_devolucion_proxima: booleano,
	fecha_inicio: fecha,
	fecha_fin: fecha,
});

// Asignaciones
export const asignacionesQuerySchema = paginacionQuerySchema.extend({
	tipo: idFiltro,
	ubicacion: idFiltro,
	usuario_asignado: idFiltro,
});

// Garantías
export const garantiasQuerySchema = paginacionQuerySchema;

// Historial
export const historialQuerySchema = paginacionQuerySchema.extend({
	accion: z.string().trim().max(100).optional(),
	usuario_responsable: idFiltro,
});

// Licencias
export const licenciasQuerySchema = paginacionQuerySchema.extend({
	tipo_id: idFiltro,
});

// Mantenimientos
export const mantenimientosQuerySchema = paginacionQuerySchema.extend({
	activo_id: idFiltro,
	estado: z.enum(["abierto", "cerrado"]).optional(),
	responsable: z.enum(["interno", "externo"]).optional(),
	desde: fecha,
	hasta: fecha,
});

// Incidencias
export const incidenciasQuerySchema = paginacionQuerySchema.extend({
	estado: z.enum(["abierta", "en_revision", "resuelta", "cerrada"]).optional(),
	prioridad: z.enum(["baja", "media", "alta"]).optional(),
	activo_id: idFiltro,
});

// Solicitudes
export const solicitudesQuerySchema = paginacionQuerySchema.extend({
	estado: z
		.enum(["pendiente", "aprobada", "rechazada", "entregada"])
		.optional(),
	tipo: z.enum(["equipo", "licencia", "accesorio", "reemplazo"]).optional(),
});

// Adjuntos
export const adjuntosQuerySchema = z.object({
	entidad: z
		.enum([
			"activo",
			"licencia",
			"garantia",
			"mantenimiento",
			"incidencia",
			"solicitud",
		])
		.optional(),
	entidad_id: idFiltro,
});

// Parámetros de ruta frecuentes
export const idParamSchema = z.object({
	id: z.coerce
		.number()
		.int()
		.positive({ error: "El id debe ser un número positivo" }),
});

export const asientoParamSchema = z.object({
	id: z.coerce
		.number()
		.int()
		.positive({ error: "El id debe ser un número positivo" }),
	asiento: z.coerce
		.number()
		.int()
		.positive({ error: "El asiento debe ser un número positivo" }),
});
