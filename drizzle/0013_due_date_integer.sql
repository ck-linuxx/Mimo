ALTER TABLE `transactions` ADD `billing_period` text;
-->statement-breakpoint
ALTER TABLE `transactions` ADD `due_date` integer;
-->statement-breakpoint
UPDATE `transactions` SET `due_date` = `date` WHERE `due_date` IS NULL;
