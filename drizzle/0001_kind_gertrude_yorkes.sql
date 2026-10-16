CREATE TABLE IF NOT EXISTS `city_acts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`city_id` integer NOT NULL,
	`act_type` text NOT NULL,
	`label` text NOT NULL,
	`points` integer NOT NULL,
	`ref_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `city_acts_ref_id_unique` ON `city_acts` (`ref_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `city_acts_city_idx` ON `city_acts` (`city_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `city_acts_user_idx` ON `city_acts` (`username`);