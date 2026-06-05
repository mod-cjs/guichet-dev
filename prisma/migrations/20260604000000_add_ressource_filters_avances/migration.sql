-- GUIC-24 — Filtres avancés sur la bibliothèque de ressources.
-- Ajout des colonnes `niveau`, `langue`, `categorie` (toutes nullable :
-- enrichissement progressif côté admin) sur `ressources`, plus index
-- pour les filtres listés.

ALTER TABLE `ressources`
  ADD COLUMN `niveau`    ENUM('Debutant', 'Intermediaire', 'Avance') NULL,
  ADD COLUMN `langue`    ENUM('FR', 'Wolof') NULL,
  ADD COLUMN `categorie` VARCHAR(100) NULL;

CREATE INDEX `ressources_niveau_idx` ON `ressources`(`niveau`);
CREATE INDEX `ressources_langue_idx` ON `ressources`(`langue`);
