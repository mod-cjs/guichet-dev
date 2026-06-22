-- M12 IA — Métriques de performance conversationnelle Yaye (GUIC-435, Yaye Quality Score)
-- On AJOUTE 3 tables, on ne modifie aucune table existante.

-- CreateTable
CREATE TABLE `yaye_feedback` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NULL,
    `canal` ENUM('web', 'whatsapp') NOT NULL,
    `tour_index` INTEGER NULL,
    `note` INTEGER NOT NULL,
    `raison` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `yaye_feedback_session_id_idx`(`session_id`),
    INDEX `yaye_feedback_cjs_uid_created_at_idx`(`cjs_uid`, `created_at` DESC),
    INDEX `yaye_feedback_canal_created_at_idx`(`canal`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yaye_eval_scores` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `tour_index` INTEGER NULL,
    `juge` VARCHAR(80) NOT NULL,
    `fidelite` DOUBLE NOT NULL,
    `pertinence` DOUBLE NOT NULL,
    `utilite` DOUBLE NOT NULL,
    `persona` DOUBLE NOT NULL,
    `conformite_cdp` DOUBLE NOT NULL,
    `langue` DOUBLE NOT NULL,
    `drapeau_rouge` BOOLEAN NOT NULL DEFAULT false,
    `commentaire` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `yaye_eval_scores_session_id_idx`(`session_id`),
    INDEX `yaye_eval_scores_created_at_idx`(`created_at`),
    INDEX `yaye_eval_scores_drapeau_rouge_created_at_idx`(`drapeau_rouge`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yaye_session_summaries` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NULL,
    `centre_id` VARCHAR(36) NULL,
    `canal` ENUM('web', 'whatsapp') NOT NULL,
    `nb_tours` INTEGER NOT NULL,
    `duree_ms` INTEGER NOT NULL,
    `escalade` BOOLEAN NOT NULL DEFAULT false,
    `resolu` BOOLEAN NOT NULL DEFAULT false,
    `converti` BOOLEAN NOT NULL DEFAULT false,
    `yqs` DOUBLE NULL,
    `drapeau_rouge` BOOLEAN NOT NULL DEFAULT false,
    `intention_princ` VARCHAR(60) NULL,
    `calcule_le` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `yaye_session_summaries_session_id_key`(`session_id`),
    INDEX `yaye_session_summaries_canal_calcule_le_idx`(`canal`, `calcule_le`),
    INDEX `yaye_session_summaries_intention_princ_idx`(`intention_princ`),
    INDEX `yaye_session_summaries_centre_id_calcule_le_idx`(`centre_id`, `calcule_le`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
