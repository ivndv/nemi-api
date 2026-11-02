import {
	and,
	asc,
	count,
	desc,
	eq,
	isNull,
	like,
	ne,
	or,
	sql,
} from "drizzle-orm";
import db from "../config/db.js";
import {
	activos,
	asignaciones,
	garantias,
	licencias,
	mantenimientos,
	personas,
	proveedores,
	tiposActivo,
	ubicaciones,
} from "../db/schema.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import {
	codigoCondicion,
	codigoEstado,
	estadoGarantia,
	etiquetaCondicion,
	etiquetaEstado,
} from "./presentacion.js";
import * as r2Service from "./r2Service.js";
import { fechaHoyEnZona } from "./zonaHoraria.js";

// Modalidad y tipo de uso inferidos del texto libre de licencia
function inferirLicencia(tipoLicencia?: string) {
	const texto = (tipoLicencia ?? "").toLowerCase();
	const perpetua = texto.includes("oem") || texto.includes("perpetu");
	const dispositivo = texto.includes("oem") || texto.includes("dispositivo");
	const mensual = texto.includes("mensual");
	const anual = texto.includes("anual") || texto.includes("suscrip");

	return {
		modalidad: (perpetua ? "perpetua" : "suscripcion") as
			| "perpetua"
			| "suscripcion",
		tipo_uso: (dispositivo ? "dispositivo" : "usuario") as
			| "dispositivo"
			| "usuario",
		periodicidad: (perpetua
			? "unica"
			: mensual
				? "mensual"
				: anual
					? "anual"
					: "anual") as "mensual" | "anual" | "unica",
	};
}

// Consultas de activos

