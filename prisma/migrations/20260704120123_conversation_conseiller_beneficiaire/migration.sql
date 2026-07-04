-- GUIC-470 — conversations conseiller↔bénéficiaire (hors candidature).
-- candidature_id devient nullable ; ajout d'un sujet libre.
ALTER TABLE `conversations` MODIFY COLUMN `candidature_id` VARCHAR(36) NULL;
ALTER TABLE `conversations` ADD COLUMN `sujet` VARCHAR(255) NULL AFTER `candidature_id`;
