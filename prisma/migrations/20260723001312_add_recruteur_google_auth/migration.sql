-- CreateTable
CREATE TABLE `recruteur_google_auth` (
    `cjs_uid` VARCHAR(36) NOT NULL,
    `google_email` VARCHAR(255) NOT NULL,
    `access_token` TEXT NOT NULL,
    `refresh_token` TEXT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `scopes` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`cjs_uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