export async function getActivos(
	queryParams_: {
		page?: number;
		limit?: number;
		orden?: string;
		search?: string;
		tipo?: string;
		estado?: string;
		ubicacion?: string;
		usuario_asignado?: string;
		licencia_proxima?: string;
		garantia_proxima?: string;
		fecha_devolucion_proxima?: string;
		fecha_inicio?: string;
		fecha_fin?: string;
	},
	personaId?: number,
) {
	const page = Number(queryParams_.page) || 1;
	const limit = Math.min(Number(queryParams_.limit) || 10, 100);
	const offset = (page - 1) * limit;

	const orden = queryParams_.orden || "asc";
	const direccion = orden.toLowerCase() === "desc" ? "DESC" : "ASC";

	const {
		search = "",
		tipo,
		estado,
		ubicacion,
		usuario_asignado,
		licencia_proxima,
		garantia_proxima,
		fecha_devolucion_proxima,
		fecha_inicio,
		fecha_fin,
	} = queryParams_;

	const hoy = fechaHoyEnZona();
	const condiciones = [isNull(activos.deleted_at)];

	if (search) {
		const condicion = or(
			like(activos.nombre, `%${search}%`),
			like(activos.descripcion, `%${search}%`),
			sql`CAST(${activos.id} AS CHAR) LIKE ${`%${search}%`}`,
		);
		if (condicion) condiciones.push(condicion);
	}

	if (tipo) condiciones.push(eq(activos.tipo_id, Number(tipo)));

	const codigoEstadoFiltro = codigoEstado(estado);
	if (codigoEstadoFiltro) {
		condiciones.push(
			eq(
				activos.estado,
				codigoEstadoFiltro as "disponible" | "asignado" | "mantenimiento",
			),
		);
	}

	if (ubicacion) condiciones.push(eq(activos.ubicacion_id, Number(ubicacion)));

	if (usuario_asignado) {
		condiciones.push(
			sql`EXISTS (SELECT 1 FROM asignaciones s
			      WHERE s.activo_id = ${activos.id}
			        AND s.persona_id = ${Number(usuario_asignado)}
			        AND s.fecha_devolucion_real IS NULL)`,
		);
	}

	// Un empleado solo ve los activos que tiene asignados
	if (personaId) {
		condiciones.push(
			sql`EXISTS (SELECT 1 FROM asignaciones s
			      WHERE s.activo_id = ${activos.id}
			        AND s.persona_id = ${personaId}
			        AND s.fecha_devolucion_real IS NULL)`,
		);
	}

	if (licencia_proxima === "true") {
		condiciones.push(
			sql`EXISTS (SELECT 1 FROM licencias l
			      WHERE l.activo_id = ${activos.id}
			        AND l.fecha_renovacion BETWEEN ${fecha_inicio ?? hoy} AND ${fecha_fin ?? sql`DATE_ADD(${hoy}, INTERVAL 30 DAY)`})`,
		);
	}

	if (garantia_proxima === "true") {
		condiciones.push(
			sql`EXISTS (SELECT 1 FROM garantias g
			      WHERE g.activo_id = ${activos.id}
			        AND g.deleted_at IS NULL
			        AND g.fecha_fin BETWEEN ${hoy} AND DATE_ADD(${hoy}, INTERVAL 30 DAY))`,
		);
	}

	if (fecha_devolucion_proxima === "true") {
		condiciones.push(
			sql`EXISTS (SELECT 1 FROM asignaciones s
			      WHERE s.activo_id = ${activos.id}
			        AND s.fecha_devolucion_real IS NULL
			        AND s.fecha_devolucion_pactada BETWEEN ${fecha_inicio ?? hoy} AND ${fecha_fin ?? sql`DATE_ADD(${hoy}, INTERVAL 30 DAY)`})`,
		);
	}

	const seleccion = {
		id: activos.id,
		nombre: activos.nombre,
		tipo_id: activos.tipo_id,
		proveedor_id: activos.proveedor_id,
		ubicacion_id: activos.ubicacion_id,
		dueno_id: activos.dueno_id,
		etiqueta_serial: activos.etiqueta_serial,
		estado: activos.estado,
		condicion: activos.condicion,
		fecha_adquisicion: activos.fecha_adquisicion,
		valor_compra: activos.valor_compra,
		modelo: activos.modelo,
		descripcion: activos.descripcion,
		foto_url: activos.foto_url,
		created_at: activos.created_at,
		tipo: tiposActivo.nombre,
		proveedor: proveedores.nombre,
		ubicacion: ubicaciones.nombre,
		usuario_asignado: personas.nombre,
		licencia_modalidad: licencias.modalidad,
		licencia_fecha_renovacion: licencias.fecha_renovacion,
		licencia_costo: licencias.costo,
	};

	const filas = await db
		.select(seleccion)
		.from(activos)
		.leftJoin(tiposActivo, eq(activos.tipo_id, tiposActivo.id))
		.leftJoin(proveedores, eq(activos.proveedor_id, proveedores.id))
		.leftJoin(ubicaciones, eq(activos.ubicacion_id, ubicaciones.id))
		.leftJoin(
			asignaciones,
			and(
				eq(asignaciones.activo_id, activos.id),
				isNull(asignaciones.fecha_devolucion_real),
			),
		)
		.leftJoin(personas, eq(asignaciones.persona_id, personas.id))
		.leftJoin(licencias, eq(licencias.activo_id, activos.id))
		.where(and(...condiciones))
		.orderBy(direccion === "DESC" ? desc(activos.id) : asc(activos.id))
		.limit(limit)
		.offset(offset);

	const [totalResult] = await db
		.select({ total: count() })
		.from(activos)
		.where(and(...condiciones));

	const total = Number(totalResult.total);

	const data = filas.map((fila) => ({
		id: fila.id,
		nombre: fila.nombre,
		foto_url: fila.foto_url,
		estado: fila.estado,
		estado_label: etiquetaEstado(fila.estado),
		condicion: fila.condicion,
		condicion_label: etiquetaCondicion(fila.condicion),
		condicion_fisica: etiquetaCondicion(fila.condicion),
		tipo: fila.tipo,
		tipo_id: fila.tipo_id,
		ubicacion: fila.ubicacion,
		ubicacion_id: fila.ubicacion_id,
		usuario_asignado: fila.usuario_asignado ?? undefined,
		proveedor: fila.proveedor,
		proveedor_id: fila.proveedor_id,
		dueno_id: fila.dueno_id,
		etiqueta_serial: fila.etiqueta_serial,
		fecha_adquisicion: fila.fecha_adquisicion,
		valor_compra: fila.valor_compra,
		modelo: fila.modelo,
		descripcion: fila.descripcion,
		fecha_registro: fila.created_at,
		tipo_licencia: fila.licencia_modalidad,
		fecha_vencimiento_licencia: fila.licencia_fecha_renovacion,
		costo_mensual: fila.licencia_costo,
	}));

	return {
		data,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
}

// Obtiene un activo por su ID con sus relaciones
export async function getActivoById(id: string, personaId?: number) {
	if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
		throw new ErrorHttp(400, "ID inválido");
	}

	const [fila] = await db
		.select({
			id: activos.id,
			nombre: activos.nombre,
			estado: activos.estado,
			condicion: activos.condicion,
			fecha_adquisicion: activos.fecha_adquisicion,
			valor_compra: activos.valor_compra,
			descripcion: activos.descripcion,
			foto_url: activos.foto_url,
			ubicacion_id: activos.ubicacion_id,
			modelo: activos.modelo,
			etiqueta_serial: activos.etiqueta_serial,
			created_at: activos.created_at,
			updated_at: activos.updated_at,
			tipo_id: tiposActivo.id,
			tipo_nombre: tiposActivo.nombre,
			proveedor_id: proveedores.id,
			proveedor_nombre: proveedores.nombre,
			ubicacion_nombre: ubicaciones.nombre,
			dueno_id: personas.id,
			dueno_nombre: personas.nombre,
			licencia_modalidad: licencias.modalidad,
			licencia_uso: licencias.tipo_uso,
			licencia_asientos: licencias.asientos_comprados,
			licencia_costo: licencias.costo,
			licencia_renovacion: licencias.fecha_renovacion,
		})
		.from(activos)
		.leftJoin(tiposActivo, eq(activos.tipo_id, tiposActivo.id))
		.leftJoin(proveedores, eq(activos.proveedor_id, proveedores.id))
		.leftJoin(ubicaciones, eq(activos.ubicacion_id, ubicaciones.id))
		.leftJoin(personas, eq(activos.dueno_id, personas.id))
		.leftJoin(licencias, eq(licencias.activo_id, activos.id))
		.where(eq(activos.id, Number(id)))
		.limit(1);

	if (!fila) {
		throw new ErrorHttp(404, "Activo no encontrado");
	}

	const [asignacionActiva] = await db
		.select({ persona_id: asignaciones.persona_id })
		.from(asignaciones)
		.where(
			and(
				eq(asignaciones.activo_id, Number(id)),
				isNull(asignaciones.fecha_devolucion_real),
			),
		)
		.limit(1);

	const garantiasActivo = await db
		.select({
			id: garantias.id,
			nombre_garantia: garantias.nombre,
			proveedor_id: proveedores.id,
			proveedor_nombre: proveedores.nombre,
			fecha_inicio: garantias.fecha_inicio,
			fecha_fin: garantias.fecha_fin,
			descripcion: garantias.descripcion,
			costo: garantias.costo,
			condiciones: garantias.condiciones,
		})
		.from(garantias)
		.leftJoin(proveedores, eq(garantias.proveedor_id, proveedores.id))
		.where(
			and(eq(garantias.activo_id, Number(id)), isNull(garantias.deleted_at)),
		);

	// Un empleado solo puede ver un activo que tenga asignado
	if (personaId && asignacionActiva?.persona_id !== personaId) {
		throw new ErrorHttp(403, "No autorizado para ver este activo");
	}

	return {
		id: fila.id,
		nombre: fila.nombre,
		tipo: { id: fila.tipo_id, nombre: fila.tipo_nombre },
		estado: fila.estado,
		estado_label: etiquetaEstado(fila.estado),
		condicion: fila.condicion,
		condicion_label: etiquetaCondicion(fila.condicion),
		condicion_fisica: etiquetaCondicion(fila.condicion),
		fecha_adquisicion: fila.fecha_adquisicion,
		valor_compra: fila.valor_compra,
		valor_actual: fila.valor_compra,
		descripcion: fila.descripcion,
		foto_url: fila.foto_url,
		ubicacion: { id: fila.ubicacion_id, nombre: fila.ubicacion_nombre },
		ubicacion_id: fila.ubicacion_id,
		usuario_asignado_id: asignacionActiva?.persona_id ?? null,
		fecha_creacion: fila.created_at,
		fecha_actualizacion: fila.updated_at,
		fecha_registro: fila.created_at,
		dueno: { id: fila.dueno_id, nombre: fila.dueno_nombre },
		proveedor: { id: fila.proveedor_id, nombre: fila.proveedor_nombre },
		modelo: fila.modelo,
		version_software: null,
		tipo_licencia: fila.licencia_modalidad,
		etiqueta_serial: fila.etiqueta_serial,
		fecha_vencimiento_licencia: fila.licencia_renovacion,
		costo_mensual: fila.licencia_costo,
		recursos_asignados: null,
		garantia: garantiasActivo.map((garantia) => ({
			id: garantia.id,
			nombre_garantia: garantia.nombre_garantia,
			proveedor: {
				id: garantia.proveedor_id,
				nombre: garantia.proveedor_nombre,
			},
			fecha_inicio: garantia.fecha_inicio,
			fecha_fin: garantia.fecha_fin,
			estado_garantia: estadoGarantia(garantia.fecha_fin),
			estado: estadoGarantia(garantia.fecha_fin),
			descripcion: garantia.descripcion,
			costo: garantia.costo,
			condiciones: garantia.condiciones,
		})),
	};
}

