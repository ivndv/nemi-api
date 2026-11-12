import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
	activos,
	adjuntos,
	asignacionesLicencia,
	licencias,
	personas,
	proveedores,
	renovacionesLicencia,
	tiposActivo,
} from "../db/schema.js";
import { ErrorHttp } from "./errors.js";
import { registrarEvento } from "./eventosService.js";
import { etiqueta } from "./presentacion.js";
import { fechaHoyEnZona } from "./zonaHoraria.js";

// Calcula el estado de una licencia a partir de sus asientos y renovación
function estadoLicencia(
	ocupados: number,
	comprados: number,
	fechaRenovacion: string | null,
): "disponible" | "asignada" | "vencida" {
	if (fechaRenovacion && fechaRenovacion < fechaHoyEnZona()) {
		return "vencida";
	}
	return ocupados >= comprados ? "asignada" : "disponible";
}

// Sincroniza el estado del activo licencia con sus asientos ocupados
async function sincronizarEstado(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	licenciaId: number,
) {
	const [licencia] = await tx
		.select({ comprados: licencias.asientos_comprados })
		.from(licencias)
		.where(eq(licencias.activo_id, licenciaId))
		.limit(1);

	if (!licencia) return;

	const [ocupados] = await tx
		.select({ total: count() })
		.from(asignacionesLicencia)
		.where(
			and(
				eq(asignacionesLicencia.licencia_id, licenciaId),
				isNull(asignacionesLicencia.fecha_liberacion),
			),
		);

	const estado =
		Number(ocupados.total) >= licencia.comprados ? "asignado" : "disponible";

	await tx.update(activos).set({ estado }).where(eq(activos.id, licenciaId));
}

// Lista de licencias con su ocupación
export async function listarLicencias(
	query: {
		page?: number;
		limit?: number;
		search?: string;
		tipo_id?: string;
	},
	verCostos = true,
) {
	const page = Number(query.page) || 1;
	const limit = Math.min(Number(query.limit) || 20, 100);
	const offset = (page - 1) * limit;

	const ocupados = sql<number>`(
		SELECT COUNT(*) FROM asignaciones_licencia al
		WHERE al.licencia_id = ${licencias.activo_id}
		  AND al.fecha_liberacion IS NULL
	)`;

	const filtros = [isNull(activos.deleted_at)];
	if (query.search) {
		filtros.push(sql`${activos.nombre} LIKE ${`%${query.search}%`}`);
	}
	if (query.tipo_id) {
		filtros.push(eq(activos.tipo_id, Number(query.tipo_id)));
	}

	const filas = await db
		.select({
			activo_id: licencias.activo_id,
			nombre: activos.nombre,
			tipo: tiposActivo.nombre,
			proveedor: proveedores.nombre,
			modalidad: licencias.modalidad,
			tipo_uso: licencias.tipo_uso,
			asientos_comprados: licencias.asientos_comprados,
			ocupados,
			costo: licencias.costo,
			periodicidad_costo: licencias.periodicidad_costo,
			fecha_renovacion: licencias.fecha_renovacion,
			renovacion_automatica: licencias.renovacion_automatica,
		})
		.from(licencias)
		.innerJoin(activos, eq(licencias.activo_id, activos.id))
		.leftJoin(tiposActivo, eq(activos.tipo_id, tiposActivo.id))
		.leftJoin(proveedores, eq(activos.proveedor_id, proveedores.id))
		.where(and(...filtros))
		.orderBy(asc(activos.nombre))
		.limit(limit)
		.offset(offset);

	const [totalResult] = await db
		.select({ total: count() })
		.from(licencias)
		.innerJoin(activos, eq(licencias.activo_id, activos.id))
		.where(and(...filtros));

	const data = filas.map((fila) => {
		const ocupadosNum = Number(fila.ocupados);
		const estado = estadoLicencia(
			ocupadosNum,
			fila.asientos_comprados,
			fila.fecha_renovacion,
		);

		return {
			...fila,
			costo: verCostos ? fila.costo : null,
			periodicidad_costo: verCostos ? fila.periodicidad_costo : null,
			ocupados: ocupadosNum,
			libres: Math.max(fila.asientos_comprados - ocupadosNum, 0),
			estado,
			estado_label: etiqueta("estadoLicencia", estado),
			modalidad_label: etiqueta("modalidad", fila.modalidad),
			tipo_uso_label: etiqueta("tipoUso", fila.tipo_uso),
			periodicidad_costo_label: verCostos
				? etiqueta("periodicidad", fila.periodicidad_costo)
				: null,
		};
	});

	return {
		data,
		pagination: {
			page,
			limit,
			total: Number(totalResult.total),
			totalPages: Math.ceil(Number(totalResult.total) / limit),
		},
	};
}

