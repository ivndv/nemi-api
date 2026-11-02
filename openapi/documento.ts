import { z } from "zod";
import { createDocument, createSchema } from "zod-openapi";
import {
	createActivoSchema,
	updateActivoSchema,
	validarEtiquetaSchema,
} from "../schemas/activos.js";
import { crearAdjuntoSchema } from "../schemas/adjuntos.js";
import {
	createAsignacionSchema,
	updateAsignacionSchema,
} from "../schemas/asignaciones.js";
import { loginSchema, registroSchema } from "../schemas/auth.js";
import {
	updateConfigSchema,
	updatePerfilSchema,
} from "../schemas/configuracion.js";
import {
	createGarantiaSchema,
	updateGarantiaSchema,
} from "../schemas/garantias.js";
import { registrarAccionSchema } from "../schemas/historial.js";
import {
	abrirMantenimientoIncidenciaSchema,
	cambiarEstadoIncidenciaSchema,
	crearIncidenciaSchema,
} from "../schemas/incidencias.js";
import {
	asignarAsientoSchema,
	crearRenovacionSchema,
} from "../schemas/licencias.js";
import {
	actualizarMantenimientoSchema,
	cerrarMantenimientoSchema,
	crearMantenimientoSchema,
} from "../schemas/mantenimientos.js";
import {
	actualizarPersonaSchema,
	cambiarPasswordSchema,
	crearPersonaSchema,
	listarPersonasQuerySchema,
} from "../schemas/personas.js";
import {
	activosQuerySchema,
	adjuntosQuerySchema,
	asignacionesQuerySchema,
	garantiasQuerySchema,
	historialQuerySchema,
	incidenciasQuerySchema,
	licenciasQuerySchema,
	mantenimientosQuerySchema,
	solicitudesQuerySchema,
} from "../schemas/query.js";
import { generarReporteSchema } from "../schemas/reporte.js";
import {
	crearSolicitudSchema,
	entregarSolicitudSchema,
	resolverSolicitudSchema,
} from "../schemas/solicitudes.js";
import {
	activoSchema,
	adjuntoSchema,
	alertasSchema,
	asignacionSchema,
	dashboardResumenSchema,
	errorSchema,
	eventoSchema,
	garantiaSchema,
	incidenciaSchema,
	licenciaSchema,
	listado,
	mantenimientoSchema,
	mensajeSchema,
	perfilSchema,
	respuesta,
	solicitudSchema,
} from "./esquemas.js";

// ─── Utilidades ──────────────────────────────────────────────────────────────
// Nombres estables para que los schemas se registren en components
const LoginRequest = loginSchema.meta({ id: "LoginRequest" });
const RegistroRequest = registroSchema.meta({ id: "RegistroRequest" });
const CrearActivo = createActivoSchema.meta({ id: "CrearActivo" });
const ActualizarActivo = updateActivoSchema.meta({ id: "ActualizarActivo" });
const ValidarEtiqueta = validarEtiquetaSchema.meta({ id: "ValidarEtiqueta" });
const CrearAsignacion = createAsignacionSchema.meta({ id: "CrearAsignacion" });
const ActualizarAsignacion = updateAsignacionSchema.meta({
	id: "ActualizarAsignacion",
});
const CrearGarantia = createGarantiaSchema.meta({ id: "CrearGarantia" });
const ActualizarGarantia = updateGarantiaSchema.meta({
	id: "ActualizarGarantia",
});
const RegistrarAccion = registrarAccionSchema.meta({ id: "RegistrarAccion" });
const GenerarReporte = generarReporteSchema.meta({ id: "GenerarReporte" });
const ActualizarConfiguracion = updateConfigSchema.meta({
	id: "ActualizarConfiguracion",
});
const ActualizarPerfil = updatePerfilSchema.meta({ id: "ActualizarPerfil" });
const AsignarAsiento = asignarAsientoSchema.meta({ id: "AsignarAsiento" });
const CrearRenovacion = crearRenovacionSchema.meta({ id: "CrearRenovacion" });
const CrearMantenimiento = crearMantenimientoSchema.meta({
	id: "CrearMantenimiento",
});
const ActualizarMantenimiento = actualizarMantenimientoSchema.meta({
	id: "ActualizarMantenimiento",
});
const CerrarMantenimiento = cerrarMantenimientoSchema.meta({
	id: "CerrarMantenimiento",
});
const CrearIncidencia = crearIncidenciaSchema.meta({ id: "CrearIncidencia" });
const CambiarEstadoIncidencia = cambiarEstadoIncidenciaSchema.meta({
	id: "CambiarEstadoIncidencia",
});
const AbrirMantenimientoIncidencia = abrirMantenimientoIncidenciaSchema.meta({
	id: "AbrirMantenimientoIncidencia",
});
const CrearSolicitud = crearSolicitudSchema.meta({ id: "CrearSolicitud" });
const EntregarSolicitud = entregarSolicitudSchema.meta({
	id: "EntregarSolicitud",
});
const ResolverSolicitud = resolverSolicitudSchema.meta({
	id: "ResolverSolicitud",
});
const CrearAdjunto = crearAdjuntoSchema.meta({ id: "CrearAdjunto" });