// Creación de activos

export async function createActivo(
	input: {
		nombre: string;
		tipo_id: number;
		fecha_adquisicion: string;
		valor_compra: number;
		estado: string;
		proveedor_id: number;
		ubicacion_id?: number;
		modelo?: string;
		version_software?: string;
		tipo_licencia?: string;
		fecha_vencimiento_licencia?: string;
		costo_mensual?: number;
		recursos_asignados?: string;
		dueno_id?: number;
		etiqueta_serial?: string;
		condicion_fisica?: string;
		descripcion?: string;
		nombre_garantia?: string;
		proveedor_garantia_id?: number;
		fecha_inicio?: string;
		fecha_fin?: string;
		costo?: number;
		condiciones?: string;
		estado_garantia?: string;
		descripcion_garantia?: string;
	},
	file?: Express.Multer.File,
	usuarioResponsableId?: number,
) {
	const {
		nombre,
		tipo_id,
		fecha_adquisicion,
		valor_compra,
		estado,
		proveedor_id,
		ubicacion_id,
		modelo,
		version_software,
		tipo_licencia,
		fecha_vencimiento_licencia,
		costo_mensual,
		recursos_asignados,
		dueno_id,
		etiqueta_serial,
		condicion_fisica,
		descripcion,
		nombre_garantia,
		proveedor_garantia_id,
		fecha_inicio,
		fecha_fin,
		costo,
		condiciones,
		descripcion_garantia,
	} = input;

	let foto_url: string | null = null;
	if (file) {
		const key = r2Service.generarClave(nombre, file.mimetype);
		const result = await r2Service.subirAR2(file.buffer, key, file.mimetype);
		foto_url = result.url;
	}

	if (etiqueta_serial) {
		const [existente] = await db
			.select({ id: activos.id })
			.from(activos)
			.where(
				and(
					eq(activos.etiqueta_serial, etiqueta_serial),
					isNull(activos.deleted_at),
				),
			)
			.limit(1);

		if (existente) {
			throw new ErrorHttp(409, "La etiqueta serial ya está registrada");
		}
	}

	const datosGarantia = Boolean(
		nombre_garantia ||
			proveedor_garantia_id ||
			fecha_inicio ||
			fecha_fin ||
			costo ||
			condiciones ||
			descripcion_garantia,
	);

	if (
		datosGarantia &&
		(!nombre_garantia || !proveedor_garantia_id || !fecha_inicio || !fecha_fin)
	) {
		throw new ErrorHttp(400, "Datos incompletos para la garantía");
	}

	if (
		datosGarantia &&
		new Date(fecha_fin as string) <= new Date(fecha_inicio as string)
	) {
		throw new ErrorHttp(
			400,
			"La fecha de fin debe ser posterior a la de inicio",
		);
	}

	const [tipo] = await db
		.select({ categoria: tiposActivo.categoria })
		.from(tiposActivo)
		.where(eq(tiposActivo.id, tipo_id))
		.limit(1);

	const esLicencia =
		tipo?.categoria === "licencia" ||
		tipo?.categoria === "software" ||
		tipo?.categoria === "servicio" ||
		Boolean(tipo_licencia || fecha_vencimiento_licencia || costo_mensual);

	return await db.transaction(async (tx) => {
		const [creado] = await tx
			.insert(activos)
			.values({
				nombre,
				tipo_id,
				proveedor_id,
				ubicacion_id: ubicacion_id ?? null,
				dueno_id: dueno_id ?? null,
				etiqueta_serial: etiqueta_serial || null,
				estado: (codigoEstado(estado) ?? "disponible") as
					| "disponible"
					| "asignado"
					| "mantenimiento",
				condicion: (codigoCondicion(condicion_fisica) ?? "nuevo") as
					| "nuevo"
					| "usado"
					| "danado",
				fecha_adquisicion: fecha_adquisicion || null,
				valor_compra: valor_compra != null ? String(valor_compra) : null,
				modelo: modelo || null,
				descripcion: descripcion || null,
				foto_url,
			})
			.$returningId();

		if (esLicencia) {
			const inferida = inferirLicencia(tipo_licencia);
			await tx.insert(licencias).values({
				activo_id: creado.id,
				modalidad: inferida.modalidad,
				tipo_uso: inferida.tipo_uso,
				asientos_comprados: 1,
				costo: costo_mensual != null ? String(costo_mensual) : null,
				periodicidad_costo: inferida.periodicidad,
				fecha_renovacion: fecha_vencimiento_licencia || null,
			});
		}

		if (datosGarantia) {
			await tx.insert(garantias).values({
				activo_id: creado.id,
				proveedor_id: proveedor_garantia_id as number,
				nombre: nombre_garantia as string,
				fecha_inicio: fecha_inicio as string,
				fecha_fin: fecha_fin as string,
				costo: costo != null ? String(costo) : null,
				condiciones: condiciones || null,
				descripcion: descripcion_garantia || null,
			});
		}

		await registrarEvento(tx, {
			entidad: "activo",
			entidad_id: creado.id,
			accion: "activo.creado",
			actor_id: usuarioResponsableId ?? null,
			nuevos: {
				nombre,
				tipo_id,
				estado: codigoEstado(estado) ?? "disponible",
				etiqueta_serial: etiqueta_serial ?? null,
			},
		});

		return { id: creado.id, esLicencia, recursos_asignados, version_software };
	});
}

