import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	decimal,
	foreignKey,
	index,
	int,
	json,
	mysqlEnum,
	mysqlTable,
	primaryKey,
	text,
	timestamp,
	tinyint,
	uniqueIndex,
	varchar,
} from "drizzle-orm/mysql-core";

// Marcas de tiempo comunes a la mayoría de las tablas
const marcasDeTiempo = () => ({
	created_at: timestamp("created_at").defaultNow().notNull(),
	updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
	deleted_at: timestamp("deleted_at"),
});

// ─── Organización ────────────────────────────────────────────────────────────

export const roles = mysqlTable(
	"roles",
	{
		id: tinyint("id").primaryKey(),
		slug: varchar("slug", { length: 30 }).notNull(),
		nombre: varchar("nombre", { length: 50 }).notNull(),
		descripcion: varchar("descripcion", { length: 255 }),
		...marcasDeTiempo(),
	},
	(t) => [uniqueIndex("uq_roles_slug").on(t.slug)],
);

export const departamentos = mysqlTable(
	"departamentos",
	{
		id: int("id").autoincrement().primaryKey(),
		nombre: varchar("nombre", { length: 100 }).notNull(),
		nombre_activo: varchar("nombre_activo", { length: 100 }).generatedAlwaysAs(
			sql`if(\`deleted_at\` is null, \`nombre\`, null)`,
			{ mode: "stored" },
		),
		...marcasDeTiempo(),
	},
	(t) => [uniqueIndex("uq_departamentos_nombre_activo").on(t.nombre_activo)],
);

export const sedes = mysqlTable(
	"sedes",
	{
		id: int("id").autoincrement().primaryKey(),
		nombre: varchar("nombre", { length: 150 }).notNull(),
		nombre_activo: varchar("nombre_activo", { length: 150 }).generatedAlwaysAs(
			sql`if(\`deleted_at\` is null, \`nombre\`, null)`,
			{ mode: "stored" },
		),
		ciudad: varchar("ciudad", { length: 100 }),
		direccion: varchar("direccion", { length: 255 }),
		...marcasDeTiempo(),
	},
	(t) => [uniqueIndex("uq_sedes_nombre_activo").on(t.nombre_activo)],
);

