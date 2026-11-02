import type { EstrategiaReporte } from "../EstrategiaReporte.js";

export class ReporteCostos implements EstrategiaReporte {
	buildQuery(filtros: Record<string, unknown>) {
		const conditions: string[] = [];
		const params: unknown[] = [];

		if (filtros.usuario_id) {
			conditions.push(
				"EXISTS (SELECT 1 FROM asignaciones s WHERE s.activo_id = a.id AND s.persona_id = ?)",
			);
			params.push(filtros.usuario_id);
		}
		if (filtros.tipo_activo_id) {
			conditions.push("a.tipo_id = ?");
			params.push(filtros.tipo_activo_id);
		}

		const where =
			conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

		return {
			query: `
        SELECT SUM(a.valor_compra) AS costo_total
        FROM activos a
        WHERE a.deleted_at IS NULL ${where}
      `,
			params,
		};
	}

	procesar(results: Record<string, unknown>[]) {
		return {
			resumen: { "Costo total": results[0]?.costo_total || 0 },
			detalles: results,
		};
	}
}
