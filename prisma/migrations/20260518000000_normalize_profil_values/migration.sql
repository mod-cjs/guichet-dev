-- Normalisation des codes niveauEtude et situationEmploi
-- Anciens formats texte (issus de SectionProfil v1) → codes normalisés (StepProfil)
-- Idempotent : les lignes déjà normalisées ne sont pas modifiées

-- ── niveau_etude ──────────────────────────────────────────────────────────────
UPDATE `profils_jeunes` SET `niveau_etude` = 'aucun'         WHERE `niveau_etude` = 'Sans diplôme';
UPDATE `profils_jeunes` SET `niveau_etude` = 'brevet'        WHERE `niveau_etude` = 'BFEM';
UPDATE `profils_jeunes` SET `niveau_etude` = 'bac'           WHERE `niveau_etude` = 'BAC';
UPDATE `profils_jeunes` SET `niveau_etude` = 'bac+2'         WHERE `niveau_etude` IN ('BTS', 'DUT');
UPDATE `profils_jeunes` SET `niveau_etude` = 'licence'       WHERE `niveau_etude` = 'Licence';
UPDATE `profils_jeunes` SET `niveau_etude` = 'master'        WHERE `niveau_etude` = 'Master';
UPDATE `profils_jeunes` SET `niveau_etude` = 'doctorat'      WHERE `niveau_etude` = 'Doctorat';
UPDATE `profils_jeunes` SET `niveau_etude` = 'formation_pro' WHERE `niveau_etude` = 'Formation professionnelle';

-- ── situation_emploi ──────────────────────────────────────────────────────────
UPDATE `profils_jeunes` SET `situation_emploi` = 'en_recherche' WHERE `situation_emploi` = "En recherche d'emploi";
UPDATE `profils_jeunes` SET `situation_emploi` = 'employe'      WHERE `situation_emploi` = 'En emploi';
UPDATE `profils_jeunes` SET `situation_emploi` = 'stagiaire'    WHERE `situation_emploi` = 'En stage';
UPDATE `profils_jeunes` SET `situation_emploi` = 'en_formation' WHERE `situation_emploi` = 'En formation';
UPDATE `profils_jeunes` SET `situation_emploi` = 'independant'  WHERE `situation_emploi` = 'Entrepreneur';
UPDATE `profils_jeunes` SET `situation_emploi` = NULL           WHERE `situation_emploi` = 'Autre';
