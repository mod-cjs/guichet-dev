-- M13 / Data Hub — réparation des défauts d'intégrité du dump POC.
--
-- POURQUOI CE FICHIER EXISTE
-- Le dump enrichi est un instantané chargé avec `FOREIGN_KEY_CHECKS=0` et sous un
-- `sql_mode` qui acceptait les dates zéro. Il en résulte deux défauts que l'application
-- ne peut pas contourner, découverts en faisant tourner l'API d'export contre la base :
--
--   1. `0000-00-00` dans des colonnes DATETIME. Le driver Prisma ne sait pas les relire :
--      « Invalid time value » est levé AVANT tout code applicatif. `count()` passe, mais
--      tout `findMany` sur la table échoue.
--
--   2. Rattachements orphelins dans `opportunites_tags`. Les contraintes FK existent
--      pourtant — elles n'ont simplement pas joué au chargement. Le DTO déréférençait
--      `tag.slug` et 1 315 pages de détail d'opportunité PUBLIÉES rendaient 500. Le code
--      est désormais gardé, mais un lien mort reste une donnée fausse.
--
-- Rejouable sans effet de bord : chaque instruction ne touche que les lignes fautives.
-- Appelé automatiquement par `scripts/load-enriched-db.sh` — sans quoi le prochain
-- chargement du dump ramène les deux défauts.
--
-- ⚠ La prévention est ailleurs : `docker-compose.yml` impose désormais
-- NO_ZERO_DATE/NO_ZERO_IN_DATE au serveur. Ce script répare l'existant, il n'empêche rien.
--
-- GUIC-696 R2 — `candidatures` manquait ici alors que le pré-vol (étendu au lot 4, R1, à
-- toutes les colonnes date exportées et non aux seules clés de réplication) la signale :
-- 26 157 lignes à `soumise_a = '0000-00-00'` sur le dump POC. Les deux outils, écrits dans
-- la même série de commits, se contredisaient — le pré-vol restait rouge après exécution
-- de ce script.
--
-- GUIC-700 — pré-vol réel sur la base préprod (`rich-anon-seed.sh`, qui n'appelait PAS ce
-- script — seul `load-enriched-db.sh` l'appelait) : `candidatures.updated_at` est LUI AUSSI
-- à zéro sur ~26 154 lignes, l'hypothèse ci-dessus ("updated_at toujours valide, seule autre
-- date de la ligne") était fausse dès que les deux colonnes sont corrompues ensemble.
-- `Candidature` n'a pas de `created_at` (voir prisma/schema.prisma) : aucune autre colonne de
-- la ligne ne porte d'information de date récupérable. Repli sur `NOW()` — horodatage FIXE au
-- moment de l'exécution (une seule évaluation par UPDATE), pas une date courante mouvante : le
-- bookmark ETL verra ces lignes une fois au prochain run puis plus jamais, comme une ligne
-- normale, sans boucle de réextraction.

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Dates zéro — la date de création est la meilleure approximation d'une dernière
--    modification pour une ligne jamais modifiée depuis.
UPDATE profils_jeunes
   SET updated_at = created_at
 WHERE CAST(updated_at AS CHAR) LIKE '0000%';

UPDATE inscriptions_evenements
   SET updated_at = inscrit_a
 WHERE CAST(updated_at AS CHAR) LIKE '0000%';

-- `soumise_a` n'a pas de colonne `created_at` sœur (le modèle n'en porte pas) : `updated_at`
-- est la seule autre date de la ligne, NOT NULL, posée par `@updatedAt` au moins à l'insertion.
-- Répare `updated_at` D'ABORD — sinon une ligne où les deux colonnes sont à zéro recopierait
-- un autre zéro dans `soumise_a` juste en dessous.
UPDATE candidatures
   SET updated_at = NOW()
 WHERE CAST(updated_at AS CHAR) LIKE '0000%';

UPDATE candidatures
   SET soumise_a = updated_at
 WHERE CAST(soumise_a AS CHAR) LIKE '0000%';

-- 2. Liens de jonction pointant vers une entité disparue. Supprimés plutôt que
--    recréés : le tag n'existe plus, le rattachement n'a plus de sens.
DELETE ot FROM opportunites_tags ot
  LEFT JOIN tags t ON t.id = ot.tag_id
 WHERE t.id IS NULL;

DELETE os FROM opportunites_skills os
  LEFT JOIN skills s ON s.id = os.skill_id
 WHERE s.id IS NULL;

DELETE op FROM opportunites_programmes op
  LEFT JOIN programmes p ON p.id = op.programme_id
 WHERE p.id IS NULL;
