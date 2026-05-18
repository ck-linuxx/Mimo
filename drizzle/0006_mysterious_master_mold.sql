ALTER TABLE `transactions` ADD `expense_classification` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `is_subscription` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `tags` text;