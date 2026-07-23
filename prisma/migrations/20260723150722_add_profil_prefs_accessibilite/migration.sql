-- GUIC-581 — ProfilJeune.prefs_accessibilite (préférences d'accessibilité par profil)
-- + rattrapage d'un drift PRÉ-EXISTANT embarqué par le diff Prisma :
--   * index `centres_slug_idx` déclaré dans schema.prisma mais créé par aucune
--     migration (présent sur certaines bases réelles, absent du replay shadow) ;
--   * FKs candidature_drafts / opportunites recréées avec les sémantiques
--     ON DELETE du schéma.
-- Statements idempotents (MariaDB IF [NOT] EXISTS) : la migration passe quel
-- que soit l'état de la base cible (drift déjà présent ou non).

-- DropForeignKey (recréées plus bas avec les bonnes sémantiques)
ALTER TABLE `candidature_drafts` DROP FOREIGN KEY IF EXISTS `candidature_drafts_cjs_uid_fkey`;

-- DropForeignKey
ALTER TABLE `candidature_drafts` DROP FOREIGN KEY IF EXISTS `candidature_drafts_opportunite_id_fkey`;

-- DropForeignKey
ALTER TABLE `opportunites` DROP FOREIGN KEY IF EXISTS `opportunites_type_id_fkey`;

-- DropIndex (l'index implicite est recréé par l'AddForeignKey ci-dessous)
DROP INDEX IF EXISTS `candidature_drafts_opportunite_id_fkey` ON `candidature_drafts`;

-- AlterTable — la colonne GUIC-581
ALTER TABLE `profils_jeunes` ADD COLUMN IF NOT EXISTS `prefs_accessibilite` JSON NULL;

-- CreateIndex (drift : déjà présent sur certaines bases)
CREATE INDEX IF NOT EXISTS `centres_slug_idx` ON `centres`(`slug`);

-- AddForeignKey
ALTER TABLE `opportunites` ADD CONSTRAINT `opportunites_type_id_fkey` FOREIGN KEY (`type_id`) REFERENCES `opportunite_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidature_drafts` ADD CONSTRAINT `candidature_drafts_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidature_drafts` ADD CONSTRAINT `candidature_drafts_opportunite_id_fkey` FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
