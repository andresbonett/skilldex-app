ALTER TABLE `job_skills_relation` ADD `exigencia` text DEFAULT 'requerida' NOT NULL;--> statement-breakpoint
ALTER TABLE `skills_tracker` ADD `score_prioridad` integer DEFAULT 1 NOT NULL;
