-- GUIC-257 : sections structurées opportunité (profilRecherche, mission, conditions)
-- Tous nullable pour rétro-compat avec les opportunités existantes.

ALTER TABLE `opportunites`
  ADD COLUMN `profil_recherche` TEXT NULL,
  ADD COLUMN `mission` TEXT NULL,
  ADD COLUMN `conditions` TEXT NULL;
