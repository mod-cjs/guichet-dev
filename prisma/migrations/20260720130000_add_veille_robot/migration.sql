-- CreateTable
CREATE TABLE `executions_veille` (
    `id` VARCHAR(36) NOT NULL,
    `source_id` VARCHAR(36) NOT NULL,
    `demarre_le` DATETIME(3) NOT NULL,
    `duree_ms` INTEGER NOT NULL,
    `nb_nouveautes` INTEGER NOT NULL DEFAULT 0,
    `nb_erreurs` INTEGER NOT NULL DEFAULT 0,
    `statut` ENUM('ok', 'partiel', 'erreur') NOT NULL,
    `message_erreur` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `executions_veille_source_id_created_at_idx`(`source_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items_curation` (
    `id` VARCHAR(36) NOT NULL,
    `source_id` VARCHAR(36) NOT NULL,
    `execution_id` VARCHAR(36) NULL,
    `url_canonique` VARCHAR(500) NOT NULL,
    `empreinte` VARCHAR(64) NOT NULL,
    `titre` VARCHAR(300) NULL,
    `payload_extrait` JSON NULL,
    `score_completude` INTEGER NULL,
    `statut` ENUM('decouvert', 'a_valider', 'approuvee', 'rejetee', 'en_attente', 'doublon') NOT NULL DEFAULT 'decouvert',
    `motif_rejet` TEXT NULL,
    `moderee_par` VARCHAR(36) NULL,
    `moderee_le` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `items_curation_empreinte_key`(`empreinte`),
    INDEX `items_curation_source_id_statut_idx`(`source_id`, `statut`),
    INDEX `items_curation_statut_created_at_idx`(`statut`, `created_at`),
    INDEX `items_curation_execution_id_idx`(`execution_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `executions_veille` ADD CONSTRAINT `executions_veille_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `sources_veille`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_curation` ADD CONSTRAINT `items_curation_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `sources_veille`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_curation` ADD CONSTRAINT `items_curation_execution_id_fkey` FOREIGN KEY (`execution_id`) REFERENCES `executions_veille`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

