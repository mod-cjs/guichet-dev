-- AlterTable
ALTER TABLE `profils_jeunes` DROP COLUMN `diplomes`;
-- CreateTable
CREATE TABLE `diplomes` (
    `id` VARCHAR(36) NOT NULL,
    `profil_id` VARCHAR(36) NOT NULL,
    `intitule` VARCHAR(200) NOT NULL,
    `etablissement` VARCHAR(200) NOT NULL,
    `annee_obtention` INTEGER NOT NULL,
    `niveau` VARCHAR(50) NOT NULL,
    `mention` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `diplomes_profil_id_idx`(`profil_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- AddForeignKey
ALTER TABLE `diplomes` ADD CONSTRAINT `diplomes_profil_id_fkey` FOREIGN KEY (`profil_id`) REFERENCES `profils_jeunes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
