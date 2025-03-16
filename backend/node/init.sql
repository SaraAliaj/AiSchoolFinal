-- Create and use the database
CREATE DATABASE IF NOT EXISTS aischool;
USE aischool;

-- Set proper character encoding
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Table: courses
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
    `id` int NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NOT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: weeks
DROP TABLE IF EXISTS `weeks`;
CREATE TABLE `weeks` (
    `id` int NOT NULL AUTO_INCREMENT,
    `name` varchar(10) NOT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: days
DROP TABLE IF EXISTS `days`;
CREATE TABLE `days` (
    `id` int NOT NULL AUTO_INCREMENT,
    `day_name` varchar(50) NOT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` int NOT NULL AUTO_INCREMENT,
    `username` varchar(50) NOT NULL,
    `surname` varchar(255) NOT NULL,
    `active` tinyint(1) NULL DEFAULT 1,
    `role` varchar(255) NOT NULL,
    `email` varchar(100) NOT NULL,
    `password` varchar(255) NOT NULL,
    `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
    `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `username` (`username`),
    UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: lessons (with foreign key dependencies)
DROP TABLE IF EXISTS `lessons`;
CREATE TABLE `lessons` (
    `id` int NOT NULL AUTO_INCREMENT,
    `course_id` int NOT NULL,
    `week_id` int NOT NULL,
    `day_id` int NOT NULL,
    `lesson_name` varchar(255) NOT NULL,
    `file_path` varchar(255) NOT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `lesson_time` datetime NULL,
    PRIMARY KEY (`id`),
    KEY `course_id` (`course_id`),
    KEY `week_id` (`week_id`),
    KEY `day_id` (`day_id`),
    CONSTRAINT `lessons_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `lessons_ibfk_2` FOREIGN KEY (`week_id`) REFERENCES `weeks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `lessons_ibfk_3` FOREIGN KEY (`day_id`) REFERENCES `days` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Insert initial data
INSERT INTO `courses` (`name`) VALUES ('react') ON DUPLICATE KEY UPDATE `name` = `name`;

-- Add initial weeks
INSERT INTO `weeks` (`name`) VALUES 
('Week 1'),
('Week 2'),
('Week 3'),
('Week 4')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Add initial days
INSERT INTO `days` (`day_name`) VALUES 
('Monday'),
('Tuesday'),
('Wednesday'),
('Thursday'),
('Friday')
ON DUPLICATE KEY UPDATE `day_name` = VALUES(`day_name`);

-- Add an initial admin user (password should be hashed in production)
INSERT INTO `users` (`username`, `surname`, `active`, `role`, `email`, `password`) 
VALUES ('admin', 'admin', 1, 'admin', 'admin@test.com', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MQICjYJ7ogs/Xr4OZ.1nUsZnKCvv4W')
ON DUPLICATE KEY UPDATE `role` = 'admin'; 