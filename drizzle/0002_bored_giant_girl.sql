ALTER TABLE `subscription_tiers` MODIFY COLUMN `perks` json NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_tiers` MODIFY COLUMN `badgeColor` varchar(20) NOT NULL DEFAULT '#D4AF37';--> statement-breakpoint
ALTER TABLE `subscription_tiers` MODIFY COLUMN `featured` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_tiers` MODIFY COLUMN `sortOrder` int NOT NULL;