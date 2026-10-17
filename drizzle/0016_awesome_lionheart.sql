CREATE TABLE `bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`pluggy_account_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`number` text,
	`balance` real,
	`currency` text,
	`credit_limit` real,
	`closing_day` integer,
	`due_day` integer,
	`local_account_id` text,
	`local_card_id` text,
	`last_tx_sync_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `bank_connections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`local_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`local_card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_accounts_pluggy_account_id_unique` ON `bank_accounts` (`pluggy_account_id`);--> statement-breakpoint
CREATE TABLE `bank_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`connector_name` text,
	`connector_image_url` text,
	`status` text,
	`execution_status` text,
	`last_sync_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_connections_item_id_unique` ON `bank_connections` (`item_id`);--> statement-breakpoint
CREATE TABLE `pluggy_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text NOT NULL,
	`bank_account_id` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`date` integer NOT NULL,
	`external_status` text,
	`operation_type` text,
	`category` text,
	`installment_number` integer,
	`total_installments` integer,
	`currency` text,
	`amount_in_account_currency` real,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`imported_transaction_id` text,
	`bank_changed_at` integer,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`imported_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pluggy_transactions_external_id_unique` ON `pluggy_transactions` (`external_id`);--> statement-breakpoint
CREATE INDEX `pluggy_tx_review_status_idx` ON `pluggy_transactions` (`review_status`);--> statement-breakpoint
CREATE INDEX `pluggy_tx_date_idx` ON `pluggy_transactions` (`date`);--> statement-breakpoint
CREATE INDEX `pluggy_tx_bank_account_idx` ON `pluggy_transactions` (`bank_account_id`);--> statement-breakpoint
ALTER TABLE `settings` ADD `pluggy_auto_sync` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `pluggy_import_window_days` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `source` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `external_id` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `external_status` text;--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_external_id_idx` ON `transactions` (`external_id`);