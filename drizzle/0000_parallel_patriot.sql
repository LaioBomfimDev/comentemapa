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
CREATE INDEX `houses_city_idx` ON `houses` (`city_id`);