-- M12 IA — Transcript web durable Yaye (GUIC-435, option A).
-- Texte PSEUDONYMISÉ des tours web → rend les conversations web jugeables (couche 3).
-- Écriture gardée par le flag d'env YAYE_PERSIST_WEB_TRANSCRIPT.

-- CreateTable
CREATE TABLE `yaye_transcript_turns` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NULL,
    `canal` ENUM('web', 'whatsapp') NOT NULL,
    `tour_index` INTEGER NOT NULL,
    `user_text` TEXT NULL,
    `assistant_text` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `yaye_transcript_turns_session_id_tour_index_idx`(`session_id`, `tour_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
