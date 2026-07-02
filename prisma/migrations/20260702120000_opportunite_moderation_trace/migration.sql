-- GUIC-471 — Traçabilité de modération sur les opportunités (conformité CDP, loi 2008-12).
-- Générique : `modere_par`/`modere_le` renseignés à l'approbation OU au rejet ;
-- `motif_rejet` uniquement au rejet. Colonnes nullable → rétro-compatibles (rows existantes).
ALTER TABLE `opportunites`
  ADD COLUMN `motif_rejet` TEXT NULL,
  ADD COLUMN `modere_par` VARCHAR(36) NULL,
  ADD COLUMN `modere_le` DATETIME(3) NULL;
