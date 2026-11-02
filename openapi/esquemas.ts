import { z } from "zod";

// Esquemas comunes reutilizados por todas las rutas
export const errorSchema = z
	.object({
		error: z.string(),
		errores: z.record(z.string(), z.array(z.string())).optional(),
	})
	.meta({ id: "Error" });

export const paginacionSchema = z
	.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		totalPages: z.number(),
	})
	.meta({ id: "Paginacion" });

export const mensajeSchema = z
	.object({ message: z.string() })
	.meta({ id: "Mensaje" });

// Envoltura de una respuesta con datos
export function respuesta<T extends z.ZodTypeAny>(data: T) {
	return z.object({ data, message: z.string().optional() });
}

// Envoltura de una lista paginada
export function listado<T extends z.ZodTypeAny>(item: T) {
	return z.object({ data: z.array(item), pagination: paginacionSchema });
}

// Entidades principales (campos clave; el resto viaja igual)
export const activoSchema = z
	.object({
		id: z.number(),
		nombre: z.string(),
		tipo: z.string().optional(),
		estado: z.string(),
		tipo_id: z.number().optional(),
		ubicacion: z.string().nullish(),
		usuario_asignado: z.string().nullish(),
		foto_url: z.string().nullish(),
		etiqueta_serial: z.string().nullish(),
	})
	.passthrough()
	.meta({ id: "Activo" });

export const asignacionSchema = z
	.object({
		id: z.number(),
		nombre: z.string(),
		usuario: z.string(),
		ubicacion: z.string(),
		estado_activo: z.string(),
		fecha_asignacion: z.string(),
		fecha_devolucion: z.string().nullish(),
	})
	.passthrough()
	.meta({ id: "Asignacion" });

export const garantiaSchema = z
	.object({
		id: z.number(),
		activo: z.string(),
		proveedor_garantia: z.string(),
		fecha_inicio: z.string(),
		fecha_fin: z.string(),
		estado: z.string(),
	})
	.passthrough()
	.meta({ id: "Garantia" });

export const licenciaSchema = z
	.object({
		activo_id: z.number(),
		nombre: z.string(),
		asientos_comprados: z.number(),
		ocupados: z.number(),
		libres: z.number(),
		estado: z.string(),
	})
	.passthrough()
	.meta({ id: "Licencia" });

export const mantenimientoSchema = z
	.object({
		id: z.number(),
		activo_id: z.number(),
		activo: z.string(),
		responsable: z.string(),
		tipo: z.string(),
		estado: z.string(),
		fecha_salida: z.string(),
		fecha_retorno: z.string().nullish(),
	})
	.passthrough()
	.meta({ id: "Mantenimiento" });

export const incidenciaSchema = z
	.object({
		id: z.number(),
		activo_id: z.number(),
		activo: z.string(),
		descripcion: z.string(),
		prioridad: z.string(),
		estado: z.string(),
	})
	.passthrough()
	.meta({ id: "Incidencia" });

export const solicitudSchema = z
	.object({
		id: z.number(),
		solicitante: z.string(),
		tipo: z.string(),
		estado: z.string(),
		prioridad: z.string(),
	})
	.passthrough()
	.meta({ id: "Solicitud" });

export const adjuntoSchema = z
	.object({
		id: z.number(),
		entidad: z.string(),
		entidad_id: z.number(),
		tipo: z.string(),
		nombre: z.string(),
		key: z.string().nullish(),
		url: z.string(),
	})
	.passthrough()
	.meta({ id: "Adjunto" });

export const eventoSchema = z
	.object({
		id: z.number(),
		accion: z.string(),
		fecha: z.string(),
		usuario_responsable: z.string().nullish(),
	})
	.passthrough()
	.meta({ id: "Evento" });

export const perfilSchema = z
	.object({
		id: z.number(),
		nombre: z.string(),
		email: z.string(),
		rol: z.string(),
		departamento: z.string().nullish(),
	})
	.passthrough()
	.meta({ id: "Perfil" });

export const dashboardResumenSchema = z
	.object({
		total_activos: z.number(),
		activos_disponibles: z.number(),
		activos_asignados: z.number(),
		activos_en_mantenimiento: z.number(),
		activos_dados_de_baja: z.number(),
	})
	.passthrough()
	.meta({ id: "DashboardResumen" });

export const alertasSchema = z
	.object({
		licencias_proximas_a_vencer: z.number(),
		garantias_proximas_a_expirar: z.number(),
		activos_en_mantenimiento: z.number(),
		activos_proximos_a_devolver: z.number(),
	})
	.passthrough()
	.meta({ id: "Alertas" });
