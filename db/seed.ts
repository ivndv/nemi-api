import "dotenv/config";
import { count } from "drizzle-orm";
import db, { pool } from "../config/db.js";
import hashService from "../services/hashService.js";
import {
	acciones,
	activos,
	asignaciones,
	asignacionesLicencia,
	configuracion,
	departamentos,
	eventos,
	garantias,
	incidencias,
	licencias,
	mantenimientos,
	personas,
	proveedores,
	sedes,
	solicitudes,
	tiposActivo,
	tiposReporte,
	tiposReporteRoles,
	ubicaciones,
} from "./schema.js";

// Contraseña de desarrollo común a todos los usuarios del seed
const CONTRASENA = process.env.SEED_PASSWORD ?? "Nemi123!";
// Hash Argon2id de "Nemi123!" — respaldo si el servicio de hash no responde
const HASH_RESPALDO =
	"$argon2id$v=19$m=65536,t=1,p=12$Ya7DZZhy1tTkulLG7TkCYA$C/Ef+TYi4uPmjA1wSNKXgSP4BL2wvIzqXS62caA4Pe0";

async function obtenerHash(): Promise<string> {
	try {
		return await hashService.generarHash(CONTRASENA);
	} catch {
		console.warn("⚠️  Servicio de hash no disponible, usando hash de respaldo");
		return HASH_RESPALDO;
	}
}

