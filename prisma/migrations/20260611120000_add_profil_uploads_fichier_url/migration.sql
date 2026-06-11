-- GUIC-360 — Ajout de `fichier_url` sur Diplome et CertificatMoodle
-- pour permettre l'upload de scans/justificatifs (PDF/JPG/PNG) stockés
-- sur Vercel Blob et liés au profil jeune.

ALTER TABLE `diplomes`
  ADD COLUMN `fichier_url` VARCHAR(500) NULL;

ALTER TABLE `certificats_moodle`
  ADD COLUMN `fichier_url` VARCHAR(500) NULL;
