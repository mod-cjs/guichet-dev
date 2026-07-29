-- GUIC-684 — Suppression de la colonne dépréciée `opportunites.programme_id`.
--
-- La colonne portait le rattachement 1:N historique. Depuis l'introduction de la
-- jonction M:N, plus rien ne l'écrit et le DTO lisait la jonction en priorité.
--
-- AUTO-PORTANTE : la migration recopie d'abord les rattachements restants dans la
-- jonction, PUIS supprime la colonne. Sans cette étape, un environnement où le
-- backfill applicatif n'aurait pas été lancé perdrait ses rattachements en silence
-- au moment du déploiement. Les bases locales sont à 0 ligne concernée, mais on ne
-- déduit pas l'état de la prod de celui de son poste.

-- 1. Sauvegarde des rattachements portés par la colonne (no-op si aucun).
INSERT INTO `opportunites_programmes` (`opportunite_id`, `programme_id`, `principal`)
SELECT o.`id`, o.`programme_id`, 1
FROM `opportunites` o
WHERE o.`programme_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `opportunites_programmes` op WHERE op.`opportunite_id` = o.`id`
  );

-- 2. Retrait de la contrainte, de l'index puis de la colonne.
ALTER TABLE `opportunites` DROP FOREIGN KEY `opportunites_programme_id_fkey`;

DROP INDEX `opportunites_programme_id_idx` ON `opportunites`;

ALTER TABLE `opportunites` DROP COLUMN `programme_id`;
