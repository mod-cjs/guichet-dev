-- GUIC-477 — statut de validation des publications conseiller
-- Ajout de `en_relecture` (en attente de validation admin) et `refuse` (refusée).
ALTER TABLE `evenements`
  MODIFY COLUMN `statut` ENUM('a_venir','en_cours','termine','annule','en_relecture','refuse') NOT NULL DEFAULT 'a_venir';
