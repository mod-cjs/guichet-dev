-- GUIC-20 — Ajout du champ `slug` (SEO) sur `opportunites`.
-- Migration en 3 étapes : la table peut déjà contenir des données (opportunités
-- migrées de Drupal), une colonne UNIQUE NOT NULL ne peut donc pas être créée
-- en une seule passe.

-- Étape 1 — colonne nullable
ALTER TABLE `opportunites` ADD COLUMN `slug` VARCHAR(280) NULL;

-- Étape 2 — backfill : valeur unique non nulle garantie (= id).
-- Les slugs lisibles (slugify(titre)) sont (re)générés par
-- scripts/backfill-opportunite-slugs.ts pour les lignes héritées ; le seed
-- renseigne directement le slug définitif pour les nouvelles données.
UPDATE `opportunites` SET `slug` = `id` WHERE `slug` IS NULL;

-- Étape 3 — contrainte NOT NULL + index unique
ALTER TABLE `opportunites` MODIFY `slug` VARCHAR(280) NOT NULL;
CREATE UNIQUE INDEX `opportunites_slug_key` ON `opportunites`(`slug`);
