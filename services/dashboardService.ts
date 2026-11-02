import { and, eq, isNull, sql } from "drizzle-orm";
import db from "../config/db.js";
import {
	activos,
	asignaciones,
	configuracion,
	garantias,
	licencias,
} from "../db/schema.js";
import { fechaHoyEnZona } from "./zonaHoraria.js";

// Resumen general del dashboard

export async function getResumen() {
	const [result] = await db
		.select({
			total_activos: sql<string>`COUNT(*)`,
			activos_disponibles: sql<string>`SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END)`,
			activos_asignados: sql<string>`SUM(CASE WHEN estado = 'asignado' THEN 1 ELSE 0 END)`,
			activos_en_mantenimiento: sql<string>`SUM(CASE WHEN estado = 'mantenimiento' THEN 1 ELSE 0 END)`,
		})
		.from(activos)
		.where(isNull(activos.deleted_at));

	const [bajas] = await db
		.select({ total: sql<string>`COUNT(*)` })
		.from(activos)
		.where(sql`${activos.deleted_at} IS NOT NULL`);

	const resumen = {
		total_activos: Number(result?.total_activos ?? 0),
		activos_disponibles: Number(result?.activos_disponibles ?? 0),
		activos_asignados: Number(result?.activos_asignados ?? 0),
		activos_en_mantenimiento: Number(result?.activos_en_mantenimiento ?? 0),
		activos_dados_de_baja: Number(bajas?.total ?? 0),
	};

	// Tendencia mensual de altas en el último año
	const fechaActual = new Date();
	const fechaHaceUnAno = new Date(fechaActual);
	fechaHaceUnAno.setFullYear(fechaActual.getFullYear() - 1);

	const [tendencia] = await db.execute(sql`
    WITH meses AS (
      SELECT 'Ene' AS mes, 1 AS numero UNION ALL
      SELECT 'Feb', 2 UNION ALL
      SELECT 'Mar', 3 UNION ALL
      SELECT 'Abr', 4 UNION ALL
      SELECT 'May', 5 UNION ALL
      SELECT 'Jun', 6 UNION ALL
      SELECT 'Jul', 7 UNION ALL
      SELECT 'Ago', 8 UNION ALL
      SELECT 'Sep', 9 UNION ALL
      SELECT 'Oct', 10 UNION ALL
      SELECT 'Nov', 11 UNION ALL
      SELECT 'Dic', 12
    )
    SELECT
      m.mes,
      COALESCE(COUNT(a.id), 0) AS cantidad,
      YEAR(a.created_at) AS ano
    FROM meses m
    LEFT JOIN activos a
      ON MONTH(a.created_at) = m.numero
      AND a.created_at >= ${fechaHaceUnAno} AND a.created_at <= ${fechaActual}
      AND a.deleted_at IS NULL
    GROUP BY m.mes, m.numero, YEAR(a.created_at)
    ORDER BY YEAR(a.created_at), m.numero;
  `);

	const filas = tendencia as unknown as Array<{
		mes: string;
		cantidad: number;
		ano: number | null;
	}>;

	return {
		...resumen,
		tendencia_mensual: {
			labels: filas.map((fila) => fila.mes),
			data: filas.map((fila) => Number(fila.cantidad)),
		},
		ano_tendencia: filas[0]?.ano ?? new Date().getFullYear(),
	};
}

// Alertas del dashboard

export async function getAlertas() {
	// Días de anticipación configurados
	const [config] = await db
		.select({
			licencia: configuracion.dias_alerta_licencia,
			garantia: configuracion.dias_alerta_garantia,
			devolucion: configuracion.dias_alerta_devolucion,
		})
		.from(configuracion)
		.where(eq(configuracion.id, 1))
		.limit(1);

	const diasLicencia = config?.licencia ?? 30;
	const diasGarantia = config?.garantia ?? 30;
	const diasDevolucion = config?.devolucion ?? 7;
	const hoy = fechaHoyEnZona();

	// Licencias cuya renovación vence pronto
	const [licenciasProximas] = await db
		.select({ count: sql<string>`COUNT(*)` })
		.from(licencias)
		.innerJoin(activos, eq(licencias.activo_id, activos.id))
		.where(
			and(
				isNull(activos.deleted_at),
				sql`${licencias.fecha_renovacion} IS NOT NULL`,
				sql`${licencias.fecha_renovacion} BETWEEN ${hoy} AND DATE_ADD(${hoy}, INTERVAL ${diasLicencia} DAY)`,
			),
		);

	// Garantías próximas a expirar
	const [garantiasProximas] = await db
		.select({ count: sql<string>`COUNT(*)` })
		.from(garantias)
		.where(
			and(
				isNull(garantias.deleted_at),
				sql`${garantias.fecha_fin} BETWEEN ${hoy} AND DATE_ADD(${hoy}, INTERVAL ${diasGarantia} DAY)`,
			),
		);

	// Activos en mantenimiento
	const [activosMantenimiento] = await db
		.select({ count: sql<string>`COUNT(*)` })
		.from(activos)
		.where(
			and(isNull(activos.deleted_at), eq(activos.estado, "mantenimiento")),
		);

	// Asignaciones con devolución pactada próxima y aún activas
	const [activosDevolver] = await db
		.select({ count: sql<string>`COUNT(*)` })
		.from(asignaciones)
		.where(
			and(
				isNull(asignaciones.fecha_devolucion_real),
				sql`${asignaciones.fecha_devolucion_pactada} IS NOT NULL`,
				sql`${asignaciones.fecha_devolucion_pactada} BETWEEN ${hoy} AND DATE_ADD(${hoy}, INTERVAL ${diasDevolucion} DAY)`,
			),
		);

	return {
		licencias_proximas_a_vencer: Number(licenciasProximas?.count ?? 0),
		garantias_proximas_a_expirar: Number(garantiasProximas?.count ?? 0),
		activos_en_mantenimiento: Number(activosMantenimiento?.count ?? 0),
		activos_proximos_a_devolver: Number(activosDevolver?.count ?? 0),
	};
}
