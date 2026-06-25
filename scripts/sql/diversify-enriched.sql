-- Diversification du dataset enrichi `yaye_poc_enriched` (GUIC-259, banc d'essai Yaye).
--
-- Problèmes corrigés :
--  1. ~96 % des opportunités étaient de type `Emploi` → on répartit les 6 types.
--  2. Organisation « Migration Drupal » partout → noms d'organisations réalistes variés.
--
-- Méthode DÉTERMINISTE (CRC32 de l'id) → ré-exécutable, même résultat à chaque fois.
-- L'invariant polymorphe (exactement 1 sous-type par opportunité, aligné sur `type`)
-- est garanti en RECONSTRUISANT les tables de sous-types depuis `opportunites.type`.
-- 100 % synthétique, base de POC isolée — aucune donnée de prod touchée.

-- ─────────────────────────────────────────────────────────────
-- 1. Type : répartition de base par buckets de hash (sur 100)
-- ─────────────────────────────────────────────────────────────
UPDATE opportunites SET type = CASE
  WHEN CRC32(id) % 100 < 45 THEN 'Emploi'
  WHEN CRC32(id) % 100 < 60 THEN 'Stage'
  WHEN CRC32(id) % 100 < 75 THEN 'Formation'
  WHEN CRC32(id) % 100 < 85 THEN 'Bourse'
  WHEN CRC32(id) % 100 < 93 THEN 'Volontariat'
  ELSE 'Appel_a_projets'
END;

-- ─────────────────────────────────────────────────────────────
-- 2. Overrides par mots-clés du titre (rend le type cohérent quand c'est explicite)
-- ─────────────────────────────────────────────────────────────
UPDATE opportunites SET type = 'Stage'
  WHERE LOWER(titre) LIKE '%stage%' OR LOWER(titre) LIKE '%stagiaire%';
UPDATE opportunites SET type = 'Bourse'
  WHERE LOWER(titre) LIKE '%bourse%' OR LOWER(titre) LIKE '%scholarship%';
UPDATE opportunites SET type = 'Formation'
  WHERE LOWER(titre) LIKE '%formation%' OR LOWER(titre) LIKE '%apprentissage%' OR LOWER(titre) LIKE '%atelier%';
UPDATE opportunites SET type = 'Volontariat'
  WHERE LOWER(titre) LIKE '%volontari%' OR LOWER(titre) LIKE '%bénévol%'
     OR LOWER(titre) LIKE '%benevol%' OR LOWER(titre) LIKE '%service civique%';
UPDATE opportunites SET type = 'Appel_a_projets'
  WHERE LOWER(titre) LIKE '%appel à projet%' OR LOWER(titre) LIKE '%appel a projet%'
     OR LOWER(titre) LIKE '%financement%' OR LOWER(titre) LIKE '%subvention%';

-- ─────────────────────────────────────────────────────────────
-- 3. Organisations réalistes (remplace « Migration Drupal »)
-- ─────────────────────────────────────────────────────────────
UPDATE opportunites
SET organisation = ELT(1 + CRC32(CONCAT(id, 'org')) % 16,
  'Sonatel', 'Orange Sénégal', 'CBAO Groupe Attijariwafa', 'SENELEC',
  'Société Générale Sénégal', 'Wave Sénégal', 'Free Sénégal', 'Expresso Sénégal',
  'PNUD Sénégal', 'Enda Tiers Monde', 'ONG Aide et Action', 'GIZ Sénégal',
  'DER/FJ', 'ANPEJ', '3FPT', 'Université Cheikh Anta Diop')
WHERE organisation = 'Migration Drupal';

UPDATE opportunites SET organisation_libelle = organisation
WHERE organisation_libelle = 'Migration Drupal' OR organisation_libelle IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. Reconstruction des sous-types (invariant XOR aligné sur le nouveau `type`)
-- ─────────────────────────────────────────────────────────────
DELETE FROM opportunites_emploi;
DELETE FROM opportunites_stage;
DELETE FROM opportunites_formation;
DELETE FROM opportunites_bourse;
DELETE FROM opportunites_volontariat;
DELETE FROM opportunites_appel_a_projets;

INSERT INTO opportunites_emploi (opportunite_id, type_contrat, teletravail)
SELECT id,
  ELT(1 + CRC32(id) % 5, 'CDI', 'CDD', 'FREELANCE', 'ALTERNANCE', 'STAGE_ALTERNE'),
  (CRC32(id) % 3 = 0)
FROM opportunites WHERE type = 'Emploi';

INSERT INTO opportunites_stage (opportunite_id, duree_mois, conventionne_ecole, indemnise)
SELECT id, 2 + CRC32(id) % 6, (CRC32(id) % 2 = 0), (CRC32(id) % 2 = 1)
FROM opportunites WHERE type = 'Stage';

INSERT INTO opportunites_formation (opportunite_id, duree_heures, modalite, certifiante, gratuite)
SELECT id, 20 + (CRC32(id) % 20) * 5,
  ELT(1 + CRC32(id) % 3, 'PRESENTIEL', 'DISTANCE', 'HYBRIDE'),
  (CRC32(id) % 2 = 0), (CRC32(id) % 2 = 1)
FROM opportunites WHERE type = 'Formation';

INSERT INTO opportunites_bourse (opportunite_id, montant_total_fcfa, organisme_financeur, couple_obligatoire)
SELECT id, (1 + CRC32(id) % 50) * 100000, organisation, 0
FROM opportunites WHERE type = 'Bourse';

INSERT INTO opportunites_volontariat (opportunite_id, duree_mois, type_volontariat, domaine_mission)
SELECT id, 6 + CRC32(id) % 18,
  ELT(1 + CRC32(id) % 4, 'SERVICE_CIVIQUE', 'ENGAGEMENT', 'INTERNATIONAL', 'HUMANITAIRE'),
  ELT(1 + CRC32(id) % 5, 'Éducation', 'Santé', 'Environnement', 'Développement communautaire', 'Agriculture')
FROM opportunites WHERE type = 'Volontariat';

INSERT INTO opportunites_appel_a_projets (opportunite_id, dossier_requis, criteres_eligibilite)
SELECT id,
  'Note de présentation du projet, budget prévisionnel, pièces justificatives.',
  'Porteur de projet basé au Sénégal, âgé de 18 à 35 ans, projet à impact local.'
FROM opportunites WHERE type = 'Appel_a_projets';
