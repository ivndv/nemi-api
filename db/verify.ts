import "dotenv/config";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db.js";

// Consultas de verificación: conteos e invariantes del modelo
const conteos = [
	"roles",
	"departamentos",
	"sedes",
	"ubicaciones",
	"personas",
	"tipos_activo",
	"proveedores",
	"acciones",
	"tipos_reporte",
	"tipos_reporte_roles",
	"reportes_generados",
	"activos",
	"licencias",
	"adjuntos",
	"asignaciones",
	"asignaciones_licencia",
	"mantenimientos",
	"solicitudes",
	"incidencias",
	"renovaciones_licencia",
	"garantias",
	"eventos",
	"configuracion",
];

const invariantes: Array<{ nombre: string; sql: string }> = [
	{
		nombre: "Activos con más de una asignación activa",
		sql: `SELECT activo_id, COUNT(*) AS total
		      FROM asignaciones WHERE fecha_devolucion_real IS NULL
		      GROUP BY activo_id HAVING total > 1`,
	},
	{
		nombre: "Activos de hardware 'asignado' sin asignación activa",
		sql: `SELECT a.id FROM activos a
		      WHERE a.estado = 'asignado' AND a.deleted_at IS NULL
		        AND NOT EXISTS (SELECT 1 FROM licencias l WHERE l.activo_id = a.id)
		        AND NOT EXISTS (SELECT 1 FROM asignaciones s
		                        WHERE s.activo_id = a.id AND s.fecha_devolucion_real IS NULL)`,
	},
	{
		nombre: "Licencias 'asignado' con asientos libres",
		sql: `SELECT l.activo_id FROM licencias l
		      JOIN activos a ON a.id = l.activo_id
		      WHERE a.estado = 'asignado' AND a.deleted_at IS NULL
		        AND (SELECT COUNT(*) FROM asignaciones_licencia al
		             WHERE al.licencia_id = l.activo_id AND al.fecha_liberacion IS NULL)
		            < l.asientos_comprados`,
	},
	{
		nombre: "Licencias 'disponible' con todos los asientos ocupados",
		sql: `SELECT l.activo_id FROM licencias l
		      JOIN activos a ON a.id = l.activo_id
		      WHERE a.estado = 'disponible' AND a.deleted_at IS NULL
		        AND (SELECT COUNT(*) FROM asignaciones_licencia al
		             WHERE al.licencia_id = l.activo_id AND al.fecha_liberacion IS NULL)
		            >= l.asientos_comprados`,
	},
	{
		nombre: "Activos 'disponible' con asignación activa",
		sql: `SELECT a.id FROM activos a
		      WHERE a.estado = 'disponible' AND a.deleted_at IS NULL
		        AND EXISTS (SELECT 1 FROM asignaciones s
		                    WHERE s.activo_id = a.id AND s.fecha_devolucion_real IS NULL)`,
	},
	{
		nombre: "Seriales duplicados",
		sql: `SELECT etiqueta_serial, COUNT(*) AS total FROM activos
		      WHERE etiqueta_serial IS NOT NULL
		      GROUP BY etiqueta_serial HAVING total > 1`,
	},
	{
		nombre: "Licencias con asientos ocupados por encima de lo comprado",
		sql: `SELECT l.activo_id, l.asientos_comprados,
		             COUNT(al.id) AS ocupados
		      FROM licencias l
		      LEFT JOIN asignaciones_licencia al
		        ON al.licencia_id = l.activo_id AND al.fecha_liberacion IS NULL
		      GROUP BY l.activo_id, l.asientos_comprados
		      HAVING ocupados > l.asientos_comprados`,
	},
	{
		nombre: "Mantenimientos abiertos duplicados por activo",
		sql: `SELECT activo_id, COUNT(*) AS total FROM mantenimientos
		      WHERE estado = 'abierto' GROUP BY activo_id HAVING total > 1`,
	},
	{
		nombre: "Licencias asignadas como activo de hardware",
		sql: `SELECT s.id FROM asignaciones s
		      JOIN licencias l ON l.activo_id = s.activo_id
		      WHERE s.fecha_devolucion_real IS NULL`,
	},
	{
		nombre: "Personas sin fecha de ingreso",
		sql: `SELECT id FROM personas WHERE fecha_ingreso IS NULL`,
	},
	{
		nombre: "Tipos de reporte sin roles asignados",
		sql: `SELECT t.id FROM tipos_reporte t
		      WHERE NOT EXISTS (
		        SELECT 1 FROM tipos_reporte_roles r WHERE r.tipo_id = t.id
		      )`,
	},
];

async function main() {
	console.log("\n📊 Conteos");
	for (const tabla of conteos) {
		const [filas] = await pool.query<RowDataPacket[]>(
			`SELECT COUNT(*) AS total FROM \`${tabla}\``,
		);
		const total = String(filas[0]?.total ?? 0).padStart(4, " ");
		console.log(`   ${tabla.padEnd(24)} ${total}`);
	}

	const [dinero] = await pool.query<RowDataPacket[]>(
		`SELECT COALESCE(SUM(valor_compra), 0) AS total
		 FROM activos WHERE deleted_at IS NULL`,
	);
	console.log(
		`\n💰 Valor del inventario: ${String(dinero[0]?.total ?? 0)} MXN`,
	);

	let fallos = 0;
	console.log("\n🔎 Invariantes");
	for (const { nombre, sql } of invariantes) {
		const [filas] = await pool.query<RowDataPacket[]>(sql);
		if (filas.length === 0) {
			console.log(`   ✅ ${nombre}`);
		} else {
			fallos++;
			console.log(`   ❌ ${nombre} (${filas.length} casos)`);
			console.table(filas);
		}
	}

	if (fallos > 0) {
		process.exitCode = 1;
		console.log(`\n❌ ${fallos} invariante(s) roto(s)`);
	} else {
		console.log("\n✅ Todo consistente");
	}
}

main()
	.catch((error: unknown) => {
		console.error("❌ Error al verificar:", (error as Error).message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
