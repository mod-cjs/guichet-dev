-- CreateTable
CREATE TABLE `email_templates` (
    `id` VARCHAR(36) NOT NULL,
    `cle` VARCHAR(80) NOT NULL,
    `owner_uid` VARCHAR(36) NOT NULL DEFAULT '',
    `sujet` VARCHAR(255) NOT NULL,
    `corps` TEXT NOT NULL,
    `updated_by` VARCHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `email_templates_cle_owner_uid_key`(`cle`, `owner_uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
