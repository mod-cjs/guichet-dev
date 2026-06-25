-- M12 IA — File d'escalade Yaye → opérateur humain (Lot 6, GUIC-259).
-- Porte l'ÉTAT de traitement d'une escalade (statut + qui/quand), mutable par le staff.
-- La trace événementielle reste dans `agent_logs` (type `escalade_conseiller`), append-only.

-- CreateTable
CREATE TABLE `escalades_yaye` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NULL,
    `role` VARCHAR(40) NULL,
    `centre_id` VARCHAR(36) NULL,
    `canal` ENUM('web', 'whatsapp') NOT NULL,
    `raison` TEXT NULL,
    `stade` VARCHAR(160) NULL,
    `statut` ENUM('en_attente', 'prise_en_charge', 'resolue') NOT NULL DEFAULT 'en_attente',
    `traite_par` VARCHAR(36) NULL,
    `traite_a` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `escalades_yaye_statut_created_at_idx`(`statut`, `created_at`),
    INDEX `escalades_yaye_session_id_idx`(`session_id`),
    INDEX `escalades_yaye_centre_id_statut_idx`(`centre_id`, `statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
