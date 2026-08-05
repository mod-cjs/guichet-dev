-- GUIC-689 — Profil v5 : objectif, langues, engagements, matricule de membre.
--
-- Généré par `prisma migrate diff`, puis EXPURGÉ à la main. Le diff se calculait
-- contre la base locale, partagée avec d'autres branches, et proposait donc de
-- supprimer leur travail (`evenements.image_url`, `utilisateurs.last_seen_at`,
-- table `relances_candidature`). Seules les opérations de CETTE branche sont ici.

-- AlterTable — « Objectif & secteurs visés » (réf profil-web.jsx ObjectiveCard).
-- `domaines_interet` portait déjà les secteurs ; ces trois colonnes complètent la carte.
ALTER TABLE `profils_jeunes` ADD COLUMN `objectif` TEXT NULL,
    ADD COLUMN `regions_mobilite` JSON NULL,
    ADD COLUMN `types_recherches` JSON NULL;

-- AlterTable — matricule de membre CJS, imprimé sur la carte. Nullable : les
-- comptes migrés n'en ont pas tant que le backfill n'est pas passé, et un
-- compte sans matricule doit rester utilisable.
ALTER TABLE `utilisateurs` ADD COLUMN `matricule` VARCHAR(20) NULL;

-- CreateTable — une ligne par langue déclarée. Les langues comptent dans le
-- matching au Sénégal (wolof, français, pulaar, sérère…) : un champ texte libre
-- ne s'exploiterait pas.
CREATE TABLE `langues_profil` (
    `id` VARCHAR(36) NOT NULL,
    `profil_id` VARCHAR(36) NOT NULL,
    `langue` VARCHAR(60) NOT NULL,
    `niveau` ENUM('maternelle', 'courant', 'intermediaire', 'notions') NOT NULL,

    INDEX `langues_profil_profil_id_idx`(`profil_id`),
    UNIQUE INDEX `langues_profil_profil_id_langue_key`(`profil_id`, `langue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable — engagement associatif / bénévolat, troisième source de la
-- timeline unifiée. Ce type n'existait pas : le bénévolat était soit absent,
-- soit saisi comme une expérience professionnelle, ce qui fausse la lecture
-- d'un parcours.
CREATE TABLE `engagements` (
    `id` VARCHAR(36) NOT NULL,
    `profil_id` VARCHAR(36) NOT NULL,
    `role` VARCHAR(150) NOT NULL,
    `organisation` VARCHAR(150) NOT NULL,
    `date_debut` DATETIME(3) NOT NULL,
    `date_fin` DATETIME(3) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `engagements_profil_id_idx`(`profil_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `utilisateurs_matricule_key` ON `utilisateurs`(`matricule`);

-- AddForeignKey
ALTER TABLE `langues_profil` ADD CONSTRAINT `langues_profil_profil_id_fkey` FOREIGN KEY (`profil_id`) REFERENCES `profils_jeunes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `engagements` ADD CONSTRAINT `engagements_profil_id_fkey` FOREIGN KEY (`profil_id`) REFERENCES `profils_jeunes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
