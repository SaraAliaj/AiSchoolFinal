-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: aischool
-- ------------------------------------------------------
-- Server version	8.0.41

-- Create and use the database
CREATE DATABASE IF NOT EXISTS aischool;
USE aischool;

-- Set proper character encoding
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

-- MySQL configuration
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Create tables in order (respecting foreign key dependencies)

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
    `active` tinyint(1) NULL,
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
    CONSTRAINT `lessons_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `lessons_ibfk_2` FOREIGN KEY (`week_id`) REFERENCES `weeks` (`id`) ON DELETE CASCADE,
    CONSTRAINT `lessons_ibfk_3` FOREIGN KEY (`day_id`) REFERENCES `days` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Add any initial data if needed (example for courses)
INSERT INTO `courses` (`name`) VALUES ('react');

-- Add any initial data if needed (example for weeks)
INSERT INTO `weeks` (`name`) VALUES 
('Week 1'),
('Week 2'),
('Week 3'),
('Week 4');

-- Add any initial data if needed (example for days)
INSERT INTO `days` (`day_name`) VALUES 
('Monday'),
('Tuesday'),
('Wednesday'),
('Thursday'),
('Friday');

-- Add an initial admin user (password should be hashed in production)
INSERT INTO `users` (`username`, `surname`, `active`, `role`, `email`, `password`) 
VALUES ('admin', 'admin', 1, 'admin', 'admin@test.com', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MQICjYJ7ogs/Xr4OZ.1nUsZnKCvv4W');

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-03-11 16:12:47
