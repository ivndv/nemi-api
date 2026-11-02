import { ErrorHttp } from "../errors.js";
import type { EstrategiaReporte } from "./EstrategiaReporte.js";
import { ReporteCostos } from "./tipos/ReporteCostos.js";
import { ReporteGarantias } from "./tipos/ReporteGarantias.js";
import { ReporteHistorial } from "./tipos/ReporteHistorial.js";
import { ReportePorEstado } from "./tipos/ReportePorEstado.js";
import { ReportePorTipo } from "./tipos/ReportePorTipo.js";
import { ReportePorUbicacion } from "./tipos/ReportePorUbicacion.js";
import { ReportePorUsuario } from "./tipos/ReportePorUsuario.js";
import {
	ActivosMasFallas,
	ActivosSinUbicacion,
	AltasBajas,
	CargaTecnico,
	EntregasPendientes,
	IncidenciasAbiertas,
	LicenciasCumplimiento,
	MantenimientosAbiertos,
	MantenimientosProveedor,
	MisEquipos,
	MisGarantias,
	MisIncidencias,
	MisSolicitudes,
	MovimientosInventario,
	RenovacionesProximas,
} from "./tipos/ReportesExtra.js";

// Definición de un reporte: estrategia, roles y alcance
export interface DefinicionReporte {
	estrategia: EstrategiaReporte;
	roles: string[];
	alcance: "global" | "propio";
}

const TODOS = ["administrador", "tecnico", "almacen"];
const OPERACION = ["administrador", "tecnico"];
const ADMIN = ["administrador"];
const EMPLEADO = ["empleado"];

// Estrategias registradas por slug (estable), no por id numérico
const registry = new Map<string, DefinicionReporte>([
	[
		"activos_por_estado",
		{ estrategia: new ReportePorEstado(), roles: TODOS, alcance: "global" },
	],
	[
		"activos_por_usuario",
		{
			estrategia: new ReportePorUsuario(),
			roles: OPERACION,
			alcance: "global",
		},
	],
	[
		"garantias",
		{ estrategia: new ReporteGarantias(), roles: TODOS, alcance: "global" },
	],
	[
		"costos",
		{ estrategia: new ReporteCostos(), roles: ADMIN, alcance: "global" },
	],
	[
		"historial",
		{ estrategia: new ReporteHistorial(), roles: TODOS, alcance: "global" },
	],
	[
		"activos_por_tipo",
		{ estrategia: new ReportePorTipo(), roles: TODOS, alcance: "global" },
	],
	[
		"activos_por_ubicacion",
		{ estrategia: new ReportePorUbicacion(), roles: TODOS, alcance: "global" },
	],
	[
		"licencias_cumplimiento",
		{
			estrategia: new LicenciasCumplimiento(),
			roles: OPERACION,
			alcance: "global",
		},
	],
	[
		"renovaciones_proximas",
		{
			estrategia: new RenovacionesProximas(),
			roles: OPERACION,
			alcance: "global",
		},
	],
	[
		"altas_bajas",
		{ estrategia: new AltasBajas(), roles: TODOS, alcance: "global" },
	],
	[
		"mantenimientos_abiertos",
		{
			estrategia: new MantenimientosAbiertos(),
			roles: OPERACION,
			alcance: "global",
		},
	],
	[
		"incidencias_abiertas",
		{
			estrategia: new IncidenciasAbiertas(),
			roles: OPERACION,
			alcance: "global",
		},
	],
	[
		"activos_mas_fallas",
		{
			estrategia: new ActivosMasFallas(),
			roles: OPERACION,
			alcance: "global",
		},
	],
	[
		"carga_tecnico",
		{ estrategia: new CargaTecnico(), roles: OPERACION, alcance: "global" },
	],
	[
		"mantenimientos_proveedor",
		{
			estrategia: new MantenimientosProveedor(),
			roles: OPERACION,
			alcance: "global",
		},
	],
	[
		"entregas_pendientes",
		{
			estrategia: new EntregasPendientes(),
			roles: TODOS,
			alcance: "global",
		},
	],
	[
		"activos_sin_ubicacion",
		{
			estrategia: new ActivosSinUbicacion(),
			roles: TODOS,
			alcance: "global",
		},
	],
	[
		"movimientos_inventario",
		{
			estrategia: new MovimientosInventario(),
			roles: TODOS,
			alcance: "global",
		},
	],
	[
		"mis_equipos",
		{ estrategia: new MisEquipos(), roles: EMPLEADO, alcance: "propio" },
	],
	[
		"mis_garantias",
		{ estrategia: new MisGarantias(), roles: EMPLEADO, alcance: "propio" },
	],
	[
		"mis_solicitudes",
		{ estrategia: new MisSolicitudes(), roles: EMPLEADO, alcance: "propio" },
	],
	[
		"mis_incidencias",
		{ estrategia: new MisIncidencias(), roles: EMPLEADO, alcance: "propio" },
	],
]);

export function obtenerDefinicion(slug: string): DefinicionReporte {
	const definicion = registry.get(slug);
	if (!definicion) {
		throw new ErrorHttp(400, `Tipo de reporte no válido: ${slug}`);
	}
	return definicion;
}

export function obtenerEstrategia(slug: string): EstrategiaReporte {
	return obtenerDefinicion(slug).estrategia;
}
