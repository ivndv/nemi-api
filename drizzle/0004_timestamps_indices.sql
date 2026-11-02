UPDATE `personas` SET `fecha_ingreso` = CURRENT_DATE WHERE `fecha_ingreso` IS NULL;--> statement-breakpoint
UPDATE `solicitudes` SET `motivo` = 'Sin motivo' WHERE `motivo` IS NULL;--> statement-breakpoint
UPDATE `adjuntos` SET `mime` = '' WHERE `mime` IS NULL;--> statement-breakpoint
UPDATE `adjuntos` SET `tamano` = 0 WHERE `tamano` IS NULL;--> statement-breakpoint
DROP INDEX `idx_eventos_entidad` ON `eventos`;--> statement-breakpoint
DROP INDEX `idx_incidencias_estado` ON `incidencias`;--> statement-breakpoint
DROP INDEX `idx_solicitudes_estado` ON `solicitudes`;--> statement-breakpoint
ALTER TABLE `adjuntos` MODIFY COLUMN `mime` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `adjuntos` MODIFY COLUMN `tamano` int NOT NULL;--> statement-breakpoint
ALTER TABLE `personas` MODIFY COLUMN `fecha_ingreso` date NOT NULL;--> statement-breakpoint
ALTER TABLE `solicitudes` MODIFY COLUMN `motivo` text NOT NULL;--> statement-breakpoint
ALTER TABLE `adjuntos` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `adjuntos` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `configuracion` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_activos_vigentes_tipo` ON `activos` (`deleted_at`,`tipo_id`);--> statement-breakpoint
CREATE INDEX `idx_activos_vigentes_ubicacion` ON `activos` (`deleted_at`,`ubicacion_id`);--> statement-breakpoint
CREATE INDEX `idx_asignaciones_persona_activa` ON `asignaciones` (`persona_id`,`fecha_devolucion_real`);--> statement-breakpoint
CREATE INDEX `idx_solicitudes_solicitante_estado` ON `solicitudes` (`solicitante_id`,`estado`);--> statement-breakpoint
CREATE INDEX `idx_eventos_entidad` ON `eventos` (`entidad`,`entidad_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_incidencias_estado` ON `incidencias` (`estado`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_solicitudes_estado` ON `solicitudes` (`estado`,`created_at`);