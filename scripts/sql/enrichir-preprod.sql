-- ═════════════════════════════════════════════════════════════════════════════
-- Enrichissement SÛR POUR LA PRÉPROD — dérivé de `enrich-enriched-db.sql`.
--
-- Le script d'origine était écrit pour le dataset POC `yaye_poc_enriched`, et il
-- le dit lui-même en commentaire. Appliqué tel quel à la préprod, il aurait :
--
--   · vidé DOUZE tables sans `WHERE` — les dix tables de sous-types, la jonction
--     `opportunites_programmes` et une partie de `opportunites_skills` ;
--   · effacé des rattachements IRRÉCUPÉRABLES : `opportunites_programmes` a été
--     remplie par la migration 20260728210000, qui y a recopié
--     `opportunites.programme_id` AVANT de supprimer la colonne. Cette donnée
--     n'existe plus nulle part ailleurs ;
--   · FABRIQUÉ des données personnelles sensibles :
--     `UPDATE profils_jeunes SET situation_handicap = CASE WHEN CRC32(…)` sans
--     `WHERE`, sur des personnes réelles. Destruction d'une déclaration
--     volontaire, et sujet CDP (loi 2008-12) ;
--   · REDISTRIBUÉ les rôles : un administrateur et un modérateur tirés au sort
--     parmi les comptes sans rôle ;
--   · reclassé le `type_id` des offres sur des mots-clés du titre ;
--   · ouvert une transaction (`BEGIN`) sans jamais la refermer — selon le
--     client, tout est annulé en silence, ou tout s'applique.
--
-- CE QUI EST CONSERVÉ ICI : les deux seules sections purement ADDITIVES —
-- les sous-types manquants et les rattachements aux programmes manquants.
-- Rien n'est supprimé, rien n'est écrasé.
--
-- CE QUI EST ÉCARTÉ, et pourquoi : les sections 0, 1, 3, 4, 6, 7, 8 et 9 du
-- script d'origine. Elles suppriment, reclassent ou fabriquent. Si vous en
-- voulez une, elle se traite au cas par cas — pas en bloc.
--
-- Usage :
--   mysql -h <hôte> -u <user> -p <base> < scripts/sql/enrichir-preprod.sql
--
-- IDEMPOTENT : rejouable sans effet de bord. Chaque insertion est gardée par un
-- `NOT EXISTS`, donc un second passage n'écrit rien.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Base visée — affichée avant toute écriture ───────────────────────────────
-- Pas de `USE` volontairement : la base vient de la connexion, ce qui évite
-- qu'un nom codé en dur envoie le script sur la mauvaise. Si aucune base n'est
-- sélectionnée, MySQL refuse de lui-même (« No database selected ») dès la
-- première instruction — inutile d'ajouter une garde qui ferait double emploi.
SELECT CONCAT('Base visée : ', IFNULL(DATABASE(), '(aucune)')) AS `Cible`;

-- ── GARDE — périmètre : les offres SAISIES DANS L'APPLICATION sont intouchables
-- Une opportunité portant un `recruteur_uid` a été créée par un recruteur via
-- l'application : ses détails de sous-type sont SA saisie. Leur inventer un type
-- de contrat ou un montant par `CRC32` serait fabriquer de la donnée sur une
-- offre réelle. Seules les opportunités sans recruteur — celles du jeu de
-- démonstration — sont complétées.
SET @portee_offres := (SELECT COUNT(*) FROM opportunites WHERE recruteur_uid IS NULL AND deleted_at IS NULL);
SELECT CONCAT('Opportunités de démonstration concernées : ', @portee_offres) AS `Périmètre`;
SELECT CONCAT('Opportunités saisies par un recruteur, PRÉSERVÉES : ',
  (SELECT COUNT(*) FROM opportunites WHERE recruteur_uid IS NOT NULL AND deleted_at IS NULL)) AS `Hors périmètre`;

