PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`color` text,
	`icon` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_accounts`("id", "name", "type", "balance", "color", "icon", "is_active", "created_at", "updated_at") SELECT "id", "name", "type", "balance", "color", "icon", "is_active", "created_at", "updated_at" FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`last_four_digits` text,
	`credit_limit` real,
	`closing_day` integer,
	`due_day` integer,
	`account_id` text,
	`color` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_cards`("id", "name", "last_four_digits", "credit_limit", "closing_day", "due_day", "account_id", "color", "is_active", "created_at") SELECT "id", "name", "last_four_digits", "credit_limit", "closing_day", "due_day", "account_id", "color", "is_active", "created_at" FROM `cards`;--> statement-breakpoint
DROP TABLE `cards`;--> statement-breakpoint
ALTER TABLE `__new_cards` RENAME TO `cards`;--> statement-breakpoint
CREATE TABLE `__new_financial_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`target_amount` real NOT NULL,
	`current_amount` real DEFAULT 0 NOT NULL,
	`deadline` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_financial_goals`("id", "title", "description", "icon", "color", "target_amount", "current_amount", "deadline", "status", "created_at", "updated_at") SELECT "id", "title", "description", "icon", "color", "target_amount", "current_amount", "deadline", "status", "created_at", "updated_at" FROM `financial_goals`;--> statement-breakpoint
DROP TABLE `financial_goals`;--> statement-breakpoint
ALTER TABLE `__new_financial_goals` RENAME TO `financial_goals`;--> statement-breakpoint
CREATE TABLE `__new_transaction_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`transaction_type` text NOT NULL,
	`category_id` text,
	`account_id` text,
	`card_id` text,
	`goal_id` text,
	`frequency` text,
	`total_installments` integer,
	`start_date` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`goal_id`) REFERENCES `financial_goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transaction_groups`("id", "type", "description", "amount", "transaction_type", "category_id", "account_id", "card_id", "goal_id", "frequency", "total_installments", "start_date", "is_active", "created_at") SELECT "id", "type", "description", "amount", "transaction_type", "category_id", "account_id", "card_id", "goal_id", "frequency", "total_installments", "start_date", "is_active", "created_at" FROM `transaction_groups`;--> statement-breakpoint
DROP TABLE `transaction_groups`;--> statement-breakpoint
ALTER TABLE `__new_transaction_groups` RENAME TO `transaction_groups`;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`date` integer NOT NULL,
	`paid_at` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`category_id` text,
	`account_id` text,
	`card_id` text,
	`goal_id` text,
	`transaction_group_id` text,
	`installment_number` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`goal_id`) REFERENCES `financial_goals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_group_id`) REFERENCES `transaction_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "description", "amount", "type", "date", "paid_at", "status", "category_id", "account_id", "card_id", "goal_id", "transaction_group_id", "installment_number", "notes", "created_at", "updated_at") SELECT "id", "description", "amount", "type", "date", "paid_at", "status", "category_id", "account_id", "card_id", "goal_id", "transaction_group_id", "installment_number", "notes", "created_at", "updated_at" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;