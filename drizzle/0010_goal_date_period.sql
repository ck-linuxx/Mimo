ALTER TABLE `financial_goals` ADD `finish_at` integer;--> statement-breakpoint
UPDATE `financial_goals` SET `finish_at` = `deadline`;
