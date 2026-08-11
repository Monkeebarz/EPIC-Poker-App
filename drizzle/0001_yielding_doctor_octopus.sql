CREATE TABLE `subscription_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`description` text,
	`perks` json DEFAULT ('[]'),
	`badgeColor` varchar(20) DEFAULT '#D4AF37',
	`featured` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_tiers_id` PRIMARY KEY(`id`)
);
