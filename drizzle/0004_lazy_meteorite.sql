CREATE TABLE `resume_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`resume_id` integer NOT NULL,
	`label` text NOT NULL,
	`source` text NOT NULL,
	`data_json` text NOT NULL,
	`ai_notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT 'Mi CV' NOT NULL,
	`data_json` text NOT NULL,
	`current_version_id` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resumes_user_id_idx` ON `resumes` (`user_id`);