// Detalle de una licencia con asientos y renovaciones
export async function getLicencia(id: number, verCostos = true) {
	const [licencia] = await db
		.select({
			activo_id: licencias.activo_id,
			nombre: activos.nombre,
			estado_activo: activos.estado,
			modalidad: licencias.modalidad,
			tipo_uso: licencias.tipo_uso,
			asientos_comprados: licencias.asientos_comprados,
			costo: licencias.costo,
			periodicidad_costo: licencias.periodicidad_costo,
			referencia_clave: licencias.referencia_clave,
			renovacion_automatica: licencias.renovacion_automatica,
			fecha_renovacion: licencias.fecha_renovacion,
		})
		.from(licencias)
		.innerJoin(activos, eq(licencias.activo_id, activos.id))
		.where(and(eq(licencias.activo_id, id), isNull(activos.deleted_at)))
		.limit(1);

	if (!licencia) {
		throw new ErrorHttp(404, "La licencia no existe");
	}

	const asientos = await listarAsientos(id);
	const renovaciones = await listarRenovaciones(id, verCostos);
	const ocupados = asientos.filter((a) => !a.fecha_liberacion).length;
	const estado = estadoLicencia(
		ocupados,
		licencia.asientos_comprados,
		licencia.fecha_renovacion,
	);

	return {
		...licencia,
		costo: verCostos ? licencia.costo : null,
		periodicidad_costo: verCostos ? licencia.periodicidad_costo : null,
		referencia_clave: verCostos ? licencia.referencia_clave : null,
		ocupados,
		libres: Math.max(licencia.asientos_comprados - ocupados, 0),
		estado,
		estado_label: etiqueta("estadoLicencia", estado),
		modalidad_label: etiqueta("modalidad", licencia.modalidad),
		tipo_uso_label: etiqueta("tipoUso", licencia.tipo_uso),
		periodicidad_costo_label: verCostos
			? etiqueta("periodicidad", licencia.periodicidad_costo)
			: null,
		asientos,
		renovaciones,
	};
}

// Asientos de una licencia con su destino
export async function listarAsientos(id: number) {
	const filas = await db
		.select({
			id: asignacionesLicencia.id,
			asiento: asignacionesLicencia.asiento,
			destino_tipo: asignacionesLicencia.destino_tipo,
			persona_id: asignacionesLicencia.persona_id,
			persona: personas.nombre,
			activo_id: asignacionesLicencia.activo_id,
			activo: activos.nombre,
			fecha_asignacion: asignacionesLicencia.fecha_asignacion,
			fecha_liberacion: asignacionesLicencia.fecha_liberacion,
		})
		.from(asignacionesLicencia)
		.leftJoin(personas, eq(asignacionesLicencia.persona_id, personas.id))
		.leftJoin(activos, eq(asignacionesLicencia.activo_id, activos.id))
		.where(eq(asignacionesLicencia.licencia_id, id))
		.orderBy(asc(asignacionesLicencia.asiento));

	return filas.map((fila) => ({
		...fila,
		destino_tipo_label: etiqueta("destinoTipo", fila.destino_tipo),
	}));
}

// Asigna el siguiente asiento libre
export async function asignarAsiento(
	id: number,
	input: {
		destino_tipo: "persona" | "activo";
		persona_id?: number;
		activo_id?: number;
		fecha_asignacion: string;
	},
	actorId: number,
) {
	const [licencia] = await db
		.select({
			activo_id: licencias.activo_id,
			asientos_comprados: licencias.asientos_comprados,
			nombre: activos.nombre,
		})
		.from(licencias)
		.innerJoin(activos, eq(licencias.activo_id, activos.id))
		.where(and(eq(licencias.activo_id, id), isNull(activos.deleted_at)))
		.limit(1);

	if (!licencia) {
		throw new ErrorHttp(404, "La licencia no existe");
	}

	return await db.transaction(async (tx) => {
		// Bloquea la licencia para evitar tomar el mismo asiento dos veces
		await tx
			.select({ activo_id: licencias.activo_id })
			.from(licencias)
			.where(eq(licencias.activo_id, id))
			.for("update")
			.limit(1);

		const ocupados = await tx
			.select({ asiento: asignacionesLicencia.asiento })
			.from(asignacionesLicencia)
			.where(
				and(
					eq(asignacionesLicencia.licencia_id, id),
					isNull(asignacionesLicencia.fecha_liberacion),
				),
			);

		const usados = new Set(ocupados.map((fila) => fila.asiento));
		let asientoLibre = 0;
		for (let i = 1; i <= licencia.asientos_comprados; i++) {
			if (!usados.has(i)) {
				asientoLibre = i;
				break;
			}
		}

		if (!asientoLibre) {
			throw new ErrorHttp(400, "La licencia no tiene asientos libres");
		}

		if (input.destino_tipo === "persona") {
			const [persona] = await tx
				.select({ id: personas.id })
				.from(personas)
				.where(
					and(
						eq(personas.id, input.persona_id as number),
						isNull(personas.deleted_at),
					),
				)
				.limit(1);
			if (!persona) throw new ErrorHttp(404, "La persona no existe");
		} else {
			const [activo] = await tx
				.select({ id: activos.id })
				.from(activos)
				.where(
					and(
						eq(activos.id, input.activo_id as number),
						isNull(activos.deleted_at),
					),
				)
				.limit(1);
			if (!activo) throw new ErrorHttp(404, "El activo no existe");
		}

		const [creado] = await tx
			.insert(asignacionesLicencia)
			.values({
				licencia_id: id,
				asiento: asientoLibre,
				destino_tipo: input.destino_tipo,
				persona_id: input.persona_id ?? null,
				activo_id: input.activo_id ?? null,
				fecha_asignacion: input.fecha_asignacion,
			})
			.$returningId();

		await sincronizarEstado(tx, id);

		await registrarEvento(tx, {
			entidad: "licencia",
			entidad_id: id,
			accion: "licencia.asiento_asignado",
			actor_id: actorId,
			nuevos: {
				asiento: asientoLibre,
				destino_tipo: input.destino_tipo,
				persona_id: input.persona_id ?? null,
				activo_id: input.activo_id ?? null,
			},
		});

		return {
			id: creado.id,
			licencia_id: id,
			asiento: asientoLibre,
			...input,
		};
	});
}

