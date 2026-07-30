-- M13 / Data Hub — prérequis de schéma pour l'extraction incrémentale (GUIC-36).
-- Cf. `.agent_context/specs/M13-etl-meltano.md` §4.
--
-- 1. Watermarks manquants sur les deux tables mutables exportées.
-- 2. Index composites `(watermark, clé primaire)` sur les treize flux.
--
-- NOTE — le SQL brut de `prisma migrate diff` proposait
--   ALTER TABLE `reservations` ADD COLUMN `updated_at` DATETIME(3) NOT NULL;
-- qui échoue (ou remplit des dates zéro) sur une table non vide en mode strict.
-- On ajoute donc la colonne avec un défaut, on la rétro-remplit depuis `created_at`
-- — la date de création est la meilleure approximation de la dernière modification
-- pour une ligne jamais modifiée depuis — puis on retire le défaut : `@updatedAt`
-- est géré par l'application, pas par la base, et un défaut résiduel ferait dériver
-- le schéma physique de `schema.prisma`.
--
-- Le bruit `MODIFY … JSON` de MariaDB a été filtré via
-- `scripts/prisma-filtrer-bruit-mariadb.sh` (cf. GUIC-684).

-- AlterTable — watermark de réplication des emprunts
ALTER TABLE `emprunts` ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
UPDATE `emprunts` SET `updated_at` = `created_at`;
ALTER TABLE `emprunts` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable — watermark de réplication des réservations
ALTER TABLE `reservations` ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
UPDATE `reservations` SET `updated_at` = `created_at`;
ALTER TABLE `reservations` ALTER COLUMN `updated_at` DROP DEFAULT;

-- CreateIndex
CREATE INDEX `utilisateurs_updated_at_cjs_uid_idx` ON `utilisateurs`(`updated_at`, `cjs_uid`);

-- CreateIndex
CREATE INDEX `profils_jeunes_updated_at_id_idx` ON `profils_jeunes`(`updated_at`, `id`);

-- CreateIndex
CREATE INDEX `opportunites_updated_at_id_idx` ON `opportunites`(`updated_at`, `id`);

-- CreateIndex
CREATE INDEX `candidatures_updated_at_id_idx` ON `candidatures`(`updated_at`, `id`);

-- CreateIndex
CREATE INDEX `evenements_updated_at_id_idx` ON `evenements`(`updated_at`, `id`);

-- CreateIndex
CREATE INDEX `inscriptions_evenements_updated_at_id_idx` ON `inscriptions_evenements`(`updated_at`, `id`);

-- CreateIndex
CREATE INDEX `centres_updated_at_id_idx` ON `centres`(`updated_at`, `id`);

-- CreateIndex
CREATE INDEX `reservations_updated_at_id_idx` ON `reservations`(`updated_at`, `id`);

-- CreateIndex
CREATE INDEX `check_ins_effectue_a_id_idx` ON `check_ins`(`effectue_a`, `id`);

-- CreateIndex
CREATE INDEX `ressources_updated_at_id_idx` ON `ressources`(`updated_at`, `id`);

-- CreateIndex
CREATE INDEX `consultations_created_at_id_idx` ON `consultations`(`created_at`, `id`);

-- CreateIndex
CREATE INDEX `emprunts_updated_at_id_idx` ON `emprunts`(`updated_at`, `id`);

-- CreateIndex
CREATE INDEX `programmes_updated_at_id_idx` ON `programmes`(`updated_at`, `id`);
