-- GUIC-223 — Ajout des colonnes CV au profil jeune (réutilisation lors d'une candidature).
ALTER TABLE `profils_jeunes` ADD COLUMN `cv_url` VARCHAR(500) NULL;
ALTER TABLE `profils_jeunes` ADD COLUMN `cv_uploaded_at` DATETIME(3) NULL;
