import type { EstrategiaReporte } from "../EstrategiaReporte.js";

export class ReportePorUsuario implements EstrategiaReporte {
	buildQuery(filtros: Record<string, unknown>) {
		const conditions: string[] = [];
		const params: unknown[] = [];

		if (filtros.usuario_id) {
			conditions.push("asig.persona_id = ?");
			params.push(filtros.usuario_id);
		}
		if (filtros.ubicacion_id) {
			conditions.push("asig.ubicacion_id = ?");
			params.push(filtros.ubicacion_id);
		}
		if (filtros.fecha_inicio) {
			conditions.push("asig.fecha_asignacion >= ?");
			params.push(filtros.fecha_inicio);
		}
		if (filtros.fecha_fin) {
			conditions.push("asig.fecha_devolucion_real <= ?");
			params.push(filtros.fecha_fin);
		}

		const where =
			conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

		return {
			query: `
        SELECT p.nombre AS usuario, COUNT(a.id) AS cantidad
        FROM asignaciones asig
        JOIN personas p ON asig.persona_id = p.id
        JOIN activos a ON asig.activo_id = a.id AND a.deleted_at IS NULL
        WHERE 1 = 1 ${where}
        GROUP BY p.nombre
      `,
			params,
		};
	}

	procesar(results: Record<string, unknown>[]) {
		const resumen: Record<string, unknown> = {};
		results.forEach((row) => {
			resumen[row.usuario as string] = row.cantidad;
		});
		return { resumen, detalles: results };
	}
}
