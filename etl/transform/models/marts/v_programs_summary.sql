-- GUIC-149 — Programmes sectoriels.
--
-- ⚠ LIVRÉ EN ÉTAT DÉGRADÉ, ET C'EST DOCUMENTÉ PLUTÔT QUE MASQUÉ.
--
-- Le ticket demande des compteurs de rattachement (opportunités, ressources, événements,
-- centres, organisations par programme). Ils ne sont PAS calculables ici : les
-- rattachements vivent dans cinq tables de jonction — `opportunites_programmes` et ses
-- soeurs — que le contrat d'export ne peut pas servir. Ces tables ne portent NI
-- horodatage NI clé primaire simple : seulement deux clés étrangères et un drapeau.
-- Aucun watermark n'y est donc disponible, et l'extraction incrémentale est impossible
-- en l'état.
--
-- Deux issues, toutes deux à arbitrer (cf. spec §5) :
--   a) migration ajoutant `created_at`/`updated_at` aux cinq tables — mais c'est modifier
--      le schéma métier pour satisfaire l'outillage ;
--   b) support d'une réplication FULL_TABLE dans le contrat, sans watermark. Ces tables
--      sont petites : un rafraîchissement complet à chaque run est bon marché. C'est la
--      réponse habituelle de Singer pour les tables de référence, et l'option recommandée.
--
-- En attendant, ce modèle sert la dimension programme, utilisable comme axe d'analyse
-- dès que les rattachements seront disponibles.

select
    id                  as programme_id,
    slug,
    nom_programme,
    actif,
    created_at          as cree_le,
    updated_at          as modifie_le
from {{ source('guichet_raw', 'programmes') }}