// Actualización de activos

export async function updateActivo(
	id: string,
	input: {
		nombre?: string;
		tipo_id?: number;
		fecha_adquisicion?: string;
		valor_compra?: number;
		etiqueta_serial?: string;
		descripcion?: string;
		estado?: string;
		proveedor_id?: number;
		ubicacion_id?: number;
		foto_url?: string;
		modelo?: string;
		version_software?: string;
		tipo_licencia?: string;
		fecha_vencimiento_licencia?: string;
		costo_mensual?: number;
		recursos_asignados?: string;
		dueno_id?: number;
		condicion_fisica?: string;
		nombre_garantia?: string;
		proveedor_garantia_id?: number;
		fecha_inicio?: string;
		fecha_fin?: string;
		estado_garantia?: string;
		descripcion_garantia?: string;
		costo?: number;
		condiciones?: string;
	},
	file?: Express.Multer.File,
	usuarioResponsableId?: number,
) {
	const [existente] = await db
		.select()
		.from(activos)
		.where(eq(activos.id, Number(id)))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "Activo no encontrado");
	}

	let foto_url = input.foto_url ?? existente.foto_url;
	if (file) {
		const key = r2Service.generarClave(
			input.nombre || existente.nombre,
			file.mimetype,
		);
		const resultado = await r2Service.subirAR2(file.buffer, key, file.mimetype);
		foto_url = resultado.url;
	}

	if (input.etiqueta_serial) {
		const [serialExistente] = await db
			.select({ id: activos.id })
			.from(activos)
			.where(
				and(
					eq(activos.etiqueta_serial, input.etiqueta_serial),
					ne(activos.id, Number(id)),
					isNull(activos.deleted_at),
				),
			)
			.limit(1);

		if (serialExistente) {
			throw new ErrorHttp(409, "La etiqueta serial ya está registrada");
		}
	}

	const cambios: Partial<typeof activos.$inferInsert> = {};
	if (input.nombre !== undefined) cambios.nombre = input.nombre;
	if (input.tipo_id !== undefined) cambios.tipo_id = input.tipo_id;
	if (input.fecha_adquisicion !== undefined) {
		cambios.fecha_adquisicion = input.fecha_adquisicion || null;
	}
	if (input.valor_compra !== undefined) {
		cambios.valor_compra =
			input.valor_compra != null ? String(input.valor_compra) : null;
	}
	if (input.etiqueta_serial !== undefined) {
		cambios.etiqueta_serial = input.etiqueta_serial || null;
	}
	if (input.descripcion !== undefined)
		cambios.descripcion = input.descripcion || null;
	if (input.proveedor_id !== undefined)
		cambios.proveedor_id = input.proveedor_id;
	if (input.ubicacion_id !== undefined)
		cambios.ubicacion_id = input.ubicacion_id;
	if (input.dueno_id !== undefined) cambios.dueno_id = input.dueno_id;
	if (input.modelo !== undefined) cambios.modelo = input.modelo || null;
	if (input.condicion_fisica !== undefined) {
		cambios.condicion = (codigoCondicion(input.condicion_fisica) ?? "nuevo") as
			| "nuevo"
			| "usado"
			| "danado";
	}
	if (input.estado !== undefined) {
		cambios.estado = (codigoEstado(input.estado) ?? "disponible") as
			| "disponible"
			| "asignado"
			| "mantenimiento";
	}
	if (foto_url !== existente.foto_url) cambios.foto_url = foto_url;

	const [licenciaExistente] = await db
		.select()
		.from(licencias)
		.where(eq(licencias.activo_id, Number(id)))
		.limit(1);

	const tocaLicencia =
		input.tipo_licencia !== undefined ||
		input.fecha_vencimiento_licencia !== undefined ||
		input.costo_mensual !== undefined;

	if (Object.keys(cambios).length === 0 && !tocaLicencia) {
		throw new ErrorHttp(400, "No se proporcionaron datos para actualizar");
	}

	await db.transaction(async (tx) => {
		if (Object.keys(cambios).length > 0) {
			await tx
				.update(activos)
				.set(cambios)
				.where(eq(activos.id, Number(id)));
		}

		if (tocaLicencia && licenciaExistente) {
			const inferida = inferirLicencia(input.tipo_licencia);
			await tx
				.update(licencias)
				.set({
					...(input.tipo_licencia !== undefined && {
						modalidad: inferida.modalidad,
						tipo_uso: inferida.tipo_uso,
						periodicidad_costo: inferida.periodicidad,
					}),
					...(input.costo_mensual !== undefined && {
						costo:
							input.costo_mensual != null ? String(input.costo_mensual) : null,
					}),
					...(input.fecha_vencimiento_licencia !== undefined && {
						fecha_renovacion: input.fecha_vencimiento_licencia || null,
					}),
				})
				.where(eq(licencias.activo_id, Number(id)));
		}

		if (
			input.nombre_garantia &&
			input.proveedor_garantia_id &&
			input.fecha_inicio &&
			input.fecha_fin
		) {
			if (new Date(input.fecha_fin) <= new Date(input.fecha_inicio)) {
				throw new ErrorHttp(
					400,
					"La fecha de fin debe ser posterior a la de inicio",
				);
			}

			const [garantiaExistente] = await tx
				.select({ id: garantias.id })
				.from(garantias)
				.where(
					and(
						eq(garantias.activo_id, Number(id)),
						isNull(garantias.deleted_at),
					),
				)
				.limit(1);

			const datos = {
				proveedor_id: input.proveedor_garantia_id,
				nombre: input.nombre_garantia,
				fecha_inicio: input.fecha_inicio,
				fecha_fin: input.fecha_fin,
				costo: input.costo != null ? String(input.costo) : null,
				condiciones: input.condiciones || null,
				descripcion: input.descripcion_garantia || null,
			};

			if (garantiaExistente) {
				await tx
					.update(garantias)
					.set(datos)
					.where(eq(garantias.id, garantiaExistente.id));
			} else {
				await tx.insert(garantias).values({
					activo_id: Number(id),
					...datos,
				});
			}
		}

		await registrarEvento(tx, {
			entidad: "activo",
			entidad_id: Number(id),
			accion: "activo.actualizado",
			actor_id: usuarioResponsableId ?? null,
			anteriores: {
				nombre: existente.nombre,
				estado: existente.estado,
				ubicacion_id: existente.ubicacion_id,
			},
			nuevos: {
				nombre: cambios.nombre ?? existente.nombre,
				estado: cambios.estado ?? existente.estado,
				ubicacion_id: cambios.ubicacion_id ?? existente.ubicacion_id,
			},
		});
	});

	return { id: Number(id), cambios };
}

