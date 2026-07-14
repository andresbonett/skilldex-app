PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `skills_tracker_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`nombre_habilidad` text NOT NULL,
	`tipo` text DEFAULT 'tecnica' NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`nivel_dominio` text DEFAULT 'basico' NOT NULL,
	`frecuencia` integer DEFAULT 1 NOT NULL
);--> statement-breakpoint
INSERT INTO `skills_tracker_new` (`id`, `user_id`, `nombre_habilidad`, `tipo`, `estado`, `nivel_dominio`, `frecuencia`)
SELECT
	`id`,
	`user_id`,
	`nombre_habilidad`,
	`tipo`,
	CASE WHEN `completada` = 1 THEN 'completada' ELSE 'pendiente' END,
	CASE WHEN `completada` = 1 THEN 'avanzado' ELSE 'basico' END,
	`frecuencia`
FROM `skills_tracker`;--> statement-breakpoint
DROP TABLE `skills_tracker`;--> statement-breakpoint
ALTER TABLE `skills_tracker_new` RENAME TO `skills_tracker`;--> statement-breakpoint
CREATE UNIQUE INDEX `skills_tracker_user_nombre_idx` ON `skills_tracker` (`user_id`,`nombre_habilidad`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
