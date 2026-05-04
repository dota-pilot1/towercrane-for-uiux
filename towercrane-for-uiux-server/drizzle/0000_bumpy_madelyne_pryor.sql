CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`group_name` text NOT NULL,
	`icon_key` text NOT NULL,
	`tags` text NOT NULL,
	`checklist` text NOT NULL,
	`order_idx` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `doc_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`prototype_id` text NOT NULL,
	`title` text NOT NULL,
	`order_idx` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`prototype_id`) REFERENCES `prototypes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`block_type` text NOT NULL,
	`block_title` text,
	`content` text NOT NULL,
	`order_idx` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`order_idx` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `doc_sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`section_id` text,
	`icon` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`required_role` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prototype_images` (
	`id` text PRIMARY KEY NOT NULL,
	`prototype_id` text NOT NULL,
	`image_url` text NOT NULL,
	`order_idx` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`prototype_id`) REFERENCES `prototypes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prototype_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`prototype_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`prototype_id`) REFERENCES `prototypes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prototypes` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`title` text NOT NULL,
	`repo_url` text NOT NULL,
	`demo_url` text,
	`figma_url` text,
	`summary` text NOT NULL,
	`status` text NOT NULL,
	`visibility` text NOT NULL,
	`tags` text NOT NULL,
	`checklist` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);