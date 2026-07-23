-- GUIC-660 — Situation de handicap + Zone d'habitation (rural/urbain) au profil bénéficiaire.
-- Deux données socio-démographiques inclusion, auto-déclarées et facultatives.
-- Généré par `prisma migrate diff` (schéma avant/après). À appliquer une fois la
-- réconciliation des migrations de la base POC effectuée (GUIC-641 / Vague 0).

-- AlterTable
ALTER TABLE `profils_jeunes` ADD COLUMN `situation_handicap` ENUM('aucun', 'moteur', 'visuel', 'auditif', 'autre', 'non_precise') NULL,
    ADD COLUMN `zone_habitation` ENUM('rural', 'urbain') NULL;

-- AlterTable
ALTER TABLE `onboarding_drafts` ADD COLUMN `situation_handicap` VARCHAR(20) NULL,
    ADD COLUMN `zone_habitation` VARCHAR(10) NULL;