type Esquema = z.ZodType;

const json = (schema: Esquema) => ({
	"application/json": { schema },
});

const ok = (description: string, schema?: Esquema) => ({
	description,
	...(schema ? { content: json(schema) } : {}),
});

const errores = {
	"400": ok("Datos inválidos", errorSchema),
	"401": ok("No autenticado", errorSchema),
	"403": ok("Sin permisos", errorSchema),
	"404": ok("No encontrado", errorSchema),
	"500": ok("Error interno", errorSchema),
};

const protegida = [{ bearerAuth: [] }];

const idParam = z.object({ id: z.coerce.number() });

// Convierte las peticiones Zod del registro a OpenAPI (parameters / requestBody)
type EntradaRuta = {
	request?: {
		body?: { content?: Record<string, unknown> };
		query?: z.ZodObject<z.ZodRawShape>;
		params?: z.ZodObject<z.ZodRawShape>;
	};
	[key: string]: unknown;
};

function parametros(
	esquema: z.ZodObject<z.ZodRawShape>,
	ubicacion: "query" | "path",
) {
	return Object.entries(esquema.shape).map(([nombre, campo]) => ({
		name: nombre,
		in: ubicacion,
		required: ubicacion === "path",
		schema: createSchema(campo as z.ZodType).schema,
	}));
}

function normalizarRutas(rutas: Record<string, Record<string, EntradaRuta>>) {
	const salida: Record<string, Record<string, unknown>> = {};

	for (const [ruta, metodos] of Object.entries(rutas)) {
		salida[ruta] = {};
		for (const [metodo, operacion] of Object.entries(metodos)) {
			const { request, ...resto } = operacion;
			const convertida: Record<string, unknown> = { ...resto };

			if (request) {
				const parameters = [
					...(request.query ? parametros(request.query, "query") : []),
					...(request.params ? parametros(request.params, "path") : []),
				];
				if (parameters.length > 0) convertida.parameters = parameters;
				if (request.body) {
					convertida.requestBody = {
						required: true,
						content: request.body.content,
					};
				}
			}

			salida[ruta][metodo] = convertida;
		}
	}

	return salida;
}

// ─── Documento ───────────────────────────────────────────────────────────────

