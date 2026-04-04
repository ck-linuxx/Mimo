CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`color` text,
	`icon` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`last_four_digits` text,
	`credit_limit` integer,
	`closing_day` integer,
	`due_day` integer,
	`account_id` text,
	`color` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text,
	`type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `financial_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`target_amount` integer NOT NULL,
	`current_amount` integer DEFAULT 0 NOT NULL,
	`deadline` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transaction_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
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
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
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