START TRANSACTION;

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION A — Sous-types MANQUANTS (complétés, jamais reconstruits)
--
-- L'original vidait les dix tables puis réinsérait tout. Ici on n'insère que
-- la ligne absente : l'invariant « exactement un sous-type » est atteint sans
-- détruire les lignes existantes, qui peuvent porter une saisie réelle.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO opportunites_emploi (opportunite_id, type_contrat, teletravail)
SELECT o.id,
  ELT(1 + CRC32(o.id) % 5, 'CDI', 'CDD', 'FREELANCE', 'ALTERNANCE', 'STAGE_ALTERNE'),
  (CRC32(o.id) % 3 = 0)
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'emploi' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_emploi x WHERE x.opportunite_id = o.id);

INSERT INTO opportunites_stage (opportunite_id, duree_mois, conventionne_ecole, indemnise)
SELECT o.id, 2 + CRC32(o.id) % 6, (CRC32(o.id) % 2 = 0), (CRC32(o.id) % 2 = 1)
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'stage' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_stage x WHERE x.opportunite_id = o.id);

INSERT INTO opportunites_formation (opportunite_id, duree_heures, modalite, certifiante, gratuite)
SELECT o.id, 20 + (CRC32(o.id) % 20) * 5,
  ELT(1 + CRC32(o.id) % 3, 'PRESENTIEL', 'DISTANCE', 'HYBRIDE'),
  (CRC32(o.id) % 2 = 0), (CRC32(o.id) % 4 = 0)
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'formation' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_formation x WHERE x.opportunite_id = o.id);

INSERT INTO opportunites_bourse (opportunite_id, montant_total_fcfa, organisme_financeur, couple_obligatoire)
SELECT o.id, 250000 + (CRC32(o.id) % 30) * 50000,
  ELT(1 + CRC32(o.id) % 4, 'DER/FJ', 'PNUD', 'FONGIP', 'GIZ'),
  (CRC32(o.id) % 5 = 0)
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'bourse' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_bourse x WHERE x.opportunite_id = o.id);

INSERT INTO opportunites_volontariat (opportunite_id, duree_mois, type_volontariat, domaine_mission)
SELECT o.id, 3 + CRC32(o.id) % 10,
  ELT(1 + CRC32(o.id) % 3, 'SERVICE_CIVIQUE', 'BENEVOLAT', 'VOLONTARIAT_INTERNATIONAL'),
  ELT(1 + CRC32(o.id) % 4, 'Éducation', 'Santé', 'Environnement', 'Citoyenneté')
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'volontariat' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_volontariat x WHERE x.opportunite_id = o.id);

INSERT INTO opportunites_appel_a_projets (opportunite_id, dossier_requis, criteres_eligibilite)
SELECT o.id, (CRC32(o.id) % 2 = 0),
  ELT(1 + CRC32(o.id) % 3,
    'Porteur de projet âgé de 18 à 35 ans, résidant au Sénégal.',
    'Structure formalisée depuis moins de 3 ans.',
    'Projet à impact social ou environnemental démontré.')
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'appel_a_projets' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_appel_a_projets x WHERE x.opportunite_id = o.id);

INSERT INTO opportunites_concours (opportunite_id, organisme_organisateur, date_epreuves, lieu_epreuves, preuves_demandees, places_disponibles)
SELECT o.id,
  ELT(1 + CRC32(o.id) % 3, 'Ministère de la Jeunesse', 'CJS', 'ANPEJ'),
  DATE_ADD(CURDATE(), INTERVAL (30 + CRC32(o.id) % 120) DAY),
  ELT(1 + CRC32(o.id) % 4, 'Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor'),
  (CRC32(o.id) % 2 = 0),
  10 + CRC32(o.id) % 90
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'concours' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_concours x WHERE x.opportunite_id = o.id);

INSERT INTO opportunites_financement (opportunite_id, montant_fcfa, type_financement, taux_annuel, garanties, duree_remboursement_mois, organisme_financeur, is_continuous, date_limite_depot)
SELECT o.id, 500000 + (CRC32(o.id) % 40) * 100000,
  ELT(1 + CRC32(o.id) % 3, 'PRET', 'SUBVENTION', 'GARANTIE'),
  ROUND(2 + (CRC32(o.id) % 80) / 10, 2),
  ELT(1 + CRC32(o.id) % 3, 'Caution solidaire', 'Nantissement de matériel', 'Aucune'),
  6 + CRC32(o.id) % 54,
  ELT(1 + CRC32(o.id) % 4, 'DER/FJ', 'FONGIP', 'BNDE', 'La Banque Agricole'),
  (CRC32(o.id) % 4 = 0),
  DATE_ADD(CURDATE(), INTERVAL (20 + CRC32(o.id) % 100) DAY)
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'financement' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_financement x WHERE x.opportunite_id = o.id);

