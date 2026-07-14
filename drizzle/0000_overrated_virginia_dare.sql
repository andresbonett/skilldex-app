CREATE TABLE `job_skills_relation` (
	`job_id` integer NOT NULL,
	`skill_id` integer NOT NULL,
	PRIMARY KEY(`job_id`, `skill_id`),
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills_tracker`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`cargo` text NOT NULL,
	`empresa` text NOT NULL,
	`url_original` text,
	`texto_vacante` text NOT NULL,
	`estado_postulacion` text DEFAULT 'Por postular' NOT NULL,
	`fecha_creacion` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skills_tracker` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`nombre_habilidad` text NOT NULL,
	`tipo` text DEFAULT 'tecnica' NOT NULL,
	`completada` integer DEFAULT false NOT NULL,
	`frecuencia` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_tracker_user_nombre_idx` ON `skills_tracker` (`user_id`,`nombre_habilidad`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`proveedor_ia_favorito` text DEFAULT 'google' NOT NULL,
	`modelo_ia_favorito` text DEFAULT 'gemini-2.5-flash' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);