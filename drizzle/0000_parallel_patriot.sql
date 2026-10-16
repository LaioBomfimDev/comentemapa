CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`username` text NOT NULL,
	`comment` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `houses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`actor` text NOT NULL,
	`city_id` integer NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `houses_username_unique` ON `houses` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `houses_actor_unique` ON `houses` (`actor`);--> statement-breakpoint
CREATE INDEX `houses_city_idx` ON `houses` (`city_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `city_acts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`city_id` integer NOT NULL,
	`act_type` text NOT NULL,
	`label` text NOT NULL,
	`points` integer NOT NULL,
	`ref_id` text UNIQUE,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `city_acts_city_idx` ON `city_acts` (`city_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `city_acts_user_idx` ON `city_acts` (`username`);