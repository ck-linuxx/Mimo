CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`updated_at` integer NOT NULL
);
