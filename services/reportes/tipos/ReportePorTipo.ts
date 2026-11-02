import type { EstrategiaReporte } from "../EstrategiaReporte.js";

export class ReportePorTipo implements EstrategiaReporte {
	buildQuery(filtros: Record<string, unknown>) {
		const conditions: string[] = [];
		const params: unknown[] = [];

		if (filtros.usuario_id) {
			conditions.push(
				"a.id IN (SELECT activo_id FROM asignaciones WHERE usuario_id = ?)",
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
        SELECT t.nombre AS tipo, COUNT(a.id) AS cantidad
        FROM activos a
        JOIN tipos_activo t ON a.tipo_id = t.id
        WHERE a.deleted_at IS NULL ${where}
        GROUP BY t.nombre
      `,
			params,
		};
	}

	procesar(results: Record<string, unknown>[]) {
		const resumen: Record<string, unknown> = {};
		results.forEach((row) => {
			resumen[row.tipo as string] = row.cantidad;
		});
		return { resumen, detalles: results };
	}
}
