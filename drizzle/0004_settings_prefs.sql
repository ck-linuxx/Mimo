ALTER TABLE `settings` ADD `biometrics_enabled` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `settings` ADD `notifications_enabled` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `settings` ADD `ask_for_receipt` integer NOT NULL DEFAULT true;