CREATE TABLE `acciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`nombre` varchar(150) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `acciones_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_acciones_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `activos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`tipo_id` int NOT NULL,
	`proveedor_id` int NOT NULL,
	`ubicacion_id` int,
	`dueno_id` int,
	`etiqueta_serial` varchar(100),
	`estado` enum('disponible','asignado','mantenimiento') NOT NULL DEFAULT 'disponible',
	`condicion` enum('nuevo','usado','danado') NOT NULL DEFAULT 'nuevo',
	`fecha_adquisicion` date,
	`valor_compra` decimal(12,2),
	`modelo` varchar(100),
	`descripcion` varchar(500),
	`foto_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `activos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_activos_serial` UNIQUE(`etiqueta_serial`)
);
--> statement-breakpoint
CREATE TABLE `adjuntos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entidad` enum('activo','licencia','garantia','mantenimiento','incidencia','solicitud') NOT NULL,
	`entidad_id` int NOT NULL,
	`tipo` enum('factura','poliza','acta','foto','otro') NOT NULL DEFAULT 'otro',
	`nombre` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`mime` varchar(100),
	`tamano` int,
	`subido_por` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adjuntos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `asignaciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activo_id` int NOT NULL,
	`persona_id` int NOT NULL,
	`departamento_id` int NOT NULL,
	`ubicacion_id` int NOT NULL,
	`fecha_asignacion` date NOT NULL,
	`fecha_devolucion_pactada` date,
	`fecha_devolucion_real` date,
	`comentarios` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`slot_activo` int GENERATED ALWAYS AS (if(`fecha_devolucion_real` is null, 1, null)) STORED,
	CONSTRAINT `asignaciones_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_asignacion_activa` UNIQUE(`activo_id`,`slot_activo`),
	CONSTRAINT `chk_asignaciones_fechas` CHECK(`asignaciones`.`fecha_devolucion_real` is null or `asignaciones`.`fecha_devolucion_real` >= `asignaciones`.`fecha_asignacion`)
);
--> statement-breakpoint
CREATE TABLE `asignaciones_licencia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licencia_id` int NOT NULL,
	`asiento` int NOT NULL,
	`destino_tipo` enum('persona','activo') NOT NULL,
	`persona_id` int,
	`activo_id` int,
	`fecha_asignacion` date NOT NULL,
	`fecha_liberacion` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`slot_asiento` int GENERATED ALWAYS AS (if(`fecha_liberacion` is null, `asiento`, null)) STORED,
	CONSTRAINT `asignaciones_licencia_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_asiento_activo` UNIQUE(`licencia_id`,`slot_asiento`),
	CONSTRAINT `chk_asientos_positivos` CHECK(`asignaciones_licencia`.`asiento` > 0),
	CONSTRAINT `chk_asignaciones_licencia_destino` CHECK((`asignaciones_licencia`.`destino_tipo` = 'persona' and `asignaciones_licencia`.`persona_id` is not null and `asignaciones_licencia`.`activo_id` is null) or (`asignaciones_licencia`.`destino_tipo` = 'activo' and `asignaciones_licencia`.`activo_id` is not null and `asignaciones_licencia`.`persona_id` is null))
);
--> statement-breakpoint
CREATE TABLE `configuracion` (
	`id` tinyint NOT NULL DEFAULT 1,
	`idioma` varchar(10) NOT NULL DEFAULT 'es',
	`zona_horaria` varchar(50) NOT NULL DEFAULT 'America/Mexico_City',
	`moneda` varchar(3) NOT NULL DEFAULT 'MXN',
	`formato_fecha` varchar(20) NOT NULL DEFAULT 'DD/MM/YYYY',
	`dias_alerta_licencia` int NOT NULL DEFAULT 30,
	`dias_alerta_garantia` int NOT NULL DEFAULT 30,
	`dias_alerta_devolucion` int NOT NULL DEFAULT 7,
	`dias_alerta_mantenimiento` int NOT NULL DEFAULT 3,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configuracion_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_configuracion_unica` CHECK(`configuracion`.`id` = 1)
);
--> statement-breakpoint
CREATE TABLE `departamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `departamentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_departamentos_nombre` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `eventos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entidad` enum('activo','licencia','asignacion','garantia','mantenimiento','solicitud','incidencia','persona') NOT NULL,
	`entidad_id` int NOT NULL,
	`accion_id` int NOT NULL,
	`actor_id` int,
	`datos_anteriores` json,
	`datos_nuevos` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `garantias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activo_id` int NOT NULL,
	`proveedor_id` int NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`fecha_inicio` date NOT NULL,
	`fecha_fin` date NOT NULL,
	`costo` decimal(12,2),
	`condiciones` varchar(500),
	`descripcion` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `garantias_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_garantias_fechas` CHECK(`garantias`.`fecha_fin` > `garantias`.`fecha_inicio`)
);
--> statement-breakpoint
CREATE TABLE `incidencias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activo_id` int NOT NULL,
	`reportante_id` int NOT NULL,
	`descripcion` text NOT NULL,
	`prioridad` enum('baja','media','alta') NOT NULL DEFAULT 'media',
	`estado` enum('abierta','en_revision','resuelta','cerrada') NOT NULL DEFAULT 'abierta',
	`mantenimiento_id` int,
	`fecha_resolucion` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `incidencias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `licencias` (
	`activo_id` int NOT NULL,
	`modalidad` enum('perpetua','suscripcion') NOT NULL,
	`tipo_uso` enum('dispositivo','usuario','concurrente','volumen') NOT NULL,
	`asientos_comprados` int NOT NULL DEFAULT 1,
	`costo` decimal(12,2),
	`periodicidad_costo` enum('mensual','anual','unica') NOT NULL DEFAULT 'anual',
	`referencia_clave` varchar(255),
	`renovacion_automatica` boolean NOT NULL DEFAULT false,
	`fecha_renovacion` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `licencias_activo_id` PRIMARY KEY(`activo_id`),
	CONSTRAINT `chk_licencias_asientos` CHECK(`licencias`.`asientos_comprados` > 0)
);
--> statement-breakpoint
CREATE TABLE `mantenimientos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activo_id` int NOT NULL,
	`responsable` enum('interno','externo') NOT NULL,
	`tecnico_id` int,
	`proveedor_id` int,
	`tipo` enum('preventivo','correctivo') NOT NULL,
	`fecha_salida` date NOT NULL,
	`fecha_retorno` date,
	`diagnostico` text,
	`costo` decimal(12,2),
	`estado` enum('abierto','cerrado') NOT NULL DEFAULT 'abierto',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`slot_abierto` int GENERATED ALWAYS AS (if(`estado` = 'abierto', 1, null)) STORED,
	CONSTRAINT `mantenimientos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_mantenimiento_abierto` UNIQUE(`activo_id`,`slot_abierto`),
	CONSTRAINT `chk_mantenimientos_responsable` CHECK((`mantenimientos`.`responsable` = 'interno' and `mantenimientos`.`tecnico_id` is not null) or (`mantenimientos`.`responsable` = 'externo' and `mantenimientos`.`proveedor_id` is not null)),
	CONSTRAINT `chk_mantenimientos_fechas` CHECK(`mantenimientos`.`fecha_retorno` is null or `mantenimientos`.`fecha_retorno` >= `mantenimientos`.`fecha_salida`)
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`contrasena` varchar(255) NOT NULL,
	`departamento_id` int,
	`sede_id` int,
	`rol` enum('administrador','tecnico','almacen','empleado') NOT NULL DEFAULT 'empleado',
	`foto_url` varchar(500),
	`ultimo_acceso` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `personas_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_personas_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `proveedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`tipo` enum('bienes','servicios','ambos') NOT NULL DEFAULT 'bienes',
	`contacto` varchar(255),
	`telefono` varchar(30),
	`email` varchar(255),
	`direccion` varchar(255),
	`notas` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `proveedores_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_proveedores_nombre` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `renovaciones_licencia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licencia_id` int NOT NULL,
	`fecha` date NOT NULL,
	`asientos` int NOT NULL,
	`costo` decimal(12,2),
	`adjunto_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `renovaciones_licencia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sedes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(150) NOT NULL,
	`ciudad` varchar(100),
	`direccion` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `sedes_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_sedes_nombre` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `solicitudes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solicitante_id` int NOT NULL,
	`tipo` enum('equipo','licencia','accesorio','reemplazo') NOT NULL,
	`tipo_activo_id` int,
	`motivo` text,
	`prioridad` enum('baja','media','alta') NOT NULL DEFAULT 'media',
	`estado` enum('pendiente','aprobada','rechazada','entregada') NOT NULL DEFAULT 'pendiente',
	`resuelta_por` int,
	`activo_id` int,
	`fecha_resolucion` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `solicitudes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tipos_activo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`categoria` enum('hardware','software','licencia','servicio','accesorio') NOT NULL DEFAULT 'hardware',
	`descripcion` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `tipos_activo_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tipos_activo_nombre` UNIQUE(`nombre`),
	CONSTRAINT `uq_tipos_activo_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `tipos_reporte` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`descripcion` varchar(255),
	`activo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `tipos_reporte_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tipos_reporte_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `ubicaciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sede_id` int NOT NULL,
	`padre_id` int,
	`nombre` varchar(150) NOT NULL,
	`tipo` enum('edificio','piso','sala','almacen') NOT NULL DEFAULT 'sala',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `ubicaciones_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_ubicaciones_sede_nombre` UNIQUE(`sede_id`,`nombre`)
);
--> statement-breakpoint
ALTER TABLE `activos` ADD CONSTRAINT `fk_activos_tipo` FOREIGN KEY (`tipo_id`) REFERENCES `tipos_activo`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activos` ADD CONSTRAINT `fk_activos_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activos` ADD CONSTRAINT `fk_activos_ubicacion` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activos` ADD CONSTRAINT `fk_activos_dueno` FOREIGN KEY (`dueno_id`) REFERENCES `personas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adjuntos` ADD CONSTRAINT `fk_adjuntos_persona` FOREIGN KEY (`subido_por`) REFERENCES `personas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asignaciones` ADD CONSTRAINT `fk_asignaciones_activo` FOREIGN KEY (`activo_id`) REFERENCES `activos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asignaciones` ADD CONSTRAINT `fk_asignaciones_persona` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asignaciones` ADD CONSTRAINT `fk_asignaciones_departamento` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asignaciones` ADD CONSTRAINT `fk_asignaciones_ubicacion` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asignaciones_licencia` ADD CONSTRAINT `fk_asignaciones_licencia_licencia` FOREIGN KEY (`licencia_id`) REFERENCES `licencias`(`activo_id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asignaciones_licencia` ADD CONSTRAINT `fk_asignaciones_licencia_persona` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `asignaciones_licencia` ADD CONSTRAINT `fk_asignaciones_licencia_activo` FOREIGN KEY (`activo_id`) REFERENCES `activos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventos` ADD CONSTRAINT `fk_eventos_accion` FOREIGN KEY (`accion_id`) REFERENCES `acciones`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventos` ADD CONSTRAINT `fk_eventos_actor` FOREIGN KEY (`actor_id`) REFERENCES `personas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `garantias` ADD CONSTRAINT `fk_garantias_activo` FOREIGN KEY (`activo_id`) REFERENCES `activos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `garantias` ADD CONSTRAINT `fk_garantias_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incidencias` ADD CONSTRAINT `fk_incidencias_activo` FOREIGN KEY (`activo_id`) REFERENCES `activos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incidencias` ADD CONSTRAINT `fk_incidencias_reportante` FOREIGN KEY (`reportante_id`) REFERENCES `personas`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incidencias` ADD CONSTRAINT `fk_incidencias_mantenimiento` FOREIGN KEY (`mantenimiento_id`) REFERENCES `mantenimientos`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `licencias` ADD CONSTRAINT `fk_licencias_activo` FOREIGN KEY (`activo_id`) REFERENCES `activos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mantenimientos` ADD CONSTRAINT `fk_mantenimientos_activo` FOREIGN KEY (`activo_id`) REFERENCES `activos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mantenimientos` ADD CONSTRAINT `fk_mantenimientos_tecnico` FOREIGN KEY (`tecnico_id`) REFERENCES `personas`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mantenimientos` ADD CONSTRAINT `fk_mantenimientos_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personas` ADD CONSTRAINT `fk_personas_departamento` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personas` ADD CONSTRAINT `fk_personas_sede` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `renovaciones_licencia` ADD CONSTRAINT `fk_renovaciones_licencia` FOREIGN KEY (`licencia_id`) REFERENCES `licencias`(`activo_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `renovaciones_licencia` ADD CONSTRAINT `fk_renovaciones_adjunto` FOREIGN KEY (`adjunto_id`) REFERENCES `adjuntos`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solicitudes` ADD CONSTRAINT `fk_solicitudes_solicitante` FOREIGN KEY (`solicitante_id`) REFERENCES `personas`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solicitudes` ADD CONSTRAINT `fk_solicitudes_resuelta_por` FOREIGN KEY (`resuelta_por`) REFERENCES `personas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solicitudes` ADD CONSTRAINT `fk_solicitudes_tipo_activo` FOREIGN KEY (`tipo_activo_id`) REFERENCES `tipos_activo`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `solicitudes` ADD CONSTRAINT `fk_solicitudes_activo` FOREIGN KEY (`activo_id`) REFERENCES `activos`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ubicaciones` ADD CONSTRAINT `fk_ubicaciones_sede` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ubicaciones` ADD CONSTRAINT `fk_ubicaciones_padre` FOREIGN KEY (`padre_id`) REFERENCES `ubicaciones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_activos_tipo` ON `activos` (`tipo_id`);--> statement-breakpoint
CREATE INDEX `idx_activos_proveedor` ON `activos` (`proveedor_id`);--> statement-breakpoint
CREATE INDEX `idx_activos_ubicacion` ON `activos` (`ubicacion_id`);--> statement-breakpoint
CREATE INDEX `idx_activos_dueno` ON `activos` (`dueno_id`);--> statement-breakpoint
CREATE INDEX `idx_activos_estado` ON `activos` (`estado`);--> statement-breakpoint
CREATE INDEX `idx_activos_deleted` ON `activos` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_activos_vigentes` ON `activos` (`deleted_at`,`estado`);--> statement-breakpoint
CREATE INDEX `idx_adjuntos_entidad` ON `adjuntos` (`entidad`,`entidad_id`);--> statement-breakpoint
CREATE INDEX `idx_asignaciones_persona` ON `asignaciones` (`persona_id`);--> statement-breakpoint
CREATE INDEX `idx_asignaciones_devolucion` ON `asignaciones` (`fecha_devolucion_real`);--> statement-breakpoint
CREATE INDEX `idx_asignaciones_licencia_persona` ON `asignaciones_licencia` (`persona_id`);--> statement-breakpoint
CREATE INDEX `idx_asignaciones_licencia_activo` ON `asignaciones_licencia` (`activo_id`);--> statement-breakpoint
CREATE INDEX `idx_eventos_entidad` ON `eventos` (`entidad`,`entidad_id`);--> statement-breakpoint
CREATE INDEX `idx_eventos_accion` ON `eventos` (`accion_id`);--> statement-breakpoint
CREATE INDEX `idx_eventos_actor` ON `eventos` (`actor_id`);--> statement-breakpoint
CREATE INDEX `idx_eventos_fecha` ON `eventos` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_garantias_activo` ON `garantias` (`activo_id`);--> statement-breakpoint
CREATE INDEX `idx_garantias_fecha_fin` ON `garantias` (`fecha_fin`);--> statement-breakpoint
CREATE INDEX `idx_incidencias_estado` ON `incidencias` (`estado`);--> statement-breakpoint
CREATE INDEX `idx_incidencias_activo` ON `incidencias` (`activo_id`);--> statement-breakpoint
CREATE INDEX `idx_licencias_renovacion` ON `licencias` (`fecha_renovacion`);--> statement-breakpoint
CREATE INDEX `idx_mantenimientos_estado` ON `mantenimientos` (`estado`);--> statement-breakpoint
CREATE INDEX `idx_personas_departamento` ON `personas` (`departamento_id`);--> statement-breakpoint
CREATE INDEX `idx_personas_sede` ON `personas` (`sede_id`);--> statement-breakpoint
CREATE INDEX `idx_renovaciones_licencia` ON `renovaciones_licencia` (`licencia_id`);--> statement-breakpoint
CREATE INDEX `idx_solicitudes_estado` ON `solicitudes` (`estado`);--> statement-breakpoint
CREATE INDEX `idx_solicitudes_solicitante` ON `solicitudes` (`solicitante_id`);--> statement-breakpoint
CREATE INDEX `idx_ubicaciones_padre` ON `ubicaciones` (`padre_id`);