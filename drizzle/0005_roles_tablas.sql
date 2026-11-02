CREATE TABLE `reportes_generados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuario_id` int NOT NULL,
	`tipo_id` int NOT NULL,
	`filtros` json,
	`filas` int,
	`archivo_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reportes_generados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` tinyint NOT NULL,
	`slug` varchar(30) NOT NULL,
	`nombre` varchar(50) NOT NULL,
	`descripcion` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_roles_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
INSERT INTO `roles` (`id`,`slug`,`nombre`) VALUES (1,'administrador','Administrador'),(2,'tecnico','Técnico'),(3,'almacen','Almacén'),(4,'empleado','Empleado');--> statement-breakpoint
CREATE TABLE `tipos_reporte_roles` (
	`tipo_id` int NOT NULL,
	`rol_id` tinyint NOT NULL,
	CONSTRAINT `tipos_reporte_roles_tipo_id_rol_id_pk` PRIMARY KEY(`tipo_id`,`rol_id`)
);
--> statement-breakpoint
ALTER TABLE `personas` ADD `rol_id` tinyint DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `tipos_reporte` ADD `alcance` enum('global','propio') DEFAULT 'global' NOT NULL;--> statement-breakpoint
ALTER TABLE `reportes_generados` ADD CONSTRAINT `fk_reportes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `personas`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reportes_generados` ADD CONSTRAINT `fk_reportes_tipo` FOREIGN KEY (`tipo_id`) REFERENCES `tipos_reporte`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tipos_reporte_roles` ADD CONSTRAINT `fk_tipos_reporte_roles_tipo` FOREIGN KEY (`tipo_id`) REFERENCES `tipos_reporte`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tipos_reporte_roles` ADD CONSTRAINT `fk_tipos_reporte_roles_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_reportes_usuario` ON `reportes_generados` (`usuario_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reportes_tipo` ON `reportes_generados` (`tipo_id`,`created_at`);--> statement-breakpoint
UPDATE `personas` SET `rol_id` = (SELECT `id` FROM `roles` WHERE `slug` = `personas`.`rol`);--> statement-breakpoint
ALTER TABLE `personas` ADD CONSTRAINT `fk_personas_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_personas_rol` ON `personas` (`rol_id`);