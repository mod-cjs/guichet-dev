-- GUIC-514 — Entretiens recruteur.
CREATE TABLE `entretiens` (
    `id` VARCHAR(36) NOT NULL,
    `candidature_id` VARCHAR(36) NOT NULL,
    `recruteur_uid` VARCHAR(36) NOT NULL,
    `candidat_uid` VARCHAR(36) NOT NULL,
    `date_heure` DATETIME(3) NOT NULL,
    `mode` ENUM('Presentiel', 'Visio', 'Telephone') NOT NULL DEFAULT 'Visio',
    `lieu` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `statut` ENUM('Planifie', 'Annule', 'Termine') NOT NULL DEFAULT 'Planifie',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `entretiens_recruteur_uid_date_heure_idx`(`recruteur_uid`, `date_heure`),
    INDEX `entretiens_candidat_uid_date_heure_idx`(`candidat_uid`, `date_heure`),
    INDEX `entretiens_candidature_id_idx`(`candidature_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `entretiens` ADD CONSTRAINT `entretiens_candidature_id_fkey` FOREIGN KEY (`candidature_id`) REFERENCES `candidatures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
