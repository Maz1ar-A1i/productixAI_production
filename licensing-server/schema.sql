-- schema.sql
-- Database structure for central PHP licensing system

CREATE TABLE IF NOT EXISTS `organizations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `subscription_plan` VARCHAR(50) DEFAULT 'free',
  `status` VARCHAR(50) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `licenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `license_key` VARCHAR(255) NOT NULL UNIQUE,
  `organization_id` INT DEFAULT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'org_admin',
  `status` VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'revoked', 'expired'
  `expires_at` DATETIME DEFAULT NULL,
  `bound_machine_id` VARCHAR(255) DEFAULT NULL,   -- Machine ID that first claimed this key (NULL = unbound/fresh)
  `first_used_at` DATETIME DEFAULT NULL,          -- When this key was first validated/claimed
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default Global Admin master key if needed
INSERT INTO `licenses` (`license_key`, `role`, `status`, `expires_at`)
VALUES ('PRODUCTIX-GLOBAL-MASTER-KEY', 'global_admin', 'active', NULL)
ON DUPLICATE KEY UPDATE `license_key` = `license_key`;

-- Migration: Add machine-binding columns to existing installations
-- (Safe to run on fresh or existing databases)
ALTER TABLE `licenses`
  ADD COLUMN IF NOT EXISTS `bound_machine_id` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `first_used_at` DATETIME DEFAULT NULL;
