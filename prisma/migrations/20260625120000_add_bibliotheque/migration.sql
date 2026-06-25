-- M4 — Bibliothèque physique des centres (Lot 3 Yaye, GUIC-274).
-- Catalogue mutualisé (livres) + exemplaires physiques localisés (rayon/étagère/position)
-- dans un centre + emprunts (initie → en_cours au scan badge → rendu).
-- Spec : .agent_context/specs/M4-bibliotheque.md

-- CreateTable
CREATE TABLE `livres` (
    `id` VARCHAR(36) NOT NULL,
    `titre` VARCHAR(300) NOT NULL,
    `auteur` VARCHAR(200) NOT NULL,
    `isbn` VARCHAR(20) NULL,
    `theme` VARCHAR(120) NOT NULL,
    `niveau` VARCHAR(60) NULL,
    `langue` VARCHAR(40) NOT NULL DEFAULT 'fr',
    `resume` TEXT NULL,
    `couverture_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `livres_titre_idx`(`titre`),
    INDEX `livres_theme_idx`(`theme`),
    INDEX `livres_isbn_idx`(`isbn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exemplaires` (
    `id` VARCHAR(36) NOT NULL,
    `livre_id` VARCHAR(36) NOT NULL,
    `centre_id` VARCHAR(36) NOT NULL,
    `code_barre` VARCHAR(64) NOT NULL,
    `rayon` VARCHAR(40) NOT NULL,
    `etagere` VARCHAR(40) NOT NULL,
    `position` VARCHAR(40) NOT NULL,
    `statut` ENUM('disponible', 'emprunte', 'reserve', 'indisponible') NOT NULL DEFAULT 'disponible',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exemplaires_code_barre_key`(`code_barre`),
    INDEX `exemplaires_livre_id_idx`(`livre_id`),
    INDEX `exemplaires_centre_id_statut_idx`(`centre_id`, `statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emprunts` (
    `id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `exemplaire_id` VARCHAR(36) NOT NULL,
    `statut` ENUM('initie', 'en_cours', 'rendu', 'en_retard', 'annule') NOT NULL DEFAULT 'initie',
    `initie_a` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirme_a` DATETIME(3) NULL,
    `confirme_par` VARCHAR(36) NULL,
    `date_retour_prevue` DATETIME(3) NULL,
    `rendu_a` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `emprunts_cjs_uid_statut_idx`(`cjs_uid`, `statut`),
    INDEX `emprunts_exemplaire_id_statut_idx`(`exemplaire_id`, `statut`),
    INDEX `emprunts_statut_date_retour_prevue_idx`(`statut`, `date_retour_prevue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exemplaires` ADD CONSTRAINT `exemplaires_livre_id_fkey` FOREIGN KEY (`livre_id`) REFERENCES `livres`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exemplaires` ADD CONSTRAINT `exemplaires_centre_id_fkey` FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emprunts` ADD CONSTRAINT `emprunts_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emprunts` ADD CONSTRAINT `emprunts_exemplaire_id_fkey` FOREIGN KEY (`exemplaire_id`) REFERENCES `exemplaires`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
