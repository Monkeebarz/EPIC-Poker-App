-- Restores the tournament/gameplay persistence that the active poker screens and Socket.IO runtime require.
-- Subscription tables and admin data are intentionally untouched.

ALTER TABLE `users`
  ADD COLUMN `displayName` varchar(100),
  ADD COLUMN `passwordHash` text,
  ADD COLUMN `avatarUrl` text,
  ADD COLUMN `subscriptionTier` enum('free','pro','club','elite') NOT NULL DEFAULT 'elite',
  ADD COLUMN `stripeCustomerId` varchar(255),
  ADD COLUMN `stripeSubscriptionId` varchar(255),
  ADD COLUMN `gamesPlayed` int NOT NULL DEFAULT 0,
  ADD COLUMN `tournamentsWon` int NOT NULL DEFAULT 0;

CREATE TABLE `oauth_accounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `provider` varchar(64) NOT NULL,
  `providerAccountId` varchar(255) NOT NULL,
  `accessToken` text,
  `refreshToken` text,
  `expiresAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `oauth_accounts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `tournaments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `publicId` varchar(36) NOT NULL,
  `slug` varchar(200),
  `creatorId` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text,
  `gameType` enum('nlh','plo','plo5','mixed') NOT NULL DEFAULT 'nlh',
  `tableSize` enum('2','3','4','5','6','7','8','9','10') NOT NULL DEFAULT '8',
  `startingChips` int NOT NULL DEFAULT 1000,
  `lateRegistration` boolean NOT NULL DEFAULT true,
  `lateRegLevels` int DEFAULT 6,
  `reEntry` boolean NOT NULL DEFAULT false,
  `maxReEntries` int,
  `rebuyValues` json,
  `provablyFair` boolean NOT NULL DEFAULT true,
  `useCentsValues` boolean NOT NULL DEFAULT false,
  `antesEnabled` boolean NOT NULL DEFAULT false,
  `requireCheckIn` boolean NOT NULL DEFAULT false,
  `rabbitHunting` boolean NOT NULL DEFAULT false,
  `decisionTime` int NOT NULL DEFAULT 30,
  `inactiveKickMinutes` int NOT NULL DEFAULT 0,
  `managers` json,
  `status` enum('draft','scheduled','registering','running','paused','completed','cancelled') NOT NULL DEFAULT 'registering',
  `maxPlayers` int NOT NULL DEFAULT 100,
  `scheduledStart` timestamp NULL,
  `actualStart` timestamp NULL,
  `endedAt` timestamp NULL,
  `currentLevel` int NOT NULL DEFAULT 0,
  `isPrivate` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tournaments_id` PRIMARY KEY(`id`),
  CONSTRAINT `tournaments_publicId_unique` UNIQUE(`publicId`),
  CONSTRAINT `tournaments_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE `blind_levels` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tournamentId` int NOT NULL,
  `levelOrder` int NOT NULL,
  `isBreak` boolean NOT NULL DEFAULT false,
  `smallBlind` int NOT NULL DEFAULT 0,
  `bigBlind` int NOT NULL DEFAULT 0,
  `ante` int NOT NULL DEFAULT 0,
  `duration` int NOT NULL DEFAULT 15,
  `breakName` varchar(100),
  CONSTRAINT `blind_levels_id` PRIMARY KEY(`id`)
);

CREATE TABLE `tournament_participants` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tournamentId` int NOT NULL,
  `userId` int NOT NULL,
  `status` enum('pending','registered','playing','eliminated','winner') NOT NULL DEFAULT 'pending',
  `seatNumber` int,
  `tableNumber` int,
  `chipCount` int NOT NULL DEFAULT 0,
  `finishPosition` int,
  `reEntryCount` int NOT NULL DEFAULT 0,
  `registeredAt` timestamp NOT NULL DEFAULT (now()),
  `eliminatedAt` timestamp NULL,
  CONSTRAINT `tournament_participants_id` PRIMARY KEY(`id`)
);

CREATE TABLE `game_audit_log` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tournamentId` int NOT NULL,
  `userId` int,
  `userName` varchar(100),
  `action` varchar(200) NOT NULL,
  `details` text,
  `handNumber` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `game_audit_log_id` PRIMARY KEY(`id`)
);

CREATE TABLE `saved_structures` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `settings` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `saved_structures_id` PRIMARY KEY(`id`)
);