// Baja lógica (archivado)

export async function deleteActivo(id: string, usuarioResponsableId?: number) {
	const [existente] = await db
		.select({ id: activos.id, nombre: activos.nombre })
		.from(activos)
		.where(and(eq(activos.id, Number(id)), isNull(activos.deleted_at)))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "Activo no encontrado");
	}

	await verificarBajaPermitida(Number(id));

	await db.transaction(async (tx) => {
		await tx
			.update(activos)
			.set({ deleted_at: new Date() })
			.where(eq(activos.id, Number(id)));

		await registrarEvento(tx, {
			entidad: "activo",
			entidad_id: Number(id),
			accion: "activo.baja",
			actor_id: usuarioResponsableId ?? null,
			nuevos: { nombre: existente.nombre, motivo: "eliminación" },
		});
	});
}

// Reglas comunes para dar de baja
async function verificarBajaPermitida(activoId: number) {
	const [asignacionActiva] = await db
		.select({ id: asignaciones.id })
		.from(asignaciones)
		.where(
			and(
				eq(asignaciones.activo_id, activoId),
				isNull(asignaciones.fecha_devolucion_real),
			),
		)
		.limit(1);

	if (asignacionActiva) {
		throw new ErrorHttp(
			400,
			"No se puede dar de baja: el activo tiene una asignación activa",
		);
	}

	const [mantenimientoAbierto] = await db
		.select({ id: mantenimientos.id })
		.from(mantenimientos)
		.where(
			and(
				eq(mantenimientos.activo_id, activoId),
				eq(mantenimientos.estado, "abierto"),
			),
		)
		.limit(1);

	if (mantenimientoAbierto) {
		throw new ErrorHttp(
			400,
			"No se puede dar de baja: el activo tiene un mantenimiento abierto",
		);
	}
}

