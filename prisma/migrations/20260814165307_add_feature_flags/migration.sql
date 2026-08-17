-- CreateTable
CREATE TABLE `feature_flags` (
    `key` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `note` VARCHAR(280) NULL,
    `updated_by` VARCHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
