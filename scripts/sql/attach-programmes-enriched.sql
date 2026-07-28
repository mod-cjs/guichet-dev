-- GUIC-684 — Rattachement aux programmes sur le dataset enrichi `yaye_poc_enriched`.
--
-- POURQUOI : le dump POC contient les 4 programmes (yaakaar, yeah, yjc, edupop) mais
-- AUCUN contenu ne s'y rattache — 4 nœuds :Programme orphelins dans le graphe, et
-- 0 arête [:FINANCE]. Yaye ne peut donc répondre à aucune question par programme.
--
-- MÉTHODE DÉTERMINISTE (CRC32 de l'id), comme `diversify-enriched.sql` : ré-exécutable,
-- même résultat à chaque fois. 100 % synthétique, base de POC isolée — aucune donnée de
-- prod touchée.
--
-- MULTI-PROGRAMME : ~30 % des opportunités reçoivent un SECOND programme. Le modèle est
-- M:N par anticipation (décision PO 2026-07-28) ; si le dataset restait mono-programme,
-- le chemin multi ne serait jamais exercé — donc jamais éprouvé avant la production.
--
-- Idempotent : INSERT ... SELECT filtré par NOT EXISTS.

-- ─────────────────────────────────────────────────────────────
-- 1. Opportunités — programme PRINCIPAL par cohérence métier
--
--    Emploi / Stage            → yjc      (Youth Job Connect)
--    Formation / Bourse        → edupop
--    Appel à projets / Volont. → yaakaar
--    puis override par domaine :
--    Agriculture / Environnement → yeah   (Agricultural Hub)
--    Entrepreneuriat             → yaakaar
-- ─────────────────────────────────────────────────────────────
INSERT INTO opportunites_programmes (opportunite_id, programme_id, principal)
SELECT o.id, p.id, 1
FROM opportunites o
JOIN programmes p ON p.slug = (
  CASE
    WHEN o.domaine IN ('Agriculture', 'Environnement') THEN 'yeah'
    WHEN o.domaine = 'Entrepreneuriat'                 THEN 'yaakaar'
    WHEN o.type IN ('Emploi', 'Stage')                 THEN 'yjc'
    WHEN o.type IN ('Formation', 'Bourse')             THEN 'edupop'
    ELSE 'yaakaar'
  END
)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM opportunites_programmes op WHERE op.opportunite_id = o.id
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Opportunités — SECOND programme pour ~30 % (cofinancement)
--    Choisi différent du principal, déterministe sur CRC32(id + 'prog2').
-- ─────────────────────────────────────────────────────────────
INSERT INTO opportunites_programmes (opportunite_id, programme_id, principal)
SELECT o.id, p2.id, 0
FROM opportunites o
JOIN opportunites_programmes princ
  ON princ.opportunite_id = o.id AND princ.principal = 1
JOIN programmes p2 ON p2.slug = ELT(
  1 + CRC32(CONCAT(o.id, 'prog2')) % 4,
  'yaakaar', 'yeah', 'yjc', 'edupop'
)
WHERE o.deleted_at IS NULL
  AND CRC32(CONCAT(o.id, 'second')) % 10 < 3     -- ~30 % des lignes
  AND p2.id <> princ.programme_id                 -- jamais le principal en doublon
  AND NOT EXISTS (
    SELECT 1 FROM opportunites_programmes op
    WHERE op.opportunite_id = o.id AND op.programme_id = p2.id
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Ressources — par thème éditorial
-- ─────────────────────────────────────────────────────────────
INSERT INTO ressources_programmes (ressource_id, programme_id, principal)
SELECT r.id, p.id, 1
FROM ressources r
JOIN programmes p ON p.slug = (
  CASE
    WHEN LOWER(r.theme) LIKE '%emploi%'          THEN 'yjc'
    WHEN LOWER(r.theme) LIKE '%formation%'       THEN 'edupop'
    WHEN LOWER(r.theme) LIKE '%entrepreneur%'    THEN 'yaakaar'
    WHEN LOWER(r.theme) LIKE '%agri%'            THEN 'yeah'
    ELSE 'edupop'
  END
)
WHERE NOT EXISTS (
  SELECT 1 FROM ressources_programmes rp WHERE rp.ressource_id = r.id
);

-- ─────────────────────────────────────────────────────────────
-- 4. Événements — par type
-- ─────────────────────────────────────────────────────────────
INSERT INTO evenements_programmes (evenement_id, programme_id, principal)
SELECT e.id, p.id, 1
FROM evenements e
JOIN programmes p ON p.slug = (
  CASE
    WHEN e.type IN ('Formation', 'Cours')  THEN 'edupop'
    WHEN e.type = 'Forum'                  THEN 'yjc'
    ELSE 'yaakaar'
  END
)
WHERE NOT EXISTS (
  SELECT 1 FROM evenements_programmes ep WHERE ep.evenement_id = e.id
);

-- ─────────────────────────────────────────────────────────────
-- 5. Contrôle — affiché en fin d'exécution
-- ─────────────────────────────────────────────────────────────
SELECT 'opportunites sans programme' AS controle,
       COUNT(*) AS valeur
FROM opportunites o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM opportunites_programmes op WHERE op.opportunite_id = o.id)
UNION ALL
SELECT 'opportunites multi-programme', COUNT(*) FROM (
  SELECT opportunite_id FROM opportunites_programmes
  GROUP BY opportunite_id HAVING COUNT(*) > 1
) m
UNION ALL
SELECT 'rattachements opportunites', COUNT(*) FROM opportunites_programmes
UNION ALL
SELECT 'rattachements ressources', COUNT(*) FROM ressources_programmes
UNION ALL
SELECT 'rattachements evenements', COUNT(*) FROM evenements_programmes;
