-- Ajoute la photo/visuel d'un événement (GUIC-687).
ALTER TABLE `evenements` ADD COLUMN `image_url` VARCHAR(500) NULL AFTER `lieu`;
