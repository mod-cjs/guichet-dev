-- GUIC-688 — Consultations multicanal : trace unifiée « qui a vu quoi, par quel canal ».
--
-- Table INSERT-only, sans FK (référence polymorphe `type_entite` + `entite_id`),
-- sur le modèle de `centre_events`. Aucune purge/rétention associée (décision PO).
--
-- Écrite à la main : la base locale n'était pas joignable au moment de la génération
-- (`prisma migrate diff` exige une shadow DB). Forme calquée sur le SQL produit par
-- Prisma pour MariaDB — à vérifier par `prisma migrate diff` dès que la base est up.

-- CreateTable
CREATE TABLE `consultations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `type_entite` ENUM('opportunite', 'ressource', 'evenement', 'centre', 'livre', 'programme', 'organisation') NOT NULL,
    `entite_id` VARCHAR(36) NOT NULL,
    `type_event` ENUM('impression', 'consultation') NOT NULL,
    `canal` ENUM('web', 'ia_web', 'whatsapp') NOT NULL,
    `cjs_uid` VARCHAR(36) NULL,
    `sujet_hash` CHAR(64) NOT NULL,
    `origine` VARCHAR(30) NULL,
    `session_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `consultations_type_entite_entite_id_created_at_idx`(`type_entite`, `entite_id`, `created_at`),
    INDEX `consultations_cjs_uid_created_at_idx`(`cjs_uid`, `created_at`),
    INDEX `consultations_canal_type_event_created_at_idx`(`canal`, `type_event`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
