CREATE INDEX `idx_ubicaciones_sede` ON `ubicaciones` (`sede_id`);--> statement-breakpoint
ALTER TABLE `activos` DROP INDEX `uq_activos_serial`;--> statement-breakpoint
ALTER TABLE `departamentos` DROP INDEX `uq_departamentos_nombre`;--> statement-breakpoint
ALTER TABLE `personas` DROP INDEX `uq_personas_email`;--> statement-breakpoint
ALTER TABLE `sedes` DROP INDEX `uq_sedes_nombre`;--> statement-breakpoint
ALTER TABLE `tipos_activo` DROP INDEX `uq_tipos_activo_nombre`;--> statement-breakpoint
ALTER TABLE `tipos_activo` DROP INDEX `uq_tipos_activo_slug`;--> statement-breakpoint
ALTER TABLE `ubicaciones` DROP INDEX `uq_ubicaciones_sede_nombre`;--> statement-breakpoint
ALTER TABLE `activos` ADD `serial_activo` varchar(100) GENERATED ALWAYS AS (if(`deleted_at` is null, `etiqueta_serial`, null)) STORED;--> statement-breakpoint
ALTER TABLE `departamentos` ADD `nombre_activo` varchar(100) GENERATED ALWAYS AS (if(`deleted_at` is null, `nombre`, null)) STORED;--> statement-breakpoint
ALTER TABLE `personas` ADD `email_activo` varchar(255) GENERATED ALWAYS AS (if(`deleted_at` is null, `email`, null)) STORED;--> statement-breakpoint
ALTER TABLE `proveedores` ADD `nombre_activo` varchar(255) GENERATED ALWAYS AS (if(`deleted_at` is null, `nombre`, null)) STORED;--> statement-breakpoint
ALTER TABLE `sedes` ADD `nombre_activo` varchar(150) GENERATED ALWAYS AS (if(`deleted_at` is null, `nombre`, null)) STORED;--> statement-breakpoint
ALTER TABLE `tipos_activo` ADD `nombre_activo` varchar(100) GENERATED ALWAYS AS (if(`deleted_at` is null, `nombre`, null)) STORED;--> statement-breakpoint
ALTER TABLE `tipos_activo` ADD `slug_activo` varchar(100) GENERATED ALWAYS AS (if(`deleted_at` is null, `slug`, null)) STORED;--> statement-breakpoint
ALTER TABLE `ubicaciones` ADD `nombre_activo` varchar(150) GENERATED ALWAYS AS (if(`deleted_at` is null, `nombre`, null)) STORED;--> statement-breakpoint
ALTER TABLE `activos` ADD CONSTRAINT `uq_activos_serial_activo` UNIQUE(`serial_activo`);--> statement-breakpoint
ALTER TABLE `departamentos` ADD CONSTRAINT `uq_departamentos_nombre_activo` UNIQUE(`nombre_activo`);--> statement-breakpoint
ALTER TABLE `personas` ADD CONSTRAINT `uq_personas_email_activo` UNIQUE(`email_activo`);--> statement-breakpoint
ALTER TABLE `sedes` ADD CONSTRAINT `uq_sedes_nombre_activo` UNIQUE(`nombre_activo`);--> statement-breakpoint
ALTER TABLE `tipos_activo` ADD CONSTRAINT `uq_tipos_activo_nombre_activo` UNIQUE(`nombre_activo`);--> statement-breakpoint
ALTER TABLE `tipos_activo` ADD CONSTRAINT `uq_tipos_activo_slug_activo` UNIQUE(`slug_activo`);--> statement-breakpoint
ALTER TABLE `ubicaciones` ADD CONSTRAINT `uq_ubicaciones_sede_nombre_activo` UNIQUE(`sede_id`,`nombre_activo`);