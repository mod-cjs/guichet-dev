-- GUIC-513 — préférences de notification recruteur.
ALTER TABLE `utilisateurs`
    ADD COLUMN `notif_candidatures` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notif_messages` BOOLEAN NOT NULL DEFAULT true;