export const ubicaciones = mysqlTable(
	"ubicaciones",
	{
		id: int("id").autoincrement().primaryKey(),
		sede_id: int("sede_id").notNull(),
		padre_id: int("padre_id"),
		nombre: varchar("nombre", { length: 150 }).notNull(),
		nombre_activo: varchar("nombre_activo", { length: 150 }).generatedAlwaysAs(
			sql`if(\`deleted_at\` is null, \`nombre\`, null)`,
			{ mode: "stored" },
		),
		tipo: mysqlEnum("tipo", ["edificio", "piso", "sala", "almacen"])
			.notNull()
			.default("sala"),
		...marcasDeTiempo(),
	},
	(t) => [
		uniqueIndex("uq_ubicaciones_sede_nombre_activo").on(
			t.sede_id,
			t.nombre_activo,
		),
		index("idx_ubicaciones_sede").on(t.sede_id),
		index("idx_ubicaciones_padre").on(t.padre_id),
		foreignKey({
			name: "fk_ubicaciones_sede",
			columns: [t.sede_id],
			foreignColumns: [sedes.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_ubicaciones_padre",
			columns: [t.padre_id],
			foreignColumns: [t.id],
		}).onDelete("set null"),
	],
);

export const personas = mysqlTable(
	"personas",
	{
		id: int("id").autoincrement().primaryKey(),
		nombre: varchar("nombre", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }).notNull(),
		email_activo: varchar("email_activo", { length: 255 }).generatedAlwaysAs(
			sql`if(\`deleted_at\` is null, \`email\`, null)`,
			{ mode: "stored" },
		),
		contrasena: varchar("contrasena", { length: 255 }).notNull(),
		departamento_id: int("departamento_id"),
		sede_id: int("sede_id"),
		fecha_ingreso: date("fecha_ingreso", { mode: "string" }).notNull(),
		rol_id: tinyint("rol_id").notNull().default(4),
		foto_url: varchar("foto_url", { length: 500 }),
		ultimo_acceso: timestamp("ultimo_acceso"),
		token_version: int("token_version").notNull().default(0),
		intentos_fallidos: int("intentos_fallidos").notNull().default(0),
		bloqueado_hasta: timestamp("bloqueado_hasta"),
		...marcasDeTiempo(),
	},
	(t) => [
		uniqueIndex("uq_personas_email_activo").on(t.email_activo),
		index("idx_personas_departamento").on(t.departamento_id),
		index("idx_personas_sede").on(t.sede_id),
		index("idx_personas_rol").on(t.rol_id),
		foreignKey({
			name: "fk_personas_rol",
			columns: [t.rol_id],
			foreignColumns: [roles.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_personas_departamento",
			columns: [t.departamento_id],
			foreignColumns: [departamentos.id],
		}).onDelete("set null"),
		foreignKey({
			name: "fk_personas_sede",
			columns: [t.sede_id],
			foreignColumns: [sedes.id],
		}).onDelete("set null"),
	],
);

// ─── Catálogos ───────────────────────────────────────────────────────────────

export const tiposActivo = mysqlTable(
	"tipos_activo",
	{
		id: int("id").autoincrement().primaryKey(),
		nombre: varchar("nombre", { length: 100 }).notNull(),
		nombre_activo: varchar("nombre_activo", { length: 100 }).generatedAlwaysAs(
			sql`if(\`deleted_at\` is null, \`nombre\`, null)`,
			{ mode: "stored" },
		),
		slug: varchar("slug", { length: 100 }).notNull(),
		slug_activo: varchar("slug_activo", { length: 100 }).generatedAlwaysAs(
			sql`if(\`deleted_at\` is null, \`slug\`, null)`,
			{ mode: "stored" },
		),
		categoria: mysqlEnum("categoria", [
			"hardware",
			"software",
			"licencia",
			"servicio",
			"accesorio",
		])
			.notNull()
			.default("hardware"),
		descripcion: varchar("descripcion", { length: 255 }),
		...marcasDeTiempo(),
	},
	(t) => [
		uniqueIndex("uq_tipos_activo_nombre_activo").on(t.nombre_activo),
		uniqueIndex("uq_tipos_activo_slug_activo").on(t.slug_activo),
	],
);

export const proveedores = mysqlTable(
	"proveedores",
	{
		id: int("id").autoincrement().primaryKey(),
		nombre: varchar("nombre", { length: 255 }).notNull(),
		nombre_activo: varchar("nombre_activo", { length: 255 }).generatedAlwaysAs(
			sql`if(\`deleted_at\` is null, \`nombre\`, null)`,
			{ mode: "stored" },
		),
		tipo: mysqlEnum("tipo", ["bienes", "servicios", "ambos"])
			.notNull()
			.default("bienes"),
		contacto: varchar("contacto", { length: 255 }),
		telefono: varchar("telefono", { length: 30 }),
		email: varchar("email", { length: 255 }),
		direccion: varchar("direccion", { length: 255 }),
		notas: varchar("notas", { length: 255 }),
		...marcasDeTiempo(),
	},
	(t) => [uniqueIndex("uq_proveedores_nombre").on(t.nombre)],
);

export const acciones = mysqlTable(
	"acciones",
	{
		id: int("id").autoincrement().primaryKey(),
		slug: varchar("slug", { length: 100 }).notNull(),
		nombre: varchar("nombre", { length: 150 }).notNull(),
		created_at: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [uniqueIndex("uq_acciones_slug").on(t.slug)],
);

export const tiposReporte = mysqlTable(
	"tipos_reporte",
	{
		id: int("id").autoincrement().primaryKey(),
		slug: varchar("slug", { length: 100 }).notNull(),
		nombre: varchar("nombre", { length: 255 }).notNull(),
		descripcion: varchar("descripcion", { length: 255 }),
		alcance: mysqlEnum("alcance", ["global", "propio"])
			.notNull()
			.default("global"),
		activo: boolean("activo").notNull().default(true),
		...marcasDeTiempo(),
	},
	(t) => [uniqueIndex("uq_tipos_reporte_slug").on(t.slug)],
);

export const tiposReporteRoles = mysqlTable(
	"tipos_reporte_roles",
	{
		tipo_id: int("tipo_id").notNull(),
		rol_id: tinyint("rol_id").notNull(),
	},
	(t) => [
		primaryKey({ columns: [t.tipo_id, t.rol_id] }),
		foreignKey({
			name: "fk_tipos_reporte_roles_tipo",
			columns: [t.tipo_id],
			foreignColumns: [tiposReporte.id],
		}).onDelete("cascade"),
		foreignKey({
			name: "fk_tipos_reporte_roles_rol",
			columns: [t.rol_id],
			foreignColumns: [roles.id],
		}).onDelete("cascade"),
	],
);

// ─── Inventario ──────────────────────────────────────────────────────────────

export const activos = mysqlTable(
	"activos",
	{
		id: int("id").autoincrement().primaryKey(),
		nombre: varchar("nombre", { length: 255 }).notNull(),
		tipo_id: int("tipo_id").notNull(),
		proveedor_id: int("proveedor_id").notNull(),
		ubicacion_id: int("ubicacion_id"),
		dueno_id: int("dueno_id"),
		etiqueta_serial: varchar("etiqueta_serial", { length: 100 }),
		serial_activo: varchar("serial_activo", { length: 100 }).generatedAlwaysAs(
			sql`if(\`deleted_at\` is null, \`etiqueta_serial\`, null)`,
			{ mode: "stored" },
		),
		estado: mysqlEnum("estado", ["disponible", "asignado", "mantenimiento"])
			.notNull()
			.default("disponible"),
		condicion: mysqlEnum("condicion", ["nuevo", "usado", "danado"])
			.notNull()
			.default("nuevo"),
		fecha_adquisicion: date("fecha_adquisicion", { mode: "string" }),
		valor_compra: decimal("valor_compra", { precision: 12, scale: 2 }),
		modelo: varchar("modelo", { length: 100 }),
		descripcion: varchar("descripcion", { length: 500 }),
		foto_url: varchar("foto_url", { length: 500 }),
		...marcasDeTiempo(),
	},
	(t) => [
		uniqueIndex("uq_activos_serial_activo").on(t.serial_activo),
		index("idx_activos_tipo").on(t.tipo_id),
		index("idx_activos_proveedor").on(t.proveedor_id),
		index("idx_activos_ubicacion").on(t.ubicacion_id),
		index("idx_activos_dueno").on(t.dueno_id),
		index("idx_activos_estado").on(t.estado),
		index("idx_activos_deleted").on(t.deleted_at),
		index("idx_activos_vigentes").on(t.deleted_at, t.estado),
		index("idx_activos_vigentes_tipo").on(t.deleted_at, t.tipo_id),
		index("idx_activos_vigentes_ubicacion").on(t.deleted_at, t.ubicacion_id),
		foreignKey({
			name: "fk_activos_tipo",
			columns: [t.tipo_id],
			foreignColumns: [tiposActivo.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_activos_proveedor",
			columns: [t.proveedor_id],
			foreignColumns: [proveedores.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_activos_ubicacion",
			columns: [t.ubicacion_id],
			foreignColumns: [ubicaciones.id],
		}).onDelete("set null"),
		foreignKey({
			name: "fk_activos_dueno",
			columns: [t.dueno_id],
			foreignColumns: [personas.id],
		}).onDelete("set null"),
	],
);

export const licencias = mysqlTable(
	"licencias",
	{
		activo_id: int("activo_id").primaryKey(),
		modalidad: mysqlEnum("modalidad", ["perpetua", "suscripcion"]).notNull(),
		tipo_uso: mysqlEnum("tipo_uso", [
			"dispositivo",
			"usuario",
			"concurrente",
			"volumen",
		]).notNull(),
		asientos_comprados: int("asientos_comprados").notNull().default(1),
		costo: decimal("costo", { precision: 12, scale: 2 }),
		periodicidad_costo: mysqlEnum("periodicidad_costo", [
			"mensual",
			"anual",
			"unica",
		])
			.notNull()
			.default("anual"),
		referencia_clave: varchar("referencia_clave", { length: 255 }),
		renovacion_automatica: boolean("renovacion_automatica")
			.notNull()
			.default(false),
		fecha_renovacion: date("fecha_renovacion", { mode: "string" }),
		...marcasDeTiempo(),
	},
	(t) => [
		index("idx_licencias_renovacion").on(t.fecha_renovacion),
		check("chk_licencias_asientos", sql`${t.asientos_comprados} > 0`),
		foreignKey({
			name: "fk_licencias_activo",
			columns: [t.activo_id],
			foreignColumns: [activos.id],
		}).onDelete("cascade"),
	],
);

export const adjuntos = mysqlTable(
	"adjuntos",
	{
		id: int("id").autoincrement().primaryKey(),
		entidad: mysqlEnum("entidad", [
			"activo",
			"licencia",
			"garantia",
			"mantenimiento",
			"incidencia",
			"solicitud",
		]).notNull(),
		entidad_id: int("entidad_id").notNull(),
		tipo: mysqlEnum("tipo", ["factura", "poliza", "acta", "foto", "otro"])
			.notNull()
			.default("otro"),
		nombre: varchar("nombre", { length: 255 }).notNull(),
		key: varchar("key", { length: 500 }),
		url: varchar("url", { length: 500 }).notNull(),
		mime: varchar("mime", { length: 100 }).notNull(),
		tamano: int("tamano").notNull(),
		subido_por: int("subido_por"),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
		deleted_at: timestamp("deleted_at"),
	},
	(t) => [
		index("idx_adjuntos_entidad").on(t.entidad, t.entidad_id),
		foreignKey({
			name: "fk_adjuntos_persona",
			columns: [t.subido_por],
			foreignColumns: [personas.id],
		}).onDelete("set null"),
	],
);

// ─── Movimientos ─────────────────────────────────────────────────────────────

export const asignaciones = mysqlTable(
	"asignaciones",
	{
		id: int("id").autoincrement().primaryKey(),
		activo_id: int("activo_id").notNull(),
		persona_id: int("persona_id").notNull(),
		departamento_id: int("departamento_id").notNull(),
		ubicacion_id: int("ubicacion_id").notNull(),
		fecha_asignacion: date("fecha_asignacion", { mode: "string" }).notNull(),
		fecha_devolucion_pactada: date("fecha_devolucion_pactada", {
			mode: "string",
		}),
		fecha_devolucion_real: date("fecha_devolucion_real", { mode: "string" }),
		comentarios: varchar("comentarios", { length: 255 }),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
		// Ranura de exclusividad: 1 mientras la asignación siga activa
		slot_activo: int("slot_activo").generatedAlwaysAs(
			sql`if(\`fecha_devolucion_real\` is null, 1, null)`,
			{ mode: "stored" },
		),
	},
	(t) => [
		uniqueIndex("uq_asignacion_activa").on(t.activo_id, t.slot_activo),
		index("idx_asignaciones_persona").on(t.persona_id),
		index("idx_asignaciones_devolucion").on(t.fecha_devolucion_real),
		index("idx_asignaciones_persona_activa").on(
			t.persona_id,
			t.fecha_devolucion_real,
		),
		check(
			"chk_asignaciones_fechas",
			sql`${t.fecha_devolucion_real} is null or ${t.fecha_devolucion_real} >= ${t.fecha_asignacion}`,
		),
		foreignKey({
			name: "fk_asignaciones_activo",
			columns: [t.activo_id],
			foreignColumns: [activos.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_asignaciones_persona",
			columns: [t.persona_id],
			foreignColumns: [personas.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_asignaciones_departamento",
			columns: [t.departamento_id],
			foreignColumns: [departamentos.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_asignaciones_ubicacion",
			columns: [t.ubicacion_id],
			foreignColumns: [ubicaciones.id],
		}).onDelete("restrict"),
	],
);

export const asignacionesLicencia = mysqlTable(
	"asignaciones_licencia",
	{
		id: int("id").autoincrement().primaryKey(),
		licencia_id: int("licencia_id").notNull(),
		asiento: int("asiento").notNull(),
		destino_tipo: mysqlEnum("destino_tipo", ["persona", "activo"]).notNull(),
		persona_id: int("persona_id"),
		activo_id: int("activo_id"),
		fecha_asignacion: date("fecha_asignacion", { mode: "string" }).notNull(),
		fecha_liberacion: date("fecha_liberacion", { mode: "string" }),
		created_at: timestamp("created_at").defaultNow().notNull(),
		// Ranura de exclusividad por asiento mientras siga ocupado
		slot_asiento: int("slot_asiento").generatedAlwaysAs(
			sql`if(\`fecha_liberacion\` is null, \`asiento\`, null)`,
			{ mode: "stored" },
		),
	},
	(t) => [
		uniqueIndex("uq_asiento_activo").on(t.licencia_id, t.slot_asiento),
		index("idx_asignaciones_licencia_persona").on(t.persona_id),
		index("idx_asignaciones_licencia_activo").on(t.activo_id),
		check("chk_asientos_positivos", sql`${t.asiento} > 0`),
		check(
			"chk_asignaciones_licencia_destino",
			sql`(${t.destino_tipo} = 'persona' and ${t.persona_id} is not null and ${t.activo_id} is null) or (${t.destino_tipo} = 'activo' and ${t.activo_id} is not null and ${t.persona_id} is null)`,
		),
		foreignKey({
			name: "fk_asignaciones_licencia_licencia",
			columns: [t.licencia_id],
			foreignColumns: [licencias.activo_id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_asignaciones_licencia_persona",
			columns: [t.persona_id],
			foreignColumns: [personas.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_asignaciones_licencia_activo",
			columns: [t.activo_id],
			foreignColumns: [activos.id],
		}).onDelete("restrict"),
	],
);

export const mantenimientos = mysqlTable(
	"mantenimientos",
	{
		id: int("id").autoincrement().primaryKey(),
		activo_id: int("activo_id").notNull(),
		responsable: mysqlEnum("responsable", ["interno", "externo"]).notNull(),
		tecnico_id: int("tecnico_id"),
		proveedor_id: int("proveedor_id"),
		tipo: mysqlEnum("tipo", ["preventivo", "correctivo"]).notNull(),
		fecha_salida: date("fecha_salida", { mode: "string" }).notNull(),
		fecha_retorno: date("fecha_retorno", { mode: "string" }),
		diagnostico: text("diagnostico"),
		costo: decimal("costo", { precision: 12, scale: 2 }),
		estado: mysqlEnum("estado", ["abierto", "cerrado"])
			.notNull()
			.default("abierto"),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
		// Solo un mantenimiento abierto por activo
		slot_abierto: int("slot_abierto").generatedAlwaysAs(
			sql`if(\`estado\` = 'abierto', 1, null)`,
			{ mode: "stored" },
		),
	},
	(t) => [
		uniqueIndex("uq_mantenimiento_abierto").on(t.activo_id, t.slot_abierto),
		index("idx_mantenimientos_estado").on(t.estado),
		check(
			"chk_mantenimientos_responsable",
			sql`(${t.responsable} = 'interno' and ${t.tecnico_id} is not null) or (${t.responsable} = 'externo' and ${t.proveedor_id} is not null)`,
		),
		check(
			"chk_mantenimientos_fechas",
			sql`${t.fecha_retorno} is null or ${t.fecha_retorno} >= ${t.fecha_salida}`,
		),
		foreignKey({
			name: "fk_mantenimientos_activo",
			columns: [t.activo_id],
			foreignColumns: [activos.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_mantenimientos_tecnico",
			columns: [t.tecnico_id],
			foreignColumns: [personas.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_mantenimientos_proveedor",
			columns: [t.proveedor_id],
			foreignColumns: [proveedores.id],
		}).onDelete("restrict"),
	],
);

export const solicitudes = mysqlTable(
	"solicitudes",
	{
		id: int("id").autoincrement().primaryKey(),
		solicitante_id: int("solicitante_id").notNull(),
		tipo: mysqlEnum("tipo", [
			"equipo",
			"licencia",
			"accesorio",
			"reemplazo",
		]).notNull(),
		tipo_activo_id: int("tipo_activo_id"),
		motivo: text("motivo").notNull(),
		prioridad: mysqlEnum("prioridad", ["baja", "media", "alta"])
			.notNull()
			.default("media"),
		estado: mysqlEnum("estado", [
			"pendiente",
			"aprobada",
			"rechazada",
			"entregada",
		])
			.notNull()
			.default("pendiente"),
		resuelta_por: int("resuelta_por"),
		activo_id: int("activo_id"),
		fecha_resolucion: date("fecha_resolucion", { mode: "string" }),
		...marcasDeTiempo(),
	},
	(t) => [
		index("idx_solicitudes_estado").on(t.estado, t.created_at),
		index("idx_solicitudes_solicitante").on(t.solicitante_id),
		index("idx_solicitudes_solicitante_estado").on(t.solicitante_id, t.estado),
		foreignKey({
			name: "fk_solicitudes_solicitante",
			columns: [t.solicitante_id],
			foreignColumns: [personas.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_solicitudes_resuelta_por",
			columns: [t.resuelta_por],
			foreignColumns: [personas.id],
		}).onDelete("set null"),
		foreignKey({
			name: "fk_solicitudes_tipo_activo",
			columns: [t.tipo_activo_id],
			foreignColumns: [tiposActivo.id],
		}).onDelete("set null"),
		foreignKey({
			name: "fk_solicitudes_activo",
			columns: [t.activo_id],
			foreignColumns: [activos.id],
		}).onDelete("set null"),
	],
);

export const incidencias = mysqlTable(
	"incidencias",
	{
		id: int("id").autoincrement().primaryKey(),
		activo_id: int("activo_id").notNull(),
		reportante_id: int("reportante_id").notNull(),
		descripcion: text("descripcion").notNull(),
		prioridad: mysqlEnum("prioridad", ["baja", "media", "alta"])
			.notNull()
			.default("media"),
		estado: mysqlEnum("estado", [
			"abierta",
			"en_revision",
			"resuelta",
			"cerrada",
		])
			.notNull()
			.default("abierta"),
		mantenimiento_id: int("mantenimiento_id"),
		fecha_resolucion: date("fecha_resolucion", { mode: "string" }),
		...marcasDeTiempo(),
	},
	(t) => [
		index("idx_incidencias_estado").on(t.estado, t.created_at),
		index("idx_incidencias_activo").on(t.activo_id),
		foreignKey({
			name: "fk_incidencias_activo",
			columns: [t.activo_id],
			foreignColumns: [activos.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_incidencias_reportante",
			columns: [t.reportante_id],
			foreignColumns: [personas.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_incidencias_mantenimiento",
			columns: [t.mantenimiento_id],
			foreignColumns: [mantenimientos.id],
		}).onDelete("set null"),
	],
);

export const renovacionesLicencia = mysqlTable(
	"renovaciones_licencia",
	{
		id: int("id").autoincrement().primaryKey(),
		licencia_id: int("licencia_id").notNull(),
		fecha: date("fecha", { mode: "string" }).notNull(),
		asientos: int("asientos").notNull(),
		costo: decimal("costo", { precision: 12, scale: 2 }),
		adjunto_id: int("adjunto_id"),
		created_at: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("idx_renovaciones_licencia").on(t.licencia_id),
		foreignKey({
			name: "fk_renovaciones_licencia",
			columns: [t.licencia_id],
			foreignColumns: [licencias.activo_id],
		}).onDelete("cascade"),
		foreignKey({
			name: "fk_renovaciones_adjunto",
			columns: [t.adjunto_id],
			foreignColumns: [adjuntos.id],
		}).onDelete("set null"),
	],
);

// ─── Cobertura ───────────────────────────────────────────────────────────────

export const garantias = mysqlTable(
	"garantias",
	{
		id: int("id").autoincrement().primaryKey(),
		activo_id: int("activo_id").notNull(),
		proveedor_id: int("proveedor_id").notNull(),
		nombre: varchar("nombre", { length: 255 }).notNull(),
		fecha_inicio: date("fecha_inicio", { mode: "string" }).notNull(),
		fecha_fin: date("fecha_fin", { mode: "string" }).notNull(),
		costo: decimal("costo", { precision: 12, scale: 2 }),
		condiciones: varchar("condiciones", { length: 500 }),
		descripcion: varchar("descripcion", { length: 500 }),
		...marcasDeTiempo(),
	},
	(t) => [
		index("idx_garantias_activo").on(t.activo_id),
		index("idx_garantias_fecha_fin").on(t.fecha_fin),
		check("chk_garantias_fechas", sql`${t.fecha_fin} > ${t.fecha_inicio}`),
		foreignKey({
			name: "fk_garantias_activo",
			columns: [t.activo_id],
			foreignColumns: [activos.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_garantias_proveedor",
			columns: [t.proveedor_id],
			foreignColumns: [proveedores.id],
		}).onDelete("restrict"),
	],
);

// ─── Auditoría y sistema ─────────────────────────────────────────────────────

export const eventos = mysqlTable(
	"eventos",
	{
		id: int("id").autoincrement().primaryKey(),
		entidad: mysqlEnum("entidad", [
			"activo",
			"licencia",
			"asignacion",
			"garantia",
			"mantenimiento",
			"solicitud",
			"incidencia",
			"persona",
		]).notNull(),
		entidad_id: int("entidad_id").notNull(),
		accion_id: int("accion_id").notNull(),
		actor_id: int("actor_id"),
		datos_anteriores: json("datos_anteriores").$type<Record<
			string,
			unknown
		> | null>(),
		datos_nuevos: json("datos_nuevos").$type<Record<string, unknown> | null>(),
		created_at: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("idx_eventos_entidad").on(t.entidad, t.entidad_id, t.created_at),
		index("idx_eventos_accion").on(t.accion_id),
		index("idx_eventos_actor").on(t.actor_id),
		index("idx_eventos_fecha").on(t.created_at),
		foreignKey({
			name: "fk_eventos_accion",
			columns: [t.accion_id],
			foreignColumns: [acciones.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_eventos_actor",
			columns: [t.actor_id],
			foreignColumns: [personas.id],
		}).onDelete("set null"),
	],
);

export const reportesGenerados = mysqlTable(
	"reportes_generados",
	{
		id: int("id").autoincrement().primaryKey(),
		usuario_id: int("usuario_id").notNull(),
		tipo_id: int("tipo_id").notNull(),
		filtros: json("filtros").$type<Record<string, unknown> | null>(),
		filas: int("filas"),
		archivo_url: varchar("archivo_url", { length: 500 }),
		created_at: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("idx_reportes_usuario").on(t.usuario_id, t.created_at),
		index("idx_reportes_tipo").on(t.tipo_id, t.created_at),
		foreignKey({
			name: "fk_reportes_usuario",
			columns: [t.usuario_id],
			foreignColumns: [personas.id],
		}).onDelete("restrict"),
		foreignKey({
			name: "fk_reportes_tipo",
			columns: [t.tipo_id],
			foreignColumns: [tiposReporte.id],
		}).onDelete("restrict"),
	],
);

export const configuracion = mysqlTable(
	"configuracion",
	{
		id: tinyint("id").primaryKey().default(1),
		idioma: varchar("idioma", { length: 10 }).notNull().default("es"),
		zona_horaria: varchar("zona_horaria", { length: 50 })
			.notNull()
			.default("America/Mexico_City"),
		moneda: varchar("moneda", { length: 3 }).notNull().default("MXN"),
		formato_fecha: varchar("formato_fecha", { length: 20 })
			.notNull()
			.default("DD/MM/YYYY"),
		dias_alerta_licencia: int("dias_alerta_licencia").notNull().default(30),
		dias_alerta_garantia: int("dias_alerta_garantia").notNull().default(30),
		dias_alerta_devolucion: int("dias_alerta_devolucion").notNull().default(7),
		dias_alerta_mantenimiento: int("dias_alerta_mantenimiento")
			.notNull()
			.default(3),
		created_at: timestamp("created_at").defaultNow().notNull(),
		updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
	},
	(t) => [check("chk_configuracion_unica", sql`${t.id} = 1`)],
);

// ─── Relaciones ──────────────────────────────────────────────────────────────

export const sedesRelations = relations(sedes, ({ many }) => ({
	ubicaciones: many(ubicaciones),
	personas: many(personas),
}));

export const ubicacionesRelations = relations(ubicaciones, ({ one, many }) => ({
	sede: one(sedes, {
		fields: [ubicaciones.sede_id],
		references: [sedes.id],
	}),
	padre: one(ubicaciones, {
		fields: [ubicaciones.padre_id],
		references: [ubicaciones.id],
		relationName: "ubicacion_padre",
	}),
	hijas: many(ubicaciones, { relationName: "ubicacion_padre" }),
	activos: many(activos),
}));

export const personasRelations = relations(personas, ({ one, many }) => ({
	rol: one(roles, {
		fields: [personas.rol_id],
		references: [roles.id],
	}),
	departamento: one(departamentos, {
		fields: [personas.departamento_id],
		references: [departamentos.id],
	}),
	sede: one(sedes, {
		fields: [personas.sede_id],
		references: [sedes.id],
	}),
	asignaciones: many(asignaciones),
	solicitudes: many(solicitudes),
}));

export const activosRelations = relations(activos, ({ one, many }) => ({
	tipo: one(tiposActivo, {
		fields: [activos.tipo_id],
		references: [tiposActivo.id],
	}),
	proveedor: one(proveedores, {
		fields: [activos.proveedor_id],
		references: [proveedores.id],
	}),
	ubicacion: one(ubicaciones, {
		fields: [activos.ubicacion_id],
		references: [ubicaciones.id],
	}),
	dueno: one(personas, {
		fields: [activos.dueno_id],
		references: [personas.id],
	}),
	licencia: one(licencias, {
		fields: [activos.id],
		references: [licencias.activo_id],
	}),
	asignaciones: many(asignaciones),
	garantias: many(garantias),
	mantenimientos: many(mantenimientos),
	incidencias: many(incidencias),
}));

export const licenciasRelations = relations(licencias, ({ one, many }) => ({
	activo: one(activos, {
		fields: [licencias.activo_id],
		references: [activos.id],
	}),
	asignaciones: many(asignacionesLicencia),
	renovaciones: many(renovacionesLicencia),
}));

export const asignacionesRelations = relations(asignaciones, ({ one }) => ({
	activo: one(activos, {
		fields: [asignaciones.activo_id],
		references: [activos.id],
	}),
	persona: one(personas, {
		fields: [asignaciones.persona_id],
		references: [personas.id],
	}),
	departamento: one(departamentos, {
		fields: [asignaciones.departamento_id],
		references: [departamentos.id],
	}),
	ubicacion: one(ubicaciones, {
		fields: [asignaciones.ubicacion_id],
		references: [ubicaciones.id],
	}),
}));

export const garantiasRelations = relations(garantias, ({ one }) => ({
	activo: one(activos, {
		fields: [garantias.activo_id],
		references: [activos.id],
	}),
	proveedor: one(proveedores, {
		fields: [garantias.proveedor_id],
		references: [proveedores.id],
	}),
}));

export const eventosRelations = relations(eventos, ({ one }) => ({
	accion: one(acciones, {
		fields: [eventos.accion_id],
		references: [acciones.id],
	}),
	actor: one(personas, {
		fields: [eventos.actor_id],
		references: [personas.id],
	}),
}));
