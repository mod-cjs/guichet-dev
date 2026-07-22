-- CreateTable
CREATE TABLE `notification_event_config` (
    `id` VARCHAR(36) NOT NULL,
    `event_key` VARCHAR(80) NOT NULL,
    `role` VARCHAR(40) NOT NULL,
    `canaux` JSON NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `updated_by` VARCHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_event_config_event_key_role_key`(`event_key`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_preferences` (
    `id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `canal` ENUM('in_app', 'whatsapp', 'sms', 'email') NOT NULL,
    `consent_given` BOOLEAN NOT NULL DEFAULT false,
    `consent_at` DATETIME(3) NULL,
    `consent_source` VARCHAR(40) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `categories_off` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_preferences_cjs_uid_canal_key`(`cjs_uid`, `canal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE CASCADE ON UPDATE CASCADE;
