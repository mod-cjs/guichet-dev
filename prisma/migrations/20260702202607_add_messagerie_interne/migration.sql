-- GUIC-132/133 — Messagerie interne recruteur ↔ candidat (ancrée à une candidature).

-- CreateTable
CREATE TABLE `conversations` (
    `id` VARCHAR(36) NOT NULL,
    `candidature_id` VARCHAR(36) NOT NULL,
    `recruteur_uid` VARCHAR(36) NOT NULL,
    `candidat_uid` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `conversations_candidature_id_key`(`candidature_id`),
    INDEX `conversations_recruteur_uid_updated_at_idx`(`recruteur_uid`, `updated_at` DESC),
    INDEX `conversations_candidat_uid_updated_at_idx`(`candidat_uid`, `updated_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` VARCHAR(36) NOT NULL,
    `conversation_id` VARCHAR(36) NOT NULL,
    `sender_uid` VARCHAR(36) NOT NULL,
    `corps` TEXT NOT NULL,
    `lu` BOOLEAN NOT NULL DEFAULT false,
    `lu_le` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_candidature_id_fkey` FOREIGN KEY (`candidature_id`) REFERENCES `candidatures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
