CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL
);

CREATE UNIQUE INDEX `emailIdx` ON `users` (`email`);