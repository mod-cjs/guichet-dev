-- GUIC-510 — description (présentation) des partenaires / organisations recruteurs.
ALTER TABLE `organisations` ADD COLUMN `description` TEXT NULL AFTER `nom`;
