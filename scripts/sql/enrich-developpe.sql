-- Enrichissement du graphe : liens DEVELOPPE (formation → compétence développée).
-- Contexte : le dataset POC n'avait ~22 liens DEVELOPPE → le parcours « orientation active »
-- (écart de compétences → formation qui le comble) était mort. Cette requête rattache chaque
-- FORMATION aux compétences les PLUS DEMANDÉES de son domaine (celles que les offres du même
-- domaine `REQUIERT`) → relie directement un manque à la formation qui y répond.
--
-- Idempotent (INSERT IGNORE sur la PK (opportunite_id, skill_id)). À rejouer après tout
-- rechargement du dump, PUIS reprojeter : `npm run yaye:reproject`.
--
-- Usage : docker exec -i guichet_mariadb mariadb -uguichet -pguichet_dev_password yaye_poc_enriched < scripts/sql/enrich-developpe.sql

INSERT IGNORE INTO opportunites_skills (opportunite_id, skill_id, requise)
SELECT f.opportunite_id, t.skill_id, 0
FROM opportunites_formation f
JOIN opportunites o ON o.id = f.opportunite_id
JOIN (
  SELECT dom AS domaine, skill_id FROM (
    SELECT o2.domaine AS dom, os2.skill_id AS skill_id,
           ROW_NUMBER() OVER (PARTITION BY o2.domaine ORDER BY COUNT(*) DESC) AS rn
    FROM opportunites_skills os2
    JOIN opportunites o2 ON o2.id = os2.opportunite_id
    WHERE os2.requise = 1
    GROUP BY o2.domaine, os2.skill_id
  ) ranked
  WHERE rn <= 6            -- top-6 compétences demandées par domaine
) t ON t.domaine = o.domaine;