INSERT INTO opportunites_mentorat (opportunite_id, duree_mois, modalite, thematique, places_disponibles, organisateur_libelle)
SELECT o.id, 2 + CRC32(o.id) % 10,
  ELT(1 + CRC32(o.id) % 3, 'PRESENTIEL', 'DISTANCE', 'HYBRIDE'),
  ELT(1 + CRC32(o.id) % 4, 'Entrepreneuriat', 'Numérique', 'Agriculture', 'Insertion professionnelle'),
  5 + CRC32(o.id) % 25,
  ELT(1 + CRC32(o.id) % 3, 'CJS', 'Réseau Entreprendre Sénégal', 'Jokkolabs')
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'mentorat' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_mentorat x WHERE x.opportunite_id = o.id);

INSERT INTO opportunites_mobilite (opportunite_id, destination, type_mobilite, duree_mois, pris_en_charge, niveau_langue_requis, date_depart_prevue)
SELECT o.id,
  ELT(1 + CRC32(o.id) % 5, 'Rabat', 'Abidjan', 'Tunis', 'Montpellier', 'Kigali'),
  ELT(1 + CRC32(o.id) % 3, 'ETUDES', 'STAGE', 'ECHANGE'),
  3 + CRC32(o.id) % 12,
  (CRC32(o.id) % 2 = 0),
  ELT(1 + CRC32(o.id) % 3, 'Français courant', 'Anglais B2', 'Aucun prérequis'),
  DATE_ADD(CURDATE(), INTERVAL (60 + CRC32(o.id) % 180) DAY)
FROM opportunites o JOIN opportunite_types t ON t.id = o.type_id
WHERE t.slug = 'mobilite' AND o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_mobilite x WHERE x.opportunite_id = o.id);

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION B — Rattachements aux programmes MANQUANTS
--
-- L'original faisait `DELETE FROM opportunites_programmes;` puis réinsérait.
-- Ce `DELETE` effaçait notamment les rattachements repris de la colonne
-- `opportunites.programme_id` supprimée depuis : donnée irrécupérable. Ici on
-- complète seulement ce qui manque, et on ne touche pas aux offres portant déjà
-- un rattachement — y compris celles saisies par un recruteur.
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO opportunites_programmes (opportunite_id, programme_id, principal)
SELECT o.id, p.id, 1
FROM opportunites o
JOIN opportunite_types ot ON ot.id = o.type_id
JOIN programmes p ON p.slug = (
  CASE
    WHEN o.domaine IN ('Agriculture', 'Environnement')              THEN 'yeah'
    WHEN o.domaine = 'Entrepreneuriat'                              THEN 'yaakaar'
    WHEN ot.slug IN ('emploi', 'stage')                             THEN 'yjc'
    WHEN ot.slug IN ('formation', 'bourse', 'mentorat', 'mobilite') THEN 'edupop'
    ELSE 'yaakaar'
  END
)
WHERE o.deleted_at IS NULL
  -- Aucune offre déjà rattachée n'est retouchée : son rattachement peut venir
  -- du backfill de la colonne supprimée, ou d'une saisie admin.
  AND NOT EXISTS (SELECT 1 FROM opportunites_programmes op WHERE op.opportunite_id = o.id);

-- Ressources et événements : complétés seulement s'ils n'ont aucun programme.
INSERT INTO ressources_programmes (ressource_id, programme_id, principal)
SELECT r.id, p.id, 1
FROM ressources r
JOIN programmes p ON p.slug = ELT(1 + CRC32(CONCAT(r.id, 'prog')) % 4, 'yaakaar', 'yeah', 'yjc', 'edupop')
WHERE NOT EXISTS (SELECT 1 FROM ressources_programmes rp WHERE rp.ressource_id = r.id);

