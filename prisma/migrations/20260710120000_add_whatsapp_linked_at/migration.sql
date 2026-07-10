-- GUIC-140 — binding WhatsApp ↔ compte via lien magique.
-- Horodatage de la liaison téléphone ↔ cjs_uid (NULL = non lié).
ALTER TABLE `conversations_whatsapp` ADD COLUMN `linked_at` DATETIME(3) NULL AFTER `cjs_uid`;
