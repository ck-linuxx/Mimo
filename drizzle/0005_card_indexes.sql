-- Migration 0005: Índices de performance para consultas por cartão
CREATE INDEX IF NOT EXISTS `idx_transactions_card_id` ON `transactions` (`card_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_transactions_card_date` ON `transactions` (`card_id`, `date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_transactions_card_status_date` ON `transactions` (`card_id`, `status`, `date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_transactions_card_category_date` ON `transactions` (`card_id`, `category_id`, `date`);
