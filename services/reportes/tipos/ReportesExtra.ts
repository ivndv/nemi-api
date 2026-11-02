import { fechaHoyEnZona } from "../../zonaHoraria.js";
import type { EstrategiaReporte } from "../EstrategiaReporte.js";

const hoySQL = () => `'${fechaHoyEnZona()}'`;

// Estrategia base: resumen simple con el total de filas
abstract class ReporteBase implements EstrategiaReporte {
	abstract buildQuery(filtros: Record<string, unknown>): {
		query: string;
		params: unknown[];
	};

	procesar(results: Record<string, unknown>[]) {
		return { resumen: { total: results.length }, detalles: results };
	}
}

export class LicenciasCumplimiento extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT a.nombre AS licencia,
               l.asientos_comprados,
               (SELECT COUNT(*) FROM asignaciones_licencia al
                  WHERE al.licencia_id = l.activo_id AND al.fecha_liberacion IS NULL) AS ocupados,
               l.asientos_comprados -
                 (SELECT COUNT(*) FROM asignaciones_licencia al
                    WHERE al.licencia_id = l.activo_id AND al.fecha_liberacion IS NULL) AS libres,
               CASE WHEN l.asientos_comprados <
                 (SELECT COUNT(*) FROM asignaciones_licencia al
                    WHERE al.licencia_id = l.activo_id AND al.fecha_liberacion IS NULL)
                 THEN 'Sobredespliegue' ELSE 'OK' END AS cumplimiento
        FROM licencias l
        JOIN activos a ON a.id = l.activo_id
        WHERE a.deleted_at IS NULL
        ORDER BY a.nombre
      `,
			params: [],
		};
	}
}

export class RenovacionesProximas extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT a.nombre AS licencia, l.fecha_renovacion, l.costo, l.periodicidad_costo
        FROM licencias l
        JOIN activos a ON a.id = l.activo_id
        WHERE a.deleted_at IS NULL
          AND l.fecha_renovacion IS NOT NULL
          AND l.fecha_renovacion <= DATE_ADD(${hoySQL()}, INTERVAL 60 DAY)
        ORDER BY l.fecha_renovacion
      `,
			params: [],
		};
	}
}

export class AltasBajas extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT 'Alta' AS movimiento, DATE(a.created_at) AS fecha, a.nombre
        FROM activos a
        WHERE a.created_at >= DATE_SUB(${hoySQL()}, INTERVAL 12 MONTH)
        UNION ALL
        SELECT 'Baja', DATE(a.deleted_at), a.nombre
        FROM activos a
        WHERE a.deleted_at IS NOT NULL
          AND a.deleted_at >= DATE_SUB(${hoySQL()}, INTERVAL 12 MONTH)
        ORDER BY fecha DESC
      `,
			params: [],
		};
	}
}

export class MantenimientosAbiertos extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT m.id, a.nombre AS activo, m.tipo, m.fecha_salida,
               DATEDIFF(${hoySQL()}, m.fecha_salida) AS dias,
               p.nombre AS tecnico, pr.nombre AS proveedor
        FROM mantenimientos m
        JOIN activos a ON a.id = m.activo_id
        LEFT JOIN personas p ON p.id = m.tecnico_id
        LEFT JOIN proveedores pr ON pr.id = m.proveedor_id
        WHERE m.estado = 'abierto'
        ORDER BY dias DESC
      `,
			params: [],
		};
	}
}

export class IncidenciasAbiertas extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT i.id, a.nombre AS activo, i.descripcion, i.prioridad, i.estado,
               DATEDIFF(${hoySQL()}, DATE(i.created_at)) AS dias
        FROM incidencias i
        JOIN activos a ON a.id = i.activo_id
        WHERE i.estado IN ('abierta', 'en_revision')
        ORDER BY FIELD(i.prioridad, 'alta', 'media', 'baja'), dias DESC
      `,
			params: [],
		};
	}
}

export class ActivosMasFallas extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT a.nombre AS activo, COUNT(i.id) AS incidencias
        FROM incidencias i
        JOIN activos a ON a.id = i.activo_id
        WHERE a.deleted_at IS NULL
        GROUP BY a.id, a.nombre
        HAVING incidencias > 0
        ORDER BY incidencias DESC
        LIMIT 20
      `,
			params: [],
		};
	}
}

export class CargaTecnico extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT p.nombre AS tecnico, COUNT(m.id) AS total,
               SUM(CASE WHEN m.estado = 'abierto' THEN 1 ELSE 0 END) AS abiertos
        FROM mantenimientos m
        JOIN personas p ON p.id = m.tecnico_id
        GROUP BY p.id, p.nombre
        ORDER BY total DESC
      `,
			params: [],
		};
	}
}

export class MantenimientosProveedor extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT pr.nombre AS proveedor, COUNT(m.id) AS total,
               COALESCE(SUM(m.costo), 0) AS costo
        FROM mantenimientos m
        JOIN proveedores pr ON pr.id = m.proveedor_id
        GROUP BY pr.id, pr.nombre
        ORDER BY total DESC
      `,
			params: [],
		};
	}
}

