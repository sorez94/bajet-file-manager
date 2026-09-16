CREATE TABLE `logs` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`context` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `logs_created_at_idx` ON `logs` (`created_at`);