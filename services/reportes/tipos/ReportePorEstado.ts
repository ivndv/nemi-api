import type { EstrategiaReporte } from "../EstrategiaReporte.js";

export class ReportePorEstado implements EstrategiaReporte {
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
		if (filtros.fecha_inicio) {
			conditions.push("a.created_at >= ?");
			params.push(filtros.fecha_inicio);
		}
		if (filtros.fecha_fin) {
			conditions.push("a.deleted_at <= ?");
			params.push(filtros.fecha_fin);
		}

		const where =
			conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

		return {
			query: `
        SELECT a.estado, COUNT(*) AS cantidad
        FROM activos a
        WHERE a.deleted_at IS NULL ${where}
        GROUP BY a.estado
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
