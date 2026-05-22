-- GUIC-21 — Consentement aux notifications (WhatsApp/SMS) sur une candidature.
-- Colonne avec valeur par défaut : ajout sûr sur une table déjà peuplée.
ALTER TABLE `candidatures` ADD COLUMN `notifications_consent` BOOLEAN NOT NULL DEFAULT false;
