import type { EstrategiaReporte } from "../EstrategiaReporte.js";

export class ReporteHistorial implements EstrategiaReporte {
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
		if (filtros.tipo_activo_id) {
			conditions.push("a.tipo_id = ?");
			params.push(filtros.tipo_activo_id);
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
        SELECT a.nombre AS activo, p.nombre AS usuario,
               asig.fecha_asignacion, asig.fecha_devolucion_real
        FROM asignaciones asig
        JOIN activos a ON asig.activo_id = a.id AND a.deleted_at IS NULL
        JOIN personas p ON asig.persona_id = p.id
        WHERE 1 = 1 ${where}
      `,
			params,
		};
	}

	procesar(results: Record<string, unknown>[]) {
		const resumen: Record<string, unknown> = {};
		results.forEach((row) => {
			const usuario = row.usuario as string;
			resumen[usuario] = ((resumen[usuario] as number) || 0) + 1;
		});
		return { resumen, detalles: results };
	}
}