export class EntregasPendientes extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT s.id, p.nombre AS solicitante, t.nombre AS tipo, s.prioridad,
               DATEDIFF(${hoySQL()}, DATE(s.created_at)) AS dias
        FROM solicitudes s
        JOIN personas p ON p.id = s.solicitante_id
        LEFT JOIN tipos_activo t ON t.id = s.tipo_activo_id
        WHERE s.estado = 'aprobada'
        ORDER BY dias DESC
      `,
			params: [],
		};
	}
}

export class ActivosSinUbicacion extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT a.id, a.nombre, t.nombre AS tipo, a.estado
        FROM activos a
        LEFT JOIN tipos_activo t ON t.id = a.tipo_id
        WHERE a.deleted_at IS NULL AND a.ubicacion_id IS NULL
        ORDER BY a.nombre
      `,
			params: [],
		};
	}
}

export class MovimientosInventario extends ReporteBase {
	buildQuery() {
		return {
			query: `
        SELECT 'Alta' AS movimiento, DATE(a.created_at) AS fecha, a.nombre
        FROM activos a
        WHERE a.created_at >= DATE_SUB(${hoySQL()}, INTERVAL 90 DAY)
        UNION ALL
        SELECT 'Baja', DATE(a.deleted_at), a.nombre
        FROM activos a
        WHERE a.deleted_at IS NOT NULL
          AND a.deleted_at >= DATE_SUB(${hoySQL()}, INTERVAL 90 DAY)
        UNION ALL
        SELECT 'Asignación', s.fecha_asignacion, CONCAT('Activo #', s.activo_id)
        FROM asignaciones s
        WHERE s.fecha_asignacion >= DATE_SUB(${hoySQL()}, INTERVAL 90 DAY)
        ORDER BY fecha DESC
      `,
			params: [],
		};
	}
}

export class MisEquipos extends ReporteBase {
	buildQuery(filtros: Record<string, unknown>) {
		return {
			query: `
        SELECT a.nombre, t.nombre AS tipo, a.estado,
               s.fecha_asignacion, s.fecha_devolucion_pactada
        FROM asignaciones s
        JOIN activos a ON a.id = s.activo_id
        LEFT JOIN tipos_activo t ON t.id = a.tipo_id
        WHERE s.persona_id = ? AND s.fecha_devolucion_real IS NULL
        ORDER BY s.fecha_asignacion DESC
      `,
			params: [filtros.usuario_id],
		};
	}
}

export class MisGarantias extends ReporteBase {
	buildQuery(filtros: Record<string, unknown>) {
		return {
			query: `
        SELECT a.nombre AS activo, g.nombre AS garantia,
               g.fecha_inicio, g.fecha_fin,
               CASE WHEN g.fecha_fin < ${hoySQL()} THEN 'Vencida'
                    WHEN g.fecha_fin <= DATE_ADD(${hoySQL()}, INTERVAL 30 DAY) THEN 'Por vencer'
                    ELSE 'Vigente' END AS estado
        FROM garantias g
        JOIN activos a ON a.id = g.activo_id
        WHERE g.deleted_at IS NULL AND a.deleted_at IS NULL
          AND a.id IN (
            SELECT s.activo_id FROM asignaciones s
            WHERE s.persona_id = ? AND s.fecha_devolucion_real IS NULL
          )
        ORDER BY g.fecha_fin
      `,
			params: [filtros.usuario_id],
		};
	}
}

export class MisSolicitudes extends ReporteBase {
	buildQuery(filtros: Record<string, unknown>) {
		return {
			query: `
        SELECT s.id, s.tipo, s.prioridad, s.estado, s.motivo,
               s.fecha_resolucion, s.created_at
        FROM solicitudes s
        WHERE s.solicitante_id = ?
        ORDER BY s.created_at DESC
      `,
			params: [filtros.usuario_id],
		};
	}
}

export class MisIncidencias extends ReporteBase {
	buildQuery(filtros: Record<string, unknown>) {
		return {
			query: `
        SELECT i.id, a.nombre AS activo, i.descripcion, i.prioridad,
               i.estado, i.fecha_resolucion, i.created_at
        FROM incidencias i
        JOIN activos a ON a.id = i.activo_id
        WHERE i.reportante_id = ?
           OR i.activo_id IN (
             SELECT s.activo_id FROM asignaciones s
             WHERE s.persona_id = ? AND s.fecha_devolucion_real IS NULL
           )
        ORDER BY i.created_at DESC
      `,
			params: [filtros.usuario_id, filtros.usuario_id],
		};
	}
}
