PRAGMA foreign_keys=off;--> statement-breakpoint
CREATE TABLE `__new_financial_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`target_amount` real NOT NULL,
	`current_amount` real NOT NULL DEFAULT 0,
	`start_at` integer,
	`finish_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_financial_goals`(`id`, `title`, `description`, `icon`, `color`, `target_amount`, `current_amount`, `start_at`, `finish_at`, `status`, `created_at`, `updated_at`)
	SELECT `id`, `title`, `description`, `icon`, `color`, `target_amount`, `current_amount`, `start_at`, `finish_at`, `status`, `created_at`, `updated_at`
	FROM `financial_goals`;--> statement-breakpoint
DROP TABLE `financial_goals`;--> statement-breakpoint
ALTER TABLE `__new_financial_goals` RENAME TO `financial_goals`;--> statement-breakpoint
PRAGMA foreign_keys=on;