// Libera un asiento ocupado
export async function liberarAsiento(
	id: number,
	asiento: number,
	actorId: number,
) {
	return await db.transaction(async (tx) => {
		const [ocupado] = await tx
			.select({ id: asignacionesLicencia.id })
			.from(asignacionesLicencia)
			.where(
				and(
					eq(asignacionesLicencia.licencia_id, id),
					eq(asignacionesLicencia.asiento, asiento),
					isNull(asignacionesLicencia.fecha_liberacion),
				),
			)
			.for("update")
			.limit(1);

		if (!ocupado) {
			throw new ErrorHttp(404, "El asiento no está ocupado");
		}

		await tx
			.update(asignacionesLicencia)
			.set({ fecha_liberacion: fechaHoyEnZona() })
			.where(eq(asignacionesLicencia.id, ocupado.id));

		await sincronizarEstado(tx, id);

		await registrarEvento(tx, {
			entidad: "licencia",
			entidad_id: id,
			accion: "licencia.asiento_liberado",
			actor_id: actorId,
			nuevos: { asiento },
		});

		return { licencia_id: id, asiento, liberado: true };
	});
}

// Renovaciones de una licencia
export async function listarRenovaciones(id: number, verCostos = true) {
	const filas = await db
		.select({
			id: renovacionesLicencia.id,
			fecha: renovacionesLicencia.fecha,
			asientos: renovacionesLicencia.asientos,
			costo: renovacionesLicencia.costo,
			adjunto_id: renovacionesLicencia.adjunto_id,
			adjunto: adjuntos.nombre,
		})
		.from(renovacionesLicencia)
		.leftJoin(adjuntos, eq(renovacionesLicencia.adjunto_id, adjuntos.id))
		.where(eq(renovacionesLicencia.licencia_id, id))
		.orderBy(desc(renovacionesLicencia.fecha));

	return filas.map((fila) => ({
		...fila,
		costo: verCostos ? fila.costo : null,
	}));
}

export async function crearRenovacion(
	id: number,
	input: {
		fecha: string;
		asientos: number;
		costo?: number;
		adjunto_id?: number;
	},
	actorId: number,
) {
	const [licencia] = await db
		.select({ activo_id: licencias.activo_id })
		.from(licencias)
		.where(eq(licencias.activo_id, id))
		.limit(1);

	if (!licencia) {
		throw new ErrorHttp(404, "La licencia no existe");
	}

	return await db.transaction(async (tx) => {
		const [creada] = await tx
			.insert(renovacionesLicencia)
			.values({
				licencia_id: id,
				fecha: input.fecha,
				asientos: input.asientos,
				costo: input.costo != null ? String(input.costo) : null,
				adjunto_id: input.adjunto_id ?? null,
			})
			.$returningId();

		await tx
			.update(licencias)
			.set({
				fecha_renovacion: input.fecha,
				asientos_comprados: input.asientos,
			})
			.where(eq(licencias.activo_id, id));

		await sincronizarEstado(tx, id);

		await registrarEvento(tx, {
			entidad: "licencia",
			entidad_id: id,
			accion: "licencia.renovada",
			actor_id: actorId,
			nuevos: {
				renovacion_id: creada.id,
				fecha: input.fecha,
				asientos: input.asientos,
				costo: input.costo ?? null,
			},
		});

		return { id: creada.id, licencia_id: id, ...input };
	});
}
