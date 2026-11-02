import type { EstrategiaReporte } from "../EstrategiaReporte.js";

export class ReportePorUbicacion implements EstrategiaReporte {
	buildQuery(filtros: Record<string, unknown>) {
		const conditions: string[] = [];
		const params: unknown[] = [];

		if (filtros.usuario_id) {
			conditions.push(
				"a.id IN (SELECT activo_id FROM asignaciones WHERE usuario_id = ?)",
			);
			params.push(filtros.usuario_id);
		}
		if (filtros.ubicacion_id) {
			conditions.push("a.ubicacion_id = ?");
			params.push(filtros.ubicacion_id);
		}

		const where =
			conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

		return {
			query: `
        SELECT u.nombre AS ubicacion, COUNT(a.id) AS cantidad
        FROM activos a
        JOIN ubicaciones u ON a.ubicacion_id = u.id
        WHERE a.deleted_at IS NULL ${where}
        GROUP BY u.nombre
      `,
			params,
		};
	}

	procesar(results: Record<string, unknown>[]) {
		const resumen: Record<string, unknown> = {};
		results.forEach((row) => {
			resumen[row.ubicacion as string] = row.cantidad;
		});
		return { resumen, detalles: results };
	}
}
