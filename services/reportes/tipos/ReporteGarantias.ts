import { fechaHoyEnZona } from "../../zonaHoraria.js";
import type { EstrategiaReporte } from "../EstrategiaReporte.js";

const hoySQL = () => `'${fechaHoyEnZona()}'`;

// Estado calculado de la garantía a partir de su fecha de fin
const estadoGarantiaSQL = () => `CASE
  WHEN g.fecha_fin < ${hoySQL()} THEN 'Vencida'
  WHEN g.fecha_fin <= DATE_ADD(${hoySQL()}, INTERVAL 30 DAY) THEN 'Por vencer'
  ELSE 'Vigente' END`;

export class ReporteGarantias implements EstrategiaReporte {
	buildQuery(filtros: Record<string, unknown>) {
		const conditions: string[] = [];
		const params: unknown[] = [];

		if (filtros.usuario_id) {
			conditions.push(
				"EXISTS (SELECT 1 FROM asignaciones s WHERE s.activo_id = a.id AND s.persona_id = ?)",
			);
			params.push(filtros.usuario_id);
		}
		if (filtros.ubicacion_id) {
			conditions.push("a.ubicacion_id = ?");
			params.push(filtros.ubicacion_id);
		}
		if (filtros.proveedor_id) {
			conditions.push("g.proveedor_id = ?");
			params.push(filtros.proveedor_id);
		}
		if (filtros.fecha_inicio) {
			conditions.push("g.fecha_inicio >= ?");
			params.push(filtros.fecha_inicio);
		}
		if (filtros.fecha_fin) {
			conditions.push("g.fecha_fin <= ?");
			params.push(filtros.fecha_fin);
		}

		const where =
			conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

		return {
			query: `
        SELECT ${estadoGarantiaSQL()} AS estado, COUNT(*) AS cantidad
        FROM garantias g
        JOIN activos a ON g.activo_id = a.id AND a.deleted_at IS NULL
        WHERE g.deleted_at IS NULL ${where}
        GROUP BY ${estadoGarantiaSQL()}
      `,
			params,
		};
	}

	procesar(results: Record<string, unknown>[]) {
		const resumen: Record<string, unknown> = {};
		results.forEach((row) => {
			resumen[row.estado as string] = row.cantidad;
		});
		return { resumen, detalles: results };
	}
}