export async function darDeBajaActivo(
	id: string,
	usuarioResponsableId?: number,
) {
	const [existente] = await db
		.select({
			id: activos.id,
			nombre: activos.nombre,
			deleted_at: activos.deleted_at,
		})
		.from(activos)
		.where(eq(activos.id, Number(id)))
		.limit(1);

	if (!existente) {
		throw new ErrorHttp(404, "Activo no encontrado");
	}

	if (existente.deleted_at) {
		throw new ErrorHttp(
			400,
			`El activo "${existente.nombre}" ya está dado de baja`,
		);
	}

	await verificarBajaPermitida(Number(id));

	await db.transaction(async (tx) => {
		await tx
			.update(activos)
			.set({ deleted_at: new Date() })
			.where(eq(activos.id, Number(id)));

		await registrarEvento(tx, {
			entidad: "activo",
			entidad_id: Number(id),
			accion: "activo.baja",
			actor_id: usuarioResponsableId ?? null,
			nuevos: { nombre: existente.nombre },
		});
	});
}

// Datos auxiliares y utilerías

export async function obtenerDatosAuxiliares() {
	const tipos = await db
		.select({ id: tiposActivo.id, nombre: tiposActivo.nombre })
		.from(tiposActivo);

	const proveedoresList = await db
		.select({ id: proveedores.id, nombre: proveedores.nombre })
		.from(proveedores);

	const ubicacionesList = await db
		.select({ id: ubicaciones.id, nombre: ubicaciones.nombre })
		.from(ubicaciones);

	const duenos = await db
		.select({ id: personas.id, nombre: personas.nombre })
		.from(personas)
		.where(isNull(personas.deleted_at));

	const estados = [
		{ id: "Disponible", nombre: "Disponible" },
		{ id: "Asignado", nombre: "Asignado" },
		{ id: "En mantenimiento", nombre: "En mantenimiento" },
	];

	return {
		tipos,
		tiposActivos: tipos,
		proveedores: proveedoresList,
		proveedoresGarantia: proveedoresList,
		ubicaciones: ubicacionesList,
		duenos,
		usuarios: duenos,
		estados,
	};
}

export async function validarEtiquetaSerial(etiqueta_serial: string) {
	if (!etiqueta_serial) {
		throw new ErrorHttp(400, "La etiqueta serial es obligatoria");
	}

	const [existente] = await db
		.select({ id: activos.id })
		.from(activos)
		.where(
			and(
				eq(activos.etiqueta_serial, etiqueta_serial),
				isNull(activos.deleted_at),
			),
		)
		.limit(1);

	return !existente;
}

export async function subirImagen(fileBuffer: Buffer, mimetype: string) {
	const key = r2Service.generarClave("activo", mimetype);
	const resultado = await r2Service.subirAR2(fileBuffer, key, mimetype);
	return { url: resultado.url, filename: key };
}
