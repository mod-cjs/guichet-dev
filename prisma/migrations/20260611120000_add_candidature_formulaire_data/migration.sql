-- GUIC-361 — Snapshot des champs saisis dans le formulaire de candidature
-- (email, téléphone, niveau d'études, situation, compétences, domaines).
-- Permet de figer les infos transmises au recruteur, indépendamment des
-- modifications ultérieures du profil utilisateur.
ALTER TABLE `candidatures`
  ADD COLUMN `formulaire_data` JSON NULL;