async function main() {
	const [existentes] = await db.select({ total: count() }).from(personas);
	if (Number(existentes.total) > 0) {
		console.log("ℹ️  La base ya tiene personas. Nada que sembrar.");
		return;
	}

	const hash = await obtenerHash();

	await db.transaction(async (tx) => {
		// ── Organización ────────────────────────────────────────────────────
		await tx.insert(departamentos).values([
			{ id: 1, nombre: "Operaciones" },
			{ id: 2, nombre: "Finanzas" },
			{ id: 3, nombre: "Recursos Humanos" },
			{ id: 4, nombre: "Marketing" },
			{ id: 5, nombre: "TI" },
			{ id: 6, nombre: "Soporte" },
			{ id: 7, nombre: "Gerencia" },
		]);

		await tx.insert(sedes).values([
			{ id: 1, nombre: "Matriz", ciudad: "Ciudad de México" },
			{ id: 2, nombre: "Sucursal Norte", ciudad: "Monterrey" },
			{ id: 3, nombre: "Remoto" },
		]);

		await tx.insert(ubicaciones).values([
			{ id: 1, sede_id: 1, nombre: "Oficina Central", tipo: "edificio" },
			{ id: 2, sede_id: 1, padre_id: 1, nombre: "Data Center", tipo: "sala" },
			{ id: 3, sede_id: 1, padre_id: 1, nombre: "Almacén TI", tipo: "almacen" },
			{ id: 4, sede_id: 3, nombre: "Nube", tipo: "almacen" },
			{ id: 5, sede_id: 2, nombre: "Sucursal Norte", tipo: "edificio" },
			{
				id: 6,
				sede_id: 1,
				padre_id: 1,
				nombre: "Sala de Juntas",
				tipo: "sala",
			},
			{ id: 7, sede_id: 3, nombre: "Oficina Remota", tipo: "sala" },
		]);

		await tx.insert(personas).values([
			{
				id: 1,
				nombre: "Ivan Cruz",
				email: "admin@nemi.dev",
				contrasena: hash,
				departamento_id: 5,
				sede_id: 1,
				fecha_ingreso: "2023-02-01",
				rol_id: 1,
			},
			{
				id: 2,
				nombre: "Ana García",
				email: "tecnico@nemi.dev",
				contrasena: hash,
				departamento_id: 6,
				sede_id: 1,
				fecha_ingreso: "2024-01-15",
				rol_id: 2,
			},
			{
				id: 3,
				nombre: "Daniela Flores",
				email: "empleado@nemi.dev",
				contrasena: hash,
				departamento_id: 2,
				sede_id: 1,
				fecha_ingreso: "2024-06-10",
				rol_id: 4,
			},
			{
				id: 4,
				nombre: "Laura Peña",
				email: "laura@nemi.dev",
				contrasena: hash,
				departamento_id: 3,
				sede_id: 1,
				fecha_ingreso: "2023-09-05",
				rol_id: 4,
			},
			{
				id: 5,
				nombre: "Carlos Méndez",
				email: "carlos@nemi.dev",
				contrasena: hash,
				departamento_id: 1,
				sede_id: 2,
				fecha_ingreso: "2024-03-20",
				rol_id: 4,
			},
			{
				id: 6,
				nombre: "Sofía Ramírez",
				email: "sofia@nemi.dev",
				contrasena: hash,
				departamento_id: 4,
				sede_id: 2,
				fecha_ingreso: "2025-01-08",
				rol_id: 4,
			},
			{
				id: 7,
				nombre: "Roberto Vega",
				email: "roberto@nemi.dev",
				contrasena: hash,
				departamento_id: 5,
				sede_id: 1,
				fecha_ingreso: "2022-11-12",
				rol_id: 2,
			},
			{
				id: 8,
				nombre: "Patricia Duarte",
				email: "almacen@nemi.dev",
				contrasena: hash,
				departamento_id: 7,
				sede_id: 1,
				fecha_ingreso: "2024-08-30",
				rol_id: 3,
			},
		]);

		// ── Catálogos ───────────────────────────────────────────────────────
		await tx.insert(tiposActivo).values([
			{
				id: 1,
				nombre: "Hardware",
				slug: "hardware",
				categoria: "hardware",
				descripcion: "Equipos físicos",
			},
			{
				id: 2,
				nombre: "Software",
				slug: "software",
				categoria: "software",
				descripcion: "Aplicaciones instaladas",
			},
			{
				id: 3,
				nombre: "Licencia",
				slug: "licencia",
				categoria: "licencia",
				descripcion: "Suscripciones y licencias",
			},
			{
				id: 4,
				nombre: "Servicio en la nube",
				slug: "servicio",
				categoria: "servicio",
				descripcion: "SaaS y PaaS",
			},
		]);

		await tx.insert(proveedores).values([
			{ id: 1, nombre: "Dell México", tipo: "bienes" },
			{ id: 2, nombre: "Microsoft", tipo: "servicios" },
			{ id: 3, nombre: "AWS", tipo: "servicios" },
			{ id: 4, nombre: "Cisco", tipo: "ambos" },
			{ id: 5, nombre: "HP Inc.", tipo: "bienes" },
			{ id: 6, nombre: "Logitech", tipo: "bienes" },
			{ id: 7, nombre: "Apple", tipo: "bienes" },
			{ id: 8, nombre: "Adobe", tipo: "servicios" },
			{ id: 9, nombre: "Autodesk", tipo: "servicios" },
			{ id: 10, nombre: "Slack Technologies", tipo: "servicios" },
			{ id: 11, nombre: "Gen Digital", tipo: "servicios" },
			{ id: 12, nombre: "Google", tipo: "servicios" },
			{ id: 13, nombre: "Dropbox", tipo: "servicios" },
			{ id: 14, nombre: "Garantías Plus", tipo: "servicios" },
		]);

		const catalogoAcciones = [
			["activo.creado", "Activo creado"],
			["activo.actualizado", "Activo actualizado"],
			["activo.baja", "Baja del activo"],
			["asignacion.creada", "Activo asignado"],
			["asignacion.actualizada", "Asignación actualizada"],
			["asignacion.devuelta", "Activo devuelto"],
			["garantia.creada", "Garantía registrada"],
			["garantia.actualizada", "Garantía actualizada"],
			["garantia.eliminada", "Garantía eliminada"],
			["mantenimiento.abierto", "Mantenimiento abierto"],
			["mantenimiento.cerrado", "Mantenimiento cerrado"],
			["solicitud.creada", "Solicitud creada"],
			["solicitud.aprobada", "Solicitud aprobada"],
			["solicitud.rechazada", "Solicitud rechazada"],
			["solicitud.entregada", "Solicitud entregada"],
			["incidencia.reportada", "Incidencia reportada"],
			["incidencia.actualizada", "Incidencia actualizada"],
			["mantenimiento.actualizado", "Mantenimiento actualizado"],
			["adjunto.creado", "Adjunto agregado"],
			["adjunto.eliminado", "Adjunto eliminado"],
			["licencia.renovada", "Licencia renovada"],
			["licencia.asiento_asignado", "Asiento de licencia asignado"],
			["licencia.asiento_liberado", "Asiento de licencia liberado"],
			["persona.creada", "Persona creada"],
			["persona.actualizada", "Persona actualizada"],
			["persona.baja", "Baja de persona"],
			["persona.desbloqueada", "Cuenta desbloqueada"],
		] as const;

		await tx.insert(acciones).values(
			catalogoAcciones.map(([slug, nombre], indice) => ({
				id: indice + 1,
				slug,
				nombre,
			})),
		);

		const accionId = new Map(
			catalogoAcciones.map(([slug], indice) => [slug, indice + 1]),
		);

		await tx.insert(tiposReporte).values([
			{
				id: 1,
				slug: "activos_por_estado",
				nombre: "Activos por estado",
				descripcion: "Distribución del inventario por estado",
			},
			{
				id: 2,
				slug: "activos_por_usuario",
				nombre: "Activos por usuario",
				descripcion: "Equipos y licencias asignados a cada persona",
			},
			{
				id: 3,
				slug: "garantias",
				nombre: "Garantías",
				descripcion: "Cobertura por activo y su vigencia",
			},
			{
				id: 4,
				slug: "costos",
				nombre: "Valor del inventario",
				descripcion: "Inversión por tipo de activo",
			},
			{
				id: 5,
				slug: "historial",
				nombre: "Movimientos de asignación",
				descripcion: "Asignaciones y devoluciones por periodo",
			},
			{
				id: 6,
				slug: "activos_por_tipo",
				nombre: "Activos por tipo",
				descripcion: "Distribución del inventario por tipo",
			},
			{
				id: 7,
				slug: "activos_por_ubicacion",
				nombre: "Activos por ubicación",
				descripcion: "Distribución del inventario por ubicación",
			},
			{
				id: 8,
				slug: "licencias_cumplimiento",
				nombre: "Cumplimiento de licencias",
				descripcion: "Asientos comprados contra asientos en uso",
			},
			{
				id: 9,
				slug: "renovaciones_proximas",
				nombre: "Renovaciones próximas",
				descripcion: "Licencias que vencen en los próximos 60 días",
			},
			{
				id: 10,
				slug: "altas_bajas",
				nombre: "Altas y bajas",
				descripcion: "Movimientos del inventario en el último año",
			},
			{
				id: 11,
				slug: "mantenimientos_abiertos",
				nombre: "Mantenimientos abiertos",
				descripcion: "Equipos detenidos y su antigüedad",
			},
			{
				id: 12,
				slug: "incidencias_abiertas",
				nombre: "Incidencias por atender",
				descripcion: "Incidencias abiertas o en revisión",
			},
			{
				id: 13,
				slug: "activos_mas_fallas",
				nombre: "Activos con más fallas",
				descripcion: "Equipos con más incidencias registradas",
			},
			{
				id: 14,
				slug: "carga_tecnico",
				nombre: "Carga por técnico",
				descripcion: "Mantenimientos atendidos por técnico",
			},
			{
				id: 15,
				slug: "mantenimientos_proveedor",
				nombre: "Mantenimientos por proveedor",
				descripcion: "Intervenciones y costo por proveedor",
			},
			{
				id: 16,
				slug: "entregas_pendientes",
				nombre: "Entregas pendientes",
				descripcion: "Solicitudes aprobadas sin entregar",
			},
			{
				id: 17,
				slug: "activos_sin_ubicacion",
				nombre: "Activos sin ubicación",
				descripcion: "Equipos sin ubicación registrada",
			},
			{
				id: 18,
				slug: "movimientos_inventario",
				nombre: "Movimientos del inventario",
				descripcion: "Altas, bajas y asignaciones recientes",
			},
			{
				id: 19,
				slug: "mis_equipos",
				nombre: "Mis equipos",
				descripcion: "Equipos asignados a ti",
				alcance: "propio",
			},
			{
				id: 20,
				slug: "mis_garantias",
				nombre: "Mis garantías",
				descripcion: "Cobertura de tus equipos",
				alcance: "propio",
			},
			{
				id: 21,
				slug: "mis_solicitudes",
				nombre: "Mis solicitudes",
				descripcion: "Solicitudes que has creado",
				alcance: "propio",
			},
			{
				id: 22,
				slug: "mis_incidencias",
				nombre: "Mis incidencias",
				descripcion: "Incidencias que has reportado",
				alcance: "propio",
			},
		]);

		const permisosReportes: Array<{ tipo_id: number; rol_id: number }> = [];
		const agregar = (tipo: number, roles: number[]) => {
			for (const rol of roles)
				permisosReportes.push({ tipo_id: tipo, rol_id: rol });
		};
		const todos = [1, 2, 3];
		const operacion = [1, 2];
		agregar(1, todos);
		agregar(2, operacion);
		agregar(3, todos);
		agregar(4, [1]);
		agregar(5, todos);
		agregar(6, todos);
		agregar(7, todos);
		agregar(8, operacion);
		agregar(9, operacion);
		agregar(10, todos);
		agregar(11, operacion);
		agregar(12, operacion);
		agregar(13, operacion);
		agregar(14, operacion);
		agregar(15, operacion);
		agregar(16, todos);
		agregar(17, todos);
		agregar(18, todos);
		agregar(19, [4]);
		agregar(20, [4]);
		agregar(21, [4]);
		agregar(22, [4]);

		await tx.insert(tiposReporteRoles).values(permisosReportes);

		// ── Inventario ──────────────────────────────────────────────────────
		await tx.insert(activos).values([
			{
				id: 1,
				nombre: "Laptop Dell Latitude",
				tipo_id: 1,
				proveedor_id: 1,
				ubicacion_id: 1,
				dueno_id: 5,
				etiqueta_serial: "SN-DELL-001",
				estado: "disponible",
				condicion: "usado",
				fecha_adquisicion: "2025-06-15",
				valor_compra: "25000.00",
				modelo: "Latitude 5540",
			},
			{
				id: 2,
				nombre: "Servidor HP ProLiant",
				tipo_id: 1,
				proveedor_id: 5,
				ubicacion_id: 2,
				etiqueta_serial: "SN-HPE-882",
				estado: "asignado",
				condicion: "usado",
				fecha_adquisicion: "2025-09-20",
				valor_compra: "85000.00",
				modelo: "DL380 Gen11",
			},
			{
				id: 3,
				nombre: "Switch Cisco Catalyst",
				tipo_id: 1,
				proveedor_id: 4,
				ubicacion_id: 2,
				etiqueta_serial: "SN-CIS-123",
				estado: "asignado",
				condicion: "usado",
				fecha_adquisicion: "2025-12-05",
				valor_compra: "32000.00",
				modelo: "C1000-48T",
			},
			{
				id: 4,
				nombre: "Microsoft 365 Empresa",
				tipo_id: 3,
				proveedor_id: 2,
				ubicacion_id: 4,
				dueno_id: 1,
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2026-02-10",
				valor_compra: "15588.00",
			},
			{
				id: 5,
				nombre: "Windows 11 Pro",
				tipo_id: 2,
				proveedor_id: 2,
				ubicacion_id: 4,
				dueno_id: 1,
				estado: "asignado",
				condicion: "nuevo",
				fecha_adquisicion: "2026-04-15",
				valor_compra: "2600.00",
			},
			{
				id: 9,
				nombre: "Monitor Dell UltraSharp 27",
				tipo_id: 1,
				proveedor_id: 1,
				ubicacion_id: 1,
				etiqueta_serial: "ASSET-2025-006",
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2025-05-02",
				valor_compra: "8000.00",
			},
			{
				id: 10,
				nombre: "Mouse Logitech MX Master 3S",
				tipo_id: 1,
				proveedor_id: 6,
				ubicacion_id: 1,
				dueno_id: 3,
				etiqueta_serial: "ASSET-2025-007",
				estado: "asignado",
				condicion: "nuevo",
				fecha_adquisicion: "2025-05-02",
				valor_compra: "1800.00",
			},
			{
				id: 11,
				nombre: "iPad Pro 12.9",
				tipo_id: 1,
				proveedor_id: 7,
				ubicacion_id: 5,
				dueno_id: 6,
				etiqueta_serial: "ASSET-2025-008",
				estado: "asignado",
				condicion: "nuevo",
				fecha_adquisicion: "2025-05-02",
				valor_compra: "30000.00",
			},
			{
				id: 12,
				nombre: "Impresora HP LaserJet Pro M404dn",
				tipo_id: 1,
				proveedor_id: 5,
				ubicacion_id: 3,
				etiqueta_serial: "ASSET-2025-009",
				estado: "disponible",
				condicion: "usado",
				fecha_adquisicion: "2025-05-02",
				valor_compra: "6000.00",
			},
			{
				id: 13,
				nombre: "Router Ubiquiti UniFi 6 Pro",
				tipo_id: 1,
				proveedor_id: 4,
				ubicacion_id: 2,
				etiqueta_serial: "ASSET-2025-010",
				estado: "mantenimiento",
				condicion: "danado",
				fecha_adquisicion: "2025-05-02",
				valor_compra: "4500.00",
			},
			{
				id: 14,
				nombre: "UPS APC Smart-UPS 1500",
				tipo_id: 1,
				proveedor_id: 5,
				ubicacion_id: 2,
				etiqueta_serial: "ASSET-2025-011",
				estado: "disponible",
				condicion: "usado",
				fecha_adquisicion: "2025-05-02",
				valor_compra: "9000.00",
			},
			{
				id: 15,
				nombre: "Adobe Creative Cloud",
				tipo_id: 2,
				proveedor_id: 8,
				ubicacion_id: 4,
				dueno_id: 5,
				etiqueta_serial: "LIC-2025-012",
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2025-04-01",
				valor_compra: "15588.00",
			},
			{
				id: 16,
				nombre: "AutoCAD 2025",
				tipo_id: 2,
				proveedor_id: 9,
				ubicacion_id: 4,
				dueno_id: 6,
				etiqueta_serial: "LIC-2025-013",
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2025-04-01",
				valor_compra: "34788.00",
			},
			{
				id: 17,
				nombre: "Slack Enterprise",
				tipo_id: 2,
				proveedor_id: 10,
				ubicacion_id: 4,
				etiqueta_serial: "LIC-2025-014",
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2025-03-15",
				valor_compra: "10788.00",
			},
			{
				id: 21,
				nombre: "Norton 365 Premium",
				tipo_id: 3,
				proveedor_id: 11,
				ubicacion_id: 4,
				dueno_id: 5,
				etiqueta_serial: "LIC-2025-015",
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2025-04-30",
				valor_compra: "6475.00",
			},
			{
				id: 22,
				nombre: "VMware vSphere Standard",
				tipo_id: 3,
				proveedor_id: 1,
				ubicacion_id: 2,
				dueno_id: 1,
				etiqueta_serial: "LIC-2025-016",
				estado: "asignado",
				condicion: "nuevo",
				fecha_adquisicion: "2025-01-01",
				valor_compra: "7198.00",
			},
			{
				id: 23,
				nombre: "NordVPN Teams",
				tipo_id: 3,
				proveedor_id: 4,
				ubicacion_id: 4,
				etiqueta_serial: "LIC-2025-017",
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2025-01-01",
				valor_compra: "5990.00",
			},
			{
				id: 24,
				nombre: "Google Workspace Business",
				tipo_id: 4,
				proveedor_id: 12,
				ubicacion_id: 4,
				dueno_id: 6,
				etiqueta_serial: "SVC-2025-018",
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2025-03-01",
				valor_compra: "5988.00",
			},
			{
				id: 25,
				nombre: "AWS EC2 Reserved",
				tipo_id: 4,
				proveedor_id: 3,
				ubicacion_id: 4,
				dueno_id: 1,
				etiqueta_serial: "SVC-2025-019",
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2025-02-01",
				valor_compra: "19188.00",
			},
			{
				id: 26,
				nombre: "Dropbox Business",
				tipo_id: 4,
				proveedor_id: 13,
				ubicacion_id: 4,
				etiqueta_serial: "SVC-2025-020",
				estado: "disponible",
				condicion: "nuevo",
				fecha_adquisicion: "2025-04-01",
				valor_compra: "4188.00",
			},
		]);

		await tx.insert(licencias).values([
			{
				activo_id: 4,
				modalidad: "suscripcion",
				tipo_uso: "usuario",
				asientos_comprados: 5,
				costo: "15588.00",
				periodicidad_costo: "anual",
				renovacion_automatica: true,
				fecha_renovacion: "2026-11-16",
			},
			{
				activo_id: 5,
				modalidad: "perpetua",
				tipo_uso: "dispositivo",
				asientos_comprados: 1,
				costo: "2600.00",
				periodicidad_costo: "unica",
			},
			{
				activo_id: 15,
				modalidad: "suscripcion",
				tipo_uso: "usuario",
				asientos_comprados: 3,
				costo: "15588.00",
				periodicidad_costo: "anual",
				renovacion_automatica: true,
				fecha_renovacion: "2026-11-01",
			},
			{
				activo_id: 16,
				modalidad: "suscripcion",
				tipo_uso: "usuario",
				asientos_comprados: 2,
				costo: "34788.00",
				periodicidad_costo: "anual",
				renovacion_automatica: true,
				fecha_renovacion: "2026-11-01",
			},
			{
				activo_id: 17,
				modalidad: "suscripcion",
				tipo_uso: "usuario",
				asientos_comprados: 10,
				costo: "899.00",
				periodicidad_costo: "mensual",
				renovacion_automatica: true,
			},
			{
				activo_id: 21,
				modalidad: "suscripcion",
				tipo_uso: "usuario",
				asientos_comprados: 5,
				costo: "1299.00",
				periodicidad_costo: "anual",
				renovacion_automatica: false,
				fecha_renovacion: "2026-11-30",
			},
			{
				activo_id: 22,
				modalidad: "suscripcion",
				tipo_uso: "dispositivo",
				asientos_comprados: 2,
				costo: "3599.00",
				periodicidad_costo: "anual",
				renovacion_automatica: true,
				fecha_renovacion: "2026-12-15",
			},
			{
				activo_id: 23,
				modalidad: "suscripcion",
				tipo_uso: "usuario",
				asientos_comprados: 10,
				costo: "599.00",
				periodicidad_costo: "anual",
				renovacion_automatica: false,
				fecha_renovacion: "2025-12-31",
			},
			{
				activo_id: 24,
				modalidad: "suscripcion",
				tipo_uso: "usuario",
				asientos_comprados: 8,
				costo: "499.00",
				periodicidad_costo: "mensual",
				renovacion_automatica: true,
			},
			{
				activo_id: 25,
				modalidad: "suscripcion",
				tipo_uso: "volumen",
				asientos_comprados: 1,
				costo: "1599.00",
				periodicidad_costo: "anual",
				renovacion_automatica: true,
				fecha_renovacion: "2027-02-01",
			},
			{
				activo_id: 26,
				modalidad: "suscripcion",
				tipo_uso: "usuario",
				asientos_comprados: 6,
				costo: "349.00",
				periodicidad_costo: "mensual",
				renovacion_automatica: true,
			},
		]);

		// ── Movimientos ─────────────────────────────────────────────────────
		await tx.insert(asignaciones).values([
			{
				id: 1,
				activo_id: 2,
				persona_id: 2,
				departamento_id: 6,
				ubicacion_id: 2,
				fecha_asignacion: "2024-01-01",
			},
			{
				id: 2,
				activo_id: 3,
				persona_id: 1,
				departamento_id: 5,
				ubicacion_id: 2,
				fecha_asignacion: "2024-02-15",
			},
			{
				id: 3,
				activo_id: 1,
				persona_id: 5,
				departamento_id: 1,
				ubicacion_id: 1,
				fecha_asignacion: "2026-05-02",
				fecha_devolucion_real: "2026-05-09",
			},
			{
				id: 4,
				activo_id: 10,
				persona_id: 3,
				departamento_id: 2,
				ubicacion_id: 1,
				fecha_asignacion: "2026-06-01",
			},
			{
				id: 5,
				activo_id: 11,
				persona_id: 6,
				departamento_id: 4,
				ubicacion_id: 5,
				fecha_asignacion: "2026-06-05",
			},
		]);

		await tx.insert(asignacionesLicencia).values([
			{
				licencia_id: 4,
				asiento: 1,
				destino_tipo: "persona",
				persona_id: 4,
				fecha_asignacion: "2024-03-01",
			},
			{
				licencia_id: 4,
				asiento: 2,
				destino_tipo: "persona",
				persona_id: 3,
				fecha_asignacion: "2024-03-01",
			},
			{
				licencia_id: 5,
				asiento: 1,
				destino_tipo: "activo",
				activo_id: 1,
				fecha_asignacion: "2026-04-15",
			},
			{
				licencia_id: 15,
				asiento: 1,
				destino_tipo: "persona",
				persona_id: 5,
				fecha_asignacion: "2025-04-01",
			},
			{
				licencia_id: 15,
				asiento: 2,
				destino_tipo: "persona",
				persona_id: 6,
				fecha_asignacion: "2025-04-01",
			},
			{
				licencia_id: 16,
				asiento: 1,
				destino_tipo: "persona",
				persona_id: 6,
				fecha_asignacion: "2025-04-01",
			},
			{
				licencia_id: 17,
				asiento: 1,
				destino_tipo: "persona",
				persona_id: 1,
				fecha_asignacion: "2025-03-15",
			},
			{
				licencia_id: 17,
				asiento: 2,
				destino_tipo: "persona",
				persona_id: 2,
				fecha_asignacion: "2025-03-15",
			},
			{
				licencia_id: 17,
				asiento: 3,
				destino_tipo: "persona",
				persona_id: 3,
				fecha_asignacion: "2025-03-15",
			},
			{
				licencia_id: 17,
				asiento: 4,
				destino_tipo: "persona",
				persona_id: 4,
				fecha_asignacion: "2025-03-15",
			},
			{
				licencia_id: 21,
				asiento: 1,
				destino_tipo: "persona",
				persona_id: 2,
				fecha_asignacion: "2025-04-30",
			},
			{
				licencia_id: 21,
				asiento: 2,
				destino_tipo: "persona",
				persona_id: 7,
				fecha_asignacion: "2025-04-30",
			},
			{
				licencia_id: 22,
				asiento: 1,
				destino_tipo: "activo",
				activo_id: 2,
				fecha_asignacion: "2025-01-01",
			},
			{
				licencia_id: 22,
				asiento: 2,
				destino_tipo: "activo",
				activo_id: 3,
				fecha_asignacion: "2025-01-01",
			},
			{
				licencia_id: 24,
				asiento: 1,
				destino_tipo: "persona",
				persona_id: 1,
				fecha_asignacion: "2025-03-01",
			},
			{
				licencia_id: 24,
				asiento: 2,
				destino_tipo: "persona",
				persona_id: 8,
				fecha_asignacion: "2025-03-01",
			},
			{
				licencia_id: 26,
				asiento: 1,
				destino_tipo: "persona",
				persona_id: 1,
				fecha_asignacion: "2025-04-01",
			},
		]);

		await tx.insert(mantenimientos).values([
			{
				id: 1,
				activo_id: 13,
				responsable: "interno",
				tecnico_id: 7,
				tipo: "correctivo",
				fecha_salida: "2026-10-28",
				diagnostico: "Puerto WAN inestable, se revisa fuente de poder.",
				costo: "450.00",
				estado: "abierto",
			},
		]);

		await tx.insert(garantias).values([
			{
				id: 1,
				activo_id: 2,
				proveedor_id: 14,
				nombre: "Garantía extendida servidor",
				fecha_inicio: "2023-01-01",
				fecha_fin: "2026-05-11",
				costo: "12000.00",
			},
			{
				id: 2,
				activo_id: 3,
				proveedor_id: 4,
				nombre: "Cisco SmartNet",
				fecha_inicio: "2024-02-01",
				fecha_fin: "2027-02-01",
				costo: "8000.00",
			},
		]);

		await tx.insert(incidencias).values([
			{
				id: 1,
				activo_id: 13,
				reportante_id: 3,
				descripcion: "El router reinicia solo varias veces al día.",
				prioridad: "alta",
				estado: "en_revision",
				mantenimiento_id: 1,
			},
		]);

		await tx.insert(solicitudes).values([
			{
				id: 1,
				solicitante_id: 6,
				tipo: "equipo",
				tipo_activo_id: 1,
				motivo: "Equipo de reemplazo para diseño gráfico.",
				prioridad: "media",
				estado: "pendiente",
			},
		]);

		// ── Auditoría y sistema ─────────────────────────────────────────────
		await tx.insert(eventos).values([
			{
				entidad: "activo",
				entidad_id: 1,
				accion_id: accionId.get("activo.creado") as number,
				actor_id: 1,
				datos_nuevos: { nombre: "Laptop Dell Latitude", estado: "disponible" },
			},
			{
				entidad: "activo",
				entidad_id: 2,
				accion_id: accionId.get("activo.creado") as number,
				actor_id: 1,
				datos_nuevos: { nombre: "Servidor HP ProLiant" },
			},
			{
				entidad: "asignacion",
				entidad_id: 1,
				accion_id: accionId.get("asignacion.creada") as number,
				actor_id: 1,
				datos_nuevos: { activo_id: 2, persona_id: 2 },
			},
			{
				entidad: "asignacion",
				entidad_id: 3,
				accion_id: accionId.get("asignacion.devuelta") as number,
				actor_id: 1,
				datos_anteriores: { fecha_devolucion_real: null },
				datos_nuevos: { fecha_devolucion_real: "2026-05-09" },
			},
			{
				entidad: "mantenimiento",
				entidad_id: 1,
				accion_id: accionId.get("mantenimiento.abierto") as number,
				actor_id: 7,
				datos_nuevos: { activo_id: 13, tipo: "correctivo" },
			},
			{
				entidad: "garantia",
				entidad_id: 1,
				accion_id: accionId.get("garantia.creada") as number,
				actor_id: 1,
				datos_nuevos: { activo_id: 2, fecha_fin: "2026-05-11" },
			},
			{
				entidad: "incidencia",
				entidad_id: 1,
				accion_id: accionId.get("incidencia.reportada") as number,
				actor_id: 3,
				datos_nuevos: { activo_id: 13, prioridad: "alta" },
			},
			{
				entidad: "solicitud",
				entidad_id: 1,
				accion_id: accionId.get("solicitud.creada") as number,
				actor_id: 6,
				datos_nuevos: { tipo: "equipo", prioridad: "media" },
			},
		]);

		await tx.insert(configuracion).values({
			id: 1,
			idioma: "es",
			zona_horaria: "America/Mexico_City",
			moneda: "MXN",
			formato_fecha: "DD/MM/YYYY",
			dias_alerta_licencia: 30,
			dias_alerta_garantia: 30,
			dias_alerta_devolucion: 7,
			dias_alerta_mantenimiento: 3,
		});
	});

	console.log("✅ Seed aplicado");
	console.log(`   Usuarios de prueba (contraseña: ${CONTRASENA})`);
	console.log("   admin@nemi.dev     · administrador");
	console.log("   tecnico@nemi.dev   · tecnico");
	console.log("   almacen@nemi.dev   · almacen");
	console.log("   empleado@nemi.dev  · empleado");
}

main()
	.catch((error: unknown) => {
		console.error("❌ Error en el seed:", (error as Error).message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