export const apiDoc = createDocument({
	openapi: "3.1.0",
	info: {
		title: "Nemi API",
		version: "2.0.0",
		description:
			"API de Nemi: inventario de activos, licencias con asientos, asignaciones, garantías, mantenimientos, incidencias, solicitudes y auditoría.",
	},
	servers: [
		{ url: "http://localhost:3030", description: "Desarrollo local" },
		{ url: "https://nemi-api.fluxdv.icu", description: "Producción" },
	],
	tags: [
		{ name: "Sistema", description: "Estado y documentación" },
		{ name: "Auth", description: "Autenticación y registro" },
		{ name: "Activos", description: "Inventario de activos" },
		{ name: "Asignaciones", description: "Asignación y devolución" },
		{ name: "Licencias", description: "Licencias y asientos" },
		{ name: "Garantías", description: "Cobertura de proveedores" },
		{ name: "Mantenimientos", description: "Intervenciones técnicas" },
		{ name: "Incidencias", description: "Reportes de fallas" },
		{ name: "Solicitudes", description: "Peticiones de empleados" },
		{ name: "Adjuntos", description: "Archivos y documentos" },
		{ name: "Historial", description: "Bitácora de eventos" },
		{ name: "Reportes", description: "Reportes analíticos" },
		{ name: "Dashboard", description: "Resumen y alertas" },
		{ name: "Configuración", description: "Ajustes y perfil" },
		{
			name: "Usuarios",
			description: "Gestión de personas (solo administrador)",
		},
	],
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
	},
	paths: normalizarRutas({
		// ── Sistema ──────────────────────────────────────────────────────────
		"/api/health": {
			get: {
				tags: ["Sistema"],
				summary: "Estado del servicio",
				responses: {
					"200": ok(
						"Servicio operativo",
						z.object({
							data: z.object({
								status: z.string(),
								uptime: z.number(),
								timestamp: z.string(),
							}),
							message: z.string(),
						}),
					),
				},
			},
		},

		// ── Auth ─────────────────────────────────────────────────────────────
		"/api/auth/login": {
			post: {
				tags: ["Auth"],
				summary: "Iniciar sesión",
				request: { body: { content: json(LoginRequest) } },
				responses: {
					"200": ok(
						"Sesión iniciada",
						z.object({
							data: z.object({
								token: z.string(),
								userData: perfilSchema,
							}),
							message: z.string(),
						}),
					),
					...errores,
				},
			},
		},
		"/api/auth/registro": {
			post: {
				tags: ["Auth"],
				summary: "Registrar persona (solo administrador)",
				security: protegida,
				request: { body: { content: json(RegistroRequest) } },
				responses: {
					"201": ok("Persona registrada", mensajeSchema),
					...errores,
				},
			},
		},

		// ── Activos ──────────────────────────────────────────────────────────
		"/api/gestion-activos/activos": {
			get: {
				tags: ["Activos"],
				summary: "Listar activos",
				description: "El empleado solo ve los activos que tiene asignados.",
				security: protegida,
				request: { query: activosQuerySchema },
				responses: {
					"200": ok("Lista de activos", listado(activoSchema)),
					...errores,
				},
			},
			post: {
				tags: ["Activos"],
				summary: "Crear activo",
				security: protegida,
				request: {
					body: {
						content: { "multipart/form-data": { schema: CrearActivo } },
					},
				},
				responses: {
					"201": ok(
						"Activo creado",
						z.object({
							data: z.object({ id: z.number() }),
							message: z.string(),
						}),
					),
					...errores,
				},
			},
		},
		"/api/gestion-activos/activos/{id}": {
			get: {
				tags: ["Activos"],
				summary: "Detalle de un activo",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Activo", respuesta(activoSchema)),
					...errores,
				},
			},
			put: {
				tags: ["Activos"],
				summary: "Actualizar activo",
				security: protegida,
				request: {
					params: idParam,
					body: {
						content: { "multipart/form-data": { schema: ActualizarActivo } },
					},
				},
				responses: {
					"200": ok("Activo actualizado", mensajeSchema),
					...errores,
				},
			},
			delete: {
				tags: ["Activos"],
				summary: "Dar de baja el activo (lógico)",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Activo dado de baja", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/gestion-activos/baja/{id}": {
			patch: {
				tags: ["Activos"],
				summary: "Baja lógica de un activo",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Activo dado de baja", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/gestion-activos/datos-auxiliares": {
			get: {
				tags: ["Activos"],
				summary: "Catálogos para formularios",
				security: protegida,
				responses: { "200": ok("Catálogos"), ...errores },
			},
		},
		"/api/gestion-activos/validar-etiqueta-serial": {
			post: {
				tags: ["Activos"],
				summary: "Verificar disponibilidad de serial",
				security: protegida,
				request: { body: { content: json(ValidarEtiqueta) } },
				responses: {
					"200": ok("Serial disponible", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/gestion-activos/activos/upload": {
			post: {
				tags: ["Activos"],
				summary: "Subir foto de activo",
				security: protegida,
				responses: {
					"200": ok("Imagen subida", z.object({ url: z.string() })),
					...errores,
				},
			},
		},

		// ── Asignaciones ─────────────────────────────────────────────────────
		"/api/asignaciones": {
			get: {
				tags: ["Asignaciones"],
				summary: "Listar asignaciones",
				security: protegida,
				request: { query: asignacionesQuerySchema },
				responses: {
					"200": ok("Asignaciones", listado(asignacionSchema)),
					...errores,
				},
			},
			post: {
				tags: ["Asignaciones"],
				summary: "Crear asignación",
				security: protegida,
				request: { body: { content: json(CrearAsignacion) } },
				responses: {
					"201": ok("Asignación creada", respuesta(asignacionSchema)),
					...errores,
				},
			},
		},
		"/api/asignaciones/{id}": {
			get: {
				tags: ["Asignaciones"],
				summary: "Detalle de asignación",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Asignación", respuesta(asignacionSchema)),
					...errores,
				},
			},
			put: {
				tags: ["Asignaciones"],
				summary: "Actualizar o devolver asignación",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(ActualizarAsignacion) },
				},
				responses: {
					"200": ok("Asignación actualizada", mensajeSchema),
					...errores,
				},
			},
			delete: {
				tags: ["Asignaciones"],
				summary: "Registrar devolución",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Asignación eliminada", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/asignaciones/activos-disponibles": {
			get: {
				tags: ["Asignaciones"],
				summary: "Activos disponibles para asignar",
				security: protegida,
				request: { query: asignacionesQuerySchema },
				responses: {
					"200": ok("Activos disponibles", listado(activoSchema)),
					...errores,
				},
			},
		},
		"/api/asignaciones/datos-auxiliares/{id}": {
			get: {
				tags: ["Asignaciones"],
				summary: "Datos para el formulario de asignación",
				security: protegida,
				request: { params: idParam },
				responses: { "200": ok("Datos auxiliares"), ...errores },
			},
		},

		// ── Licencias ────────────────────────────────────────────────────────
		"/api/licencias": {
			get: {
				tags: ["Licencias"],
				summary: "Listar licencias con ocupación",
				security: protegida,
				request: { query: licenciasQuerySchema },
				responses: {
					"200": ok("Licencias", listado(licenciaSchema)),
					...errores,
				},
			},
		},
		"/api/licencias/{id}": {
			get: {
				tags: ["Licencias"],
				summary: "Detalle de licencia",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Licencia", respuesta(licenciaSchema)),
					...errores,
				},
			},
		},
		"/api/licencias/{id}/asientos": {
			get: {
				tags: ["Licencias"],
				summary: "Asientos de la licencia",
				security: protegida,
				request: { params: idParam },
				responses: { "200": ok("Asientos"), ...errores },
			},
			post: {
				tags: ["Licencias"],
				summary: "Asignar el siguiente asiento libre",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(AsignarAsiento) },
				},
				responses: { "201": ok("Asiento asignado"), ...errores },
			},
		},
		"/api/licencias/{id}/asientos/{asiento}/liberar": {
			patch: {
				tags: ["Licencias"],
				summary: "Liberar un asiento",
				security: protegida,
				request: {
					params: z.object({
						id: z.coerce.number(),
						asiento: z.coerce.number(),
					}),
				},
				responses: { "200": ok("Asiento liberado"), ...errores },
			},
		},
		"/api/licencias/{id}/renovaciones": {
			get: {
				tags: ["Licencias"],
				summary: "Renovaciones de la licencia",
				security: protegida,
				request: { params: idParam },
				responses: { "200": ok("Renovaciones"), ...errores },
			},
			post: {
				tags: ["Licencias"],
				summary: "Registrar renovación",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(CrearRenovacion) },
				},
				responses: { "201": ok("Renovación registrada"), ...errores },
			},
		},

		// ── Garantías ────────────────────────────────────────────────────────
		"/api/garantias": {
			get: {
				tags: ["Garantías"],
				summary: "Listar garantías",
				security: protegida,
				request: { query: asignacionesQuerySchema },
				responses: {
					"200": ok("Garantías", listado(garantiaSchema)),
					...errores,
				},
			},
			post: {
				tags: ["Garantías"],
				summary: "Registrar garantía",
				security: protegida,
				request: { body: { content: json(CrearGarantia) } },
				responses: {
					"201": ok("Garantía registrada", respuesta(garantiaSchema)),
					...errores,
				},
			},
		},
		"/api/garantias/{id}": {
			put: {
				tags: ["Garantías"],
				summary: "Actualizar garantía",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(ActualizarGarantia) },
				},
				responses: {
					"200": ok("Garantía actualizada", mensajeSchema),
					...errores,
				},
			},
			delete: {
				tags: ["Garantías"],
				summary: "Eliminar garantía",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Garantía eliminada", mensajeSchema),
					...errores,
				},
			},
		},

		// ── Mantenimientos ───────────────────────────────────────────────────
		"/api/mantenimientos": {
			get: {
				tags: ["Mantenimientos"],
				summary: "Listar mantenimientos",
				security: protegida,
				request: { query: mantenimientosQuerySchema },
				responses: {
					"200": ok("Mantenimientos", listado(mantenimientoSchema)),
					...errores,
				},
			},
			post: {
				tags: ["Mantenimientos"],
				summary: "Abrir mantenimiento",
				security: protegida,
				request: { body: { content: json(CrearMantenimiento) } },
				responses: {
					"201": ok("Mantenimiento abierto", respuesta(mantenimientoSchema)),
					...errores,
				},
			},
		},
		"/api/mantenimientos/{id}": {
			get: {
				tags: ["Mantenimientos"],
				summary: "Detalle de mantenimiento",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Mantenimiento", respuesta(mantenimientoSchema)),
					...errores,
				},
			},
			put: {
				tags: ["Mantenimientos"],
				summary: "Actualizar mantenimiento",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(ActualizarMantenimiento) },
				},
				responses: {
					"200": ok("Mantenimiento actualizado", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/mantenimientos/{id}/cerrar": {
			patch: {
				tags: ["Mantenimientos"],
				summary: "Cerrar mantenimiento",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(CerrarMantenimiento) },
				},
				responses: {
					"200": ok("Mantenimiento cerrado", mensajeSchema),
					...errores,
				},
			},
		},

		// ── Incidencias ──────────────────────────────────────────────────────
		"/api/incidencias": {
			get: {
				tags: ["Incidencias"],
				summary: "Listar incidencias",
				security: protegida,
				request: { query: incidenciasQuerySchema },
				responses: {
					"200": ok("Incidencias", listado(incidenciaSchema)),
					...errores,
				},
			},
			post: {
				tags: ["Incidencias"],
				summary: "Reportar incidencia",
				security: protegida,
				request: { body: { content: json(CrearIncidencia) } },
				responses: {
					"201": ok("Incidencia reportada", respuesta(incidenciaSchema)),
					...errores,
				},
			},
		},
		"/api/incidencias/{id}": {
			get: {
				tags: ["Incidencias"],
				summary: "Detalle de incidencia",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Incidencia", respuesta(incidenciaSchema)),
					...errores,
				},
			},
		},
		"/api/incidencias/{id}/estado": {
			patch: {
				tags: ["Incidencias"],
				summary: "Cambiar estado de la incidencia",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(CambiarEstadoIncidencia) },
				},
				responses: {
					"200": ok("Incidencia actualizada", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/incidencias/{id}/mantenimiento": {
			post: {
				tags: ["Incidencias"],
				summary: "Abrir mantenimiento desde la incidencia",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(AbrirMantenimientoIncidencia) },
				},
				responses: { "201": ok("Mantenimiento abierto"), ...errores },
			},
		},

		// ── Solicitudes ──────────────────────────────────────────────────────
		"/api/solicitudes": {
			get: {
				tags: ["Solicitudes"],
				summary: "Listar solicitudes",
				security: protegida,
				request: { query: solicitudesQuerySchema },
				responses: {
					"200": ok("Solicitudes", listado(solicitudSchema)),
					...errores,
				},
			},
			post: {
				tags: ["Solicitudes"],
				summary: "Crear solicitud",
				security: protegida,
				request: { body: { content: json(CrearSolicitud) } },
				responses: {
					"201": ok("Solicitud creada", respuesta(solicitudSchema)),
					...errores,
				},
			},
		},
		"/api/solicitudes/{id}": {
			get: {
				tags: ["Solicitudes"],
				summary: "Detalle de solicitud",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Solicitud", respuesta(solicitudSchema)),
					...errores,
				},
			},
		},
		"/api/solicitudes/{id}/aprobar": {
			patch: {
				tags: ["Solicitudes"],
				summary: "Aprobar solicitud",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(ResolverSolicitud) },
				},
				responses: {
					"200": ok("Solicitud aprobada", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/solicitudes/{id}/rechazar": {
			patch: {
				tags: ["Solicitudes"],
				summary: "Rechazar solicitud",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(ResolverSolicitud) },
				},
				responses: {
					"200": ok("Solicitud rechazada", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/solicitudes/{id}/entregar": {
			patch: {
				tags: ["Solicitudes"],
				summary: "Entregar solicitud y crear asignación",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(EntregarSolicitud) },
				},
				responses: {
					"200": ok("Solicitud entregada", mensajeSchema),
					...errores,
				},
			},
		},

		// ── Adjuntos ─────────────────────────────────────────────────────────
		"/api/adjuntos": {
			get: {
				tags: ["Adjuntos"],
				summary: "Listar adjuntos de una entidad",
				security: protegida,
				request: {
					query: z.object({
						entidad: z.string().optional(),
						entidad_id: z.coerce.number().optional(),
					}),
				},
				responses: {
					"200": ok("Adjuntos", listado(adjuntoSchema)),
					...errores,
				},
			},
			post: {
				tags: ["Adjuntos"],
				summary: "Subir adjunto",
				security: protegida,
				request: {
					body: {
						content: { "multipart/form-data": { schema: CrearAdjunto } },
					},
				},
				responses: {
					"201": ok("Adjunto agregado", respuesta(adjuntoSchema)),
					...errores,
				},
			},
		},
		"/api/adjuntos/{id}": {
			delete: {
				tags: ["Adjuntos"],
				summary: "Eliminar adjunto (R2 y base)",
				security: protegida,
				request: { params: idParam },
				responses: {
					"200": ok("Adjunto eliminado", mensajeSchema),
					...errores,
				},
			},
		},

		// ── Historial ────────────────────────────────────────────────────────
		"/api/historial/activos/{id}": {
			get: {
				tags: ["Historial"],
				summary: "Eventos de un activo",
				security: protegida,
				request: { params: idParam, query: historialQuerySchema },
				responses: { "200": ok("Eventos", listado(eventoSchema)), ...errores },
			},
			post: {
				tags: ["Historial"],
				summary: "Registrar acción manual",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(RegistrarAccion) },
				},
				responses: {
					"201": ok("Acción registrada", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/historial/filtros-auxiliares": {
			get: {
				tags: ["Historial"],
				summary: "Acciones y personas para filtros",
				security: protegida,
				responses: { "200": ok("Filtros auxiliares"), ...errores },
			},
		},

		// ── Reportes ─────────────────────────────────────────────────────────
		"/api/reportes/tipos": {
			get: {
				tags: ["Reportes"],
				summary: "Tipos de reporte",
				security: protegida,
				responses: { "200": ok("Tipos de reporte"), ...errores },
			},
		},
		"/api/reportes/datos-auxiliares": {
			get: {
				tags: ["Reportes"],
				summary: "Catálogos para filtros",
				security: protegida,
				responses: { "200": ok("Catálogos"), ...errores },
			},
		},
		"/api/reportes/generar": {
			post: {
				tags: ["Reportes"],
				summary: "Generar reporte",
				security: protegida,
				request: { body: { content: json(GenerarReporte) } },
				responses: { "200": ok("Reporte generado"), ...errores },
			},
		},

		// ── Dashboard ────────────────────────────────────────────────────────
		"/api/dashboard/resumen": {
			get: {
				tags: ["Dashboard"],
				summary: "Resumen del inventario",
				security: protegida,
				responses: {
					"200": ok("Resumen", respuesta(dashboardResumenSchema)),
					...errores,
				},
			},
		},
		"/api/dashboard/alertas": {
			get: {
				tags: ["Dashboard"],
				summary: "Alertas de vencimientos",
				security: protegida,
				responses: {
					"200": ok("Alertas", respuesta(alertasSchema)),
					...errores,
				},
			},
		},

		// ── Usuarios ─────────────────────────────────────────────────────────
		"/api/personas": {
			get: {
				tags: ["Usuarios"],
				summary: "Listar personas",
				security: protegida,
				request: { query: listarPersonasQuerySchema },
				responses: { "200": ok("Personas"), ...errores },
			},
			post: {
				tags: ["Usuarios"],
				summary: "Crear persona",
				security: protegida,
				request: { body: { content: json(crearPersonaSchema) } },
				responses: { "201": ok("Persona creada"), ...errores },
			},
		},
		"/api/personas/catalogos": {
			get: {
				tags: ["Usuarios"],
				summary: "Roles, departamentos y sedes",
				security: protegida,
				responses: { "200": ok("Catálogos"), ...errores },
			},
		},
		"/api/personas/{id}": {
			get: {
				tags: ["Usuarios"],
				summary: "Detalle de persona",
				security: protegida,
				request: { params: idParam },
				responses: { "200": ok("Persona"), ...errores },
			},
			put: {
				tags: ["Usuarios"],
				summary: "Actualizar persona",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(actualizarPersonaSchema) },
				},
				responses: { "200": ok("Persona actualizada"), ...errores },
			},
		},
		"/api/personas/{id}/password": {
			patch: {
				tags: ["Usuarios"],
				summary: "Cambiar contraseña de una persona",
				security: protegida,
				request: {
					params: idParam,
					body: { content: json(cambiarPasswordSchema) },
				},
				responses: { "200": ok("Contraseña actualizada"), ...errores },
			},
		},
		"/api/personas/{id}/baja": {
			patch: {
				tags: ["Usuarios"],
				summary: "Dar de baja a una persona",
				security: protegida,
				request: { params: idParam },
				responses: { "200": ok("Persona dada de baja"), ...errores },
			},
		},

		// ── Configuración ────────────────────────────────────────────────────
		"/api/configuracion/aplicacion": {
			get: {
				tags: ["Configuración"],
				summary: "Configuración de la aplicación",
				security: protegida,
				responses: { "200": ok("Configuración"), ...errores },
			},
			put: {
				tags: ["Configuración"],
				summary: "Actualizar configuración",
				security: protegida,
				request: { body: { content: json(ActualizarConfiguracion) } },
				responses: {
					"200": ok("Configuración actualizada", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/configuracion/perfil": {
			get: {
				tags: ["Configuración"],
				summary: "Perfil del usuario",
				security: protegida,
				responses: { "200": ok("Perfil", respuesta(perfilSchema)), ...errores },
			},
			put: {
				tags: ["Configuración"],
				summary: "Actualizar perfil",
				security: protegida,
				request: { body: { content: json(ActualizarPerfil) } },
				responses: {
					"200": ok("Perfil actualizado", mensajeSchema),
					...errores,
				},
			},
		},
		"/api/configuracion/perfil/imagen": {
			post: {
				tags: ["Configuración"],
				summary: "Subir foto de perfil",
				security: protegida,
				responses: { "200": ok("Imagen subida"), ...errores },
			},
		},
	}) as unknown as Record<string, Record<string, EntradaRuta>>,
} as unknown as Parameters<typeof createDocument>[0]);

export type ApiDoc = typeof apiDoc;