INSERT INTO evenements_programmes (evenement_id, programme_id, principal)
SELECT e.id, p.id, 1
FROM evenements e
JOIN programmes p ON p.slug = ELT(1 + CRC32(CONCAT(e.id, 'prog')) % 4, 'yaakaar', 'yeah', 'yjc', 'edupop')
WHERE NOT EXISTS (SELECT 1 FROM evenements_programmes ep WHERE ep.evenement_id = e.id);

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- CONTRÔLES — tout doit être cohérent avant de conclure.
-- ═════════════════════════════════════════════════════════════════════════════

SELECT 'Offres de démonstration sans sous-type (doit être 0)' AS `Contrôle`, COUNT(*) AS `Valeur`
FROM opportunites o
JOIN opportunite_types t ON t.id = o.type_id
WHERE o.recruteur_uid IS NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_emploi          x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_stage           x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_formation       x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_bourse          x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_volontariat     x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_appel_a_projets x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_concours        x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_financement     x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_mentorat        x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_mobilite        x WHERE x.opportunite_id = o.id)

UNION ALL
-- Une offre SANS TYPE ne reçoit aucun rattachement : la règle porte sur le type,
-- et lui en attribuer un par défaut fabriquerait un lien qu'aucune donnée ne
-- justifie. On vérifie donc les offres TYPÉES, et on signale les autres.
SELECT 'Offres typées actives sans programme (doit être 0)', COUNT(*)
FROM opportunites o
WHERE o.deleted_at IS NULL AND o.type_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_programmes op WHERE op.opportunite_id = o.id)

UNION ALL
SELECT 'Offres SANS TYPE — à corriger en amont, non rattachées ici', COUNT(*)
FROM opportunites o
WHERE o.deleted_at IS NULL AND o.type_id IS NULL

UNION ALL
-- Invariant du sous-type : une offre ne devrait porter qu'une ligne. Des doublons
-- PRÉEXISTENT dans le jeu local (constaté : 12 avant comme après exécution) — ce
-- script n'en crée aucun, ses insertions étant gardées par `NOT EXISTS`. Relever
-- ce chiffre AVANT et APRÈS : il ne doit pas augmenter. S'il est non nul, c'est
-- une anomalie de données à traiter à part, pas un effet de ce script.
SELECT 'Offres portant PLUSIEURS sous-types (ne doit pas AUGMENTER)', COUNT(*) FROM (
  SELECT opportunite_id FROM (
    SELECT opportunite_id FROM opportunites_emploi
    UNION ALL SELECT opportunite_id FROM opportunites_stage
    UNION ALL SELECT opportunite_id FROM opportunites_formation
    UNION ALL SELECT opportunite_id FROM opportunites_bourse
    UNION ALL SELECT opportunite_id FROM opportunites_volontariat
    UNION ALL SELECT opportunite_id FROM opportunites_appel_a_projets
    UNION ALL SELECT opportunite_id FROM opportunites_concours
    UNION ALL SELECT opportunite_id FROM opportunites_financement
    UNION ALL SELECT opportunite_id FROM opportunites_mentorat
    UNION ALL SELECT opportunite_id FROM opportunites_mobilite
  ) tous GROUP BY opportunite_id HAVING COUNT(*) > 1
) doublons

UNION ALL
-- Informatif : ce script ne complète PAS les offres de recruteur. Un chiffre non
-- nul est normal — il dit combien d'offres réelles attendent la saisie de leur
-- détail par leur auteur.
SELECT 'Offres de recruteur sans sous-type (informatif, non touchées)', COUNT(*)
FROM opportunites o
JOIN opportunite_types t ON t.id = o.type_id
WHERE o.recruteur_uid IS NOT NULL AND o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_emploi          x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_stage           x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_formation       x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_bourse          x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_volontariat     x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_appel_a_projets x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_concours        x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_financement     x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_mentorat        x WHERE x.opportunite_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM opportunites_mobilite        x WHERE x.opportunite_id = o.id);
