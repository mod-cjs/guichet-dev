-- GUIC-140 — Droit à l'oubli (CDP, loi 2008-12).
-- La suppression d'un compte doit PURGER sa conversation WhatsApp (téléphone +
-- messages = PII) et non la détacher (ancien comportement ON DELETE SET NULL, qui
-- laissait le numéro et l'historique en base). messages_whatsapp passe aussi en
-- CASCADE (était RESTRICT, ce qui aurait bloqué la purge de la conversation).

ALTER TABLE `conversations_whatsapp` DROP FOREIGN KEY `conversations_whatsapp_cjs_uid_fkey`;
ALTER TABLE `conversations_whatsapp` ADD CONSTRAINT `conversations_whatsapp_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `messages_whatsapp` DROP FOREIGN KEY `messages_whatsapp_conversation_id_fkey`;
ALTER TABLE `messages_whatsapp` ADD CONSTRAINT `messages_whatsapp_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations_whatsapp`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
