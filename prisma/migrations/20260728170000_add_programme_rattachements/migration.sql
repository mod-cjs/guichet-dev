-- GUIC-684 — Rattachement aux programmes (M:N).
-- Une jonction par entité (Prisma n'a pas de relation polymorphique) : opportunités,
-- ressources, événements. `principal` = programme affiché quand une seule place
-- est disponible (badge, `programme_slug` du Data Hub). Invariants applicatifs
-- (au plus un principal, au moins un rattachement) : src/lib/programmes/rattachement.ts

-- CreateTable
CREATE TABLE `opportunites_programmes` (
    `opportunite_id` VARCHAR(36) NOT NULL,
    `programme_id` VARCHAR(36) NOT NULL,
    `principal` BOOLEAN NOT NULL DEFAULT false,

    INDEX `opportunites_programmes_programme_id_idx`(`programme_id`),
    PRIMARY KEY (`opportunite_id`, `programme_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ressources_programmes` (
    `ressource_id` VARCHAR(36) NOT NULL,
    `programme_id` VARCHAR(36) NOT NULL,
    `principal` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ressources_programmes_programme_id_idx`(`programme_id`),
    PRIMARY KEY (`ressource_id`, `programme_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evenements_programmes` (
    `evenement_id` VARCHAR(36) NOT NULL,
    `programme_id` VARCHAR(36) NOT NULL,
    `principal` BOOLEAN NOT NULL DEFAULT false,

    INDEX `evenements_programmes_programme_id_idx`(`programme_id`),
    PRIMARY KEY (`evenement_id`, `programme_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `opportunites_programmes` ADD CONSTRAINT `opportunites_programmes_opportunite_id_fkey` FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunites_programmes` ADD CONSTRAINT `opportunites_programmes_programme_id_fkey` FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ressources_programmes` ADD CONSTRAINT `ressources_programmes_ressource_id_fkey` FOREIGN KEY (`ressource_id`) REFERENCES `ressources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ressources_programmes` ADD CONSTRAINT `ressources_programmes_programme_id_fkey` FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evenements_programmes` ADD CONSTRAINT `evenements_programmes_evenement_id_fkey` FOREIGN KEY (`evenement_id`) REFERENCES `evenements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evenements_programmes` ADD CONSTRAINT `evenements_programmes_programme_id_fkey` FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
