// @ts-expect-error
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { createDocument } from "zod-openapi";
import {
	createActivoSchema,
	updateActivoSchema,
	validarEtiquetaSchema,
} from "../schemas/activos.js";
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
import { generarReporteSchema } from "../schemas/reporte.js";

const swaggerOptions = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "API de Gestión de Activos",
			version: "1.0.0",
			description: "API para gestionar activos en la aplicación",
		},
		servers: [
			{
				url: "http://localhost:3000",
				description: "Servidor local",
			},
		],
	},
	apis: ["./routes/*.ts"],
};

const baseDoc = swaggerJsDoc(swaggerOptions);

const apiDoc = createDocument({
	openapi: "3.0.0",
	info: { title: "API de Gestión de Activos", version: "1.0.0" },
	tags: [
		{
			name: "Auth",
			description: "Endpoints de autenticación y registro de usuarios",
		},
		{ name: "Activos", description: "Gestión de activos del sistema" },
		{ name: "Asignaciones", description: "Gestión de asignaciones de activos" },
		{ name: "Reportes", description: "Generación de reportes del sistema" },
		{ name: "Garantías", description: "Gestión de garantías de activos" },
		{ name: "Sistema", description: "Endpoints del sistema" },
		{ name: "Historial", description: "Historial de acciones de activos" },
		{
			name: "Configuración",
			description: "Configuración del sistema y perfil de usuario",
		},
		{ name: "Dashboard", description: "Resumen y alertas del sistema" },
	],
	paths: {
		"/api/health": {
			get: {
				summary: "Health check del servidor",
				tags: ["Sistema"],
				responses: {
					"200": {
						description: "Servidor funcionando correctamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										status: { type: "string", example: "ok" },
										uptime: { type: "number", example: 1234.56 },
										message: {
											type: "string",
											example:
												"Gestor de Activos Backend is running correctly!",
										},
										timestamp: {
											type: "string",
											example: "2026-05-26T17:00:00.000Z",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/auth/login": {
			post: {
				summary: "Inicia sesión de usuario y genera un token JWT",
				tags: ["Auth"],
				requestBody: {
					required: true,
					content: { "application/json": { schema: loginSchema } },
				},
				responses: {
					"200": {
						description: "Inicio de sesión exitoso",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Sesión iniciada correctamente",
										},
										token: {
											type: "string",
											example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
										},
										userData: {
											type: "object",
											properties: {
												id: { type: "integer", example: 1 },
												nombre: { type: "string", example: "Ivan Cruz" },
												rol: { type: "string", example: "Administrador" },
												email: {
													type: "string",
													example: "ivangtx10@gmail.com",
												},
											},
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"401": { description: "Credenciales inválidas" },
					"503": { description: "Servicio de autenticación no disponible" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/auth/registro": {
			post: {
				summary: "Registra un nuevo usuario en el sistema",
				tags: ["Auth"],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: { "application/json": { schema: registroSchema } },
				},
				responses: {
					"201": {
						description: "Usuario registrado exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Usuario registrado exitosamente",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"503": { description: "Servicio de autenticación no disponible" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/auth/test": {
			get: {
				summary: "Valida un token JWT y devuelve la información del usuario",
				tags: ["Auth"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Token válido",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: { type: "string" },
										user: { type: "object" },
									},
								},
							},
						},
					},
					"401": { description: "Token inválido o no proporcionado" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/gestion-activos/activos": {
			get: {
				summary: "Obtiene la lista de activos con paginación y filtros",
				tags: ["Activos"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Lista de activos obtenida",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: {
														type: "string",
														example: "Laptop Dell Latitude",
													},
													estado: { type: "string", example: "Asignado" },
													tipo_id: { type: "integer", example: 1 },
												},
											},
										},
										pagination: {
											type: "object",
											properties: {
												page: { type: "integer", example: 1 },
												limit: { type: "integer", example: 10 },
												total: { type: "integer", example: 21 },
												totalPages: { type: "integer", example: 3 },
											},
										},
									},
								},
							},
						},
					},
					"500": { description: "Error interno del servidor" },
				},
			},
			post: {
				summary: "Crea un nuevo activo con opción de garantía",
				tags: ["Activos"],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: { "application/json": { schema: createActivoSchema } },
				},
				responses: {
					"201": {
						description: "Activo creado exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "integer", example: 22 },
										message: {
											type: "string",
											example: "Activo creado exitosamente",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/gestion-activos/activos/{id}": {
			get: {
				summary: "Obtiene un activo por su ID",
				tags: ["Activos"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Activo encontrado",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "integer", example: 1 },
										nombre: { type: "string", example: "Laptop Dell Latitude" },
										estado: { type: "string", example: "Asignado" },
										tipo_id: { type: "integer", example: 1 },
										proveedor_id: { type: "integer", example: 1 },
										modelo: { type: "string", example: "Latitude 5420" },
									},
								},
							},
						},
					},
					"404": { description: "Activo no encontrado" },
					"500": { description: "Error interno del servidor" },
				},
			},
			put: {
				summary: "Actualiza un activo existente",
				tags: ["Activos"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				requestBody: {
					required: true,
					content: { "application/json": { schema: updateActivoSchema } },
				},
				responses: {
					"200": {
						description: "Activo actualizado exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Activo actualizado exitosamente",
										},
										cambios: {
											type: "string",
											example:
												"Nombre actualizado de Laptop Dell Latitude a Laptop Dell XPS",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"404": { description: "Activo no encontrado" },
					"500": { description: "Error interno del servidor" },
				},
			},
			delete: {
				summary: "Elimina físicamente un activo (valida asignaciones)",
				tags: ["Activos"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Activo eliminado exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Activo eliminado físicamente",
										},
									},
								},
							},
						},
					},
					"404": { description: "Activo no encontrado" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/gestion-activos/baja/{id}": {
			patch: {
				summary: "Da de baja lógicamente un activo (soft delete)",
				tags: ["Activos"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Activo dado de baja exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Activo dado de baja exitosamente",
										},
									},
								},
							},
						},
					},
					"400": {
						description: "El activo ya está dado de baja o tiene asignaciones",
					},
					"404": { description: "Activo no encontrado" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/gestion-activos/datos-auxiliares": {
			get: {
				summary: "Obtiene datos auxiliares para formularios",
				tags: ["Activos"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Datos auxiliares obtenidos",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										tipos: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: { type: "string", example: "Hardware" },
												},
											},
										},
										proveedores: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: { type: "string", example: "Dell México" },
												},
											},
										},
										ubicaciones: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: {
														type: "string",
														example: "Oficina Central",
													},
												},
											},
										},
										estados: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "string", example: "Disponible" },
													nombre: { type: "string", example: "Disponible" },
												},
											},
										},
										duenos: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: { type: "string", example: "Ivan Cruz" },
												},
											},
										},
									},
								},
							},
						},
					},
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/gestion-activos/validar-etiqueta-serial": {
			post: {
				summary: "Valida la disponibilidad de una etiqueta serial",
				tags: ["Activos"],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: { "application/json": { schema: validarEtiquetaSchema } },
				},
				responses: {
					"200": {
						description: "Etiqueta serial disponible",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "La etiqueta serial está disponible",
										},
									},
								},
							},
						},
					},
					"400": { description: "Etiqueta serial ya registrada" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/gestion-activos/activos/upload": {
			post: {
				summary: "Sube una imagen para un activo",
				tags: ["Activos"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Imagen subida exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										url: {
											type: "string",
											example:
												"https://assets.mgdc.site/nemi/abc123-imagen.jpg",
										},
									},
								},
							},
						},
					},
					"400": { description: "No se recibió ninguna imagen" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/asignaciones": {
			get: {
				summary: "Obtiene la lista de asignaciones con paginación",
				tags: ["Asignaciones"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Lista de asignaciones obtenida",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													activo: { type: "string", example: "Laptop Dell" },
													usuario: { type: "string", example: "Ivan Cruz" },
													fecha_asignacion: {
														type: "string",
														example: "2026-05-01",
													},
												},
											},
										},
										pagination: {
											type: "object",
											properties: {
												page: { type: "integer", example: 1 },
												limit: { type: "integer", example: 10 },
												total: { type: "integer", example: 4 },
											},
										},
									},
								},
							},
						},
					},
					"500": { description: "Error interno del servidor" },
				},
			},
			post: {
				summary: "Crea una nueva asignación de activo",
				tags: ["Asignaciones"],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: { "application/json": { schema: createAsignacionSchema } },
				},
				responses: {
					"201": {
						description: "Asignación creada exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "integer", example: 5 },
										message: {
											type: "string",
											example: "Asignación creada exitosamente",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"404": { description: "Activo, usuario o ubicación no encontrados" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/asignaciones/{id}": {
			get: {
				summary: "Obtiene una asignación por su ID",
				tags: ["Asignaciones"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Asignación encontrada",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "integer", example: 1 },
										activo_id: { type: "integer", example: 1 },
										usuario_id: { type: "integer", example: 1 },
										ubicacion_id: { type: "integer", example: 1 },
										fecha_asignacion: { type: "string", example: "2026-05-01" },
									},
								},
							},
						},
					},
					"404": { description: "Asignación no encontrada" },
					"500": { description: "Error interno del servidor" },
				},
			},
			put: {
				summary: "Actualiza una asignación existente",
				tags: ["Asignaciones"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				requestBody: {
					required: true,
					content: { "application/json": { schema: updateAsignacionSchema } },
				},
				responses: {
					"200": {
						description: "Asignación actualizada exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Asignación actualizada exitosamente",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"404": { description: "Asignación no encontrada" },
					"500": { description: "Error interno del servidor" },
				},
			},
			delete: {
				summary: "Elimina una asignación",
				tags: ["Asignaciones"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Asignación eliminada exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Asignación eliminada exitosamente",
										},
									},
								},
							},
						},
					},
					"404": { description: "Asignación no encontrada" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/asignaciones/activos-disponibles": {
			get: {
				summary: "Obtiene activos disponibles para asignar",
				tags: ["Asignaciones"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Activos disponibles obtenidos",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 2 },
													nombre: {
														type: "string",
														example: "Monitor Samsung",
													},
													estado: { type: "string", example: "Disponible" },
												},
											},
										},
									},
								},
							},
						},
					},
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/asignaciones/datos-auxiliares/{id}": {
			get: {
				summary: "Obtiene datos auxiliares para formulario de asignación",
				tags: ["Asignaciones"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: false,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Datos auxiliares obtenidos",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										usuarios: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: { type: "string", example: "Ivan Cruz" },
												},
											},
										},
										tiposActivos: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: { type: "string", example: "Hardware" },
												},
											},
										},
									},
								},
							},
						},
					},
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/reportes/tipos": {
			get: {
				summary: "Obtiene los tipos de reporte disponibles",
				tags: ["Reportes"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Tipos de reporte obtenidos",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										tiposReporte: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: {
														type: "string",
														example: "Activos por estado",
													},
													descripcion: {
														type: "string",
														example: "Agrupa activos por su estado actual",
													},
													activo: { type: "integer", example: 1 },
												},
											},
										},
									},
								},
							},
						},
					},
					"404": { description: "No existen tipos de reporte" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/reportes/datos-auxiliares": {
			get: {
				summary: "Obtiene datos auxiliares para generar reportes",
				tags: ["Reportes"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Datos auxiliares obtenidos",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										tiposActivo: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: { type: "string", example: "Hardware" },
												},
											},
										},
										usuarios: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													nombre: { type: "string", example: "Ivan Cruz" },
												},
											},
										},
									},
								},
							},
						},
					},
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/reportes/generar": {
			post: {
				summary: "Genera un reporte según el tipo seleccionado",
				tags: ["Reportes"],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: { "application/json": { schema: generarReporteSchema } },
				},
				responses: {
					"200": {
						description: "Reporte generado exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Reporte generado exitosamente",
										},
										tipo_reporte: {
											type: "string",
											example: "Activos por estado",
										},
										resultados: {
											type: "array",
											items: {
												type: "object",
												properties: {
													estado: { type: "string", example: "Disponible" },
													cantidad: { type: "integer", example: 7 },
												},
											},
										},
									},
								},
							},
						},
					},
					"400": { description: "Tipo de reporte inválido" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/garantias": {
			get: {
				summary: "Obtiene la lista de garantías con paginación",
				tags: ["Garantías"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Lista de garantías obtenida",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: { type: "array", items: { type: "object" } },
										pagination: { type: "object" },
									},
								},
							},
						},
					},
					"500": { description: "Error interno del servidor" },
				},
			},
			post: {
				summary: "Registra una nueva garantía para un activo",
				tags: ["Garantías"],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: { "application/json": { schema: createGarantiaSchema } },
				},
				responses: {
					"201": {
						description: "Garantía registrada exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "integer", example: 1 },
										message: {
											type: "string",
											example: "Garantía registrada correctamente",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"404": { description: "Activo o proveedor no encontrados" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/garantias/{id}": {
			put: {
				summary: "Actualiza una garantía existente",
				tags: ["Garantías"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				requestBody: {
					required: true,
					content: { "application/json": { schema: updateGarantiaSchema } },
				},
				responses: {
					"200": {
						description: "Garantía actualizada exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Garantía actualizada correctamente",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"404": { description: "Garantía no encontrada" },
					"500": { description: "Error interno del servidor" },
				},
			},
			delete: {
				summary: "Elimina físicamente una garantía",
				tags: ["Garantías"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Garantía eliminada exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Garantía eliminada físicamente",
										},
									},
								},
							},
						},
					},
					"404": { description: "Garantía no encontrada" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/historial/activos/{id}": {
			get: {
				summary: "Obtiene el historial de un activo con paginación y filtros",
				tags: ["Historial"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Historial obtenido",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: { type: "array", items: { type: "object" } },
										pagination: {
											type: "object",
											properties: {
												page: { type: "integer", example: 1 },
												limit: { type: "integer", example: 10 },
												total: { type: "integer", example: 7 },
												totalPages: { type: "integer", example: 1 },
											},
										},
									},
								},
							},
						},
					},
					"400": { description: "ID inválido" },
					"404": { description: "Activo no encontrado" },
					"500": { description: "Error interno del servidor" },
				},
			},
			post: {
				summary: "Registra una nueva acción en el historial de un activo",
				tags: ["Historial"],
				security: [{ bearerAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				requestBody: {
					required: true,
					content: { "application/json": { schema: registrarAccionSchema } },
				},
				responses: {
					"201": {
						description: "Acción registrada exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example:
												"Acción registrada correctamente en el historial.",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"404": { description: "Activo no encontrado" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/historial/filtros-auxiliares": {
			get: {
				summary: "Obtiene filtros auxiliares para el historial",
				tags: ["Historial"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Filtros auxiliares obtenidos",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										acciones: { type: "array", items: { type: "object" } },
										usuarios: { type: "array", items: { type: "object" } },
									},
								},
							},
						},
					},
					"404": { description: "No se encontraron datos" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/configuracion/aplicacion": {
			get: {
				summary: "Obtiene la configuración global de la aplicación",
				tags: ["Configuración"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Configuración obtenida",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										idioma: { type: "string", example: "es" },
										zona_horaria: { type: "string", example: "UTC-5" },
										formato_fecha: { type: "string", example: "DD/MM/YYYY" },
										formato_moneda: { type: "string", example: "USD" },
									},
								},
							},
						},
					},
					"404": { description: "Configuración no encontrada" },
					"500": { description: "Error interno del servidor" },
				},
			},
			put: {
				summary: "Actualiza la configuración global de la aplicación",
				tags: ["Configuración"],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: { "application/json": { schema: updateConfigSchema } },
				},
				responses: {
					"200": {
						description: "Configuración actualizada exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Configuración global actualizada correctamente",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/configuracion/perfil": {
			get: {
				summary: "Obtiene el perfil del usuario autenticado",
				tags: ["Configuración"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Perfil obtenido",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										nombre: { type: "string", example: "Ivan Cruz" },
										email: { type: "string", example: "ivangtx10@gmail.com" },
										departamento: { type: "string", example: "TI" },
										foto_url: { type: "string", example: null },
									},
								},
							},
						},
					},
					"400": { description: "ID de usuario no proporcionado" },
					"404": { description: "Usuario no encontrado" },
					"500": { description: "Error interno del servidor" },
				},
			},
			put: {
				summary: "Actualiza el perfil del usuario autenticado",
				tags: ["Configuración"],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: { "application/json": { schema: updatePerfilSchema } },
				},
				responses: {
					"200": {
						description: "Perfil actualizado exitosamente",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										message: {
											type: "string",
											example: "Datos del perfil actualizados correctamente.",
										},
									},
								},
							},
						},
					},
					"400": { description: "Error en la validación de datos" },
					"401": { description: "Contraseña actual incorrecta" },
					"404": { description: "Usuario no encontrado" },
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/dashboard/resumen": {
			get: {
				summary: "Obtiene el resumen del dashboard con estadísticas",
				tags: ["Dashboard"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Resumen del dashboard obtenido",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										total_activos: { type: "integer", example: 21 },
										activos_disponibles: { type: "integer", example: 7 },
										activos_asignados: { type: "integer", example: 13 },
										activos_en_mantenimiento: { type: "integer", example: 1 },
									},
								},
							},
						},
					},
					"500": { description: "Error interno del servidor" },
				},
			},
		},
		"/api/dashboard/alertas": {
			get: {
				summary: "Obtiene las alertas del dashboard",
				tags: ["Dashboard"],
				security: [{ bearerAuth: [] }],
				responses: {
					"200": {
						description: "Alertas obtenidas",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										licencias_proximas_a_vencer: {
											type: "integer",
											example: 1,
										},
										garantias_proximas_a_expirar: {
											type: "integer",
											example: 0,
										},
										activos_en_mantenimiento: { type: "integer", example: 1 },
									},
								},
							},
						},
					},
					"500": { description: "Error interno del servidor" },
				},
			},
		},
	},
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description: "Ingrese el token JWT en el formato 'Bearer {token}'",
			},
		},
		schemas: {
			LoginRequest: loginSchema,
			RegistroRequest: registroSchema,
			CreateActivoRequest: createActivoSchema,
			UpdateActivoRequest: updateActivoSchema,
			ValidarEtiquetaRequest: validarEtiquetaSchema,
			CreateAsignacionRequest: createAsignacionSchema,
			UpdateAsignacionRequest: updateAsignacionSchema,
			GenerarReporteRequest: generarReporteSchema,
			CreateGarantiaRequest: createGarantiaSchema,
			UpdateGarantiaRequest: updateGarantiaSchema,
			RegistrarAccionRequest: registrarAccionSchema,
			UpdateConfigRequest: updateConfigSchema,
			UpdatePerfilRequest: updatePerfilSchema,
		},
	},
});

const paths = { ...baseDoc.paths, ...apiDoc.paths };

const swaggerDocs = createDocument({
	openapi: "3.0.0",
	info: baseDoc.info,
	servers: baseDoc.servers,
	tags: apiDoc.tags,
	components: apiDoc.components as Record<string, unknown>,
	paths,
});

export { swaggerDocs, swaggerUi };
