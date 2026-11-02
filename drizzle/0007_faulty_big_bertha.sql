ALTER TABLE `personas` ADD `token_version` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `personas` ADD `intentos_fallidos` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `personas` ADD `bloqueado_hasta` timestamp;