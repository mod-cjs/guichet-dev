-- GUIC-149 — Programmes sectoriels et leurs compteurs de rattachement.
--
-- Livré dégradé à l'origine (GUIC-693) : les rattachements vivent dans cinq tables de
-- jonction sans horodatage ni clé primaire simple — le contrat d'export incrémental ne
-- pouvait pas les servir. Réparé au lot 7 du durcissement (GUIC-700,
-- .agent_context/specs/M13-durcissement-etl.md) par un flux FULL_TABLE dédié : ces tables
-- sont petites, un rafraîchissement complet à chaque run est bon marché — la réponse
-- Singer habituelle pour les tables de référence.
--
-- `COALESCE(..., 0)` : un programme sans rattachement à un type donné ne doit PAS
-- disparaître du comptage — `LEFT JOIN` + `0` explicite, jamais un `INNER JOIN` qui le
-- ferait taire silencieusement.

with opportunites as (
    select programme_id, count(*) as n
    from {{ source('guichet_raw', 'opportunites_programmes') }}
    group by programme_id
),

ressources as (
    select programme_id, count(*) as n
    from {{ source('guichet_raw', 'ressources_programmes') }}
    group by programme_id
),

evenements as (
    select programme_id, count(*) as n
    from {{ source('guichet_raw', 'evenements_programmes') }}
    group by programme_id
),

centres as (
    select programme_id, count(*) as n
    from {{ source('guichet_raw', 'centres_programmes') }}
    group by programme_id
),

organisations as (
    select programme_id, count(*) as n
    from {{ source('guichet_raw', 'organisations_programmes') }}
    group by programme_id
)

select
    p.id                              as programme_id,
    p.slug,
    p.nom_programme,
    p.actif,
    coalesce(o.n, 0)                  as nb_opportunites,
    coalesce(r.n, 0)                  as nb_ressources,
    coalesce(e.n, 0)                  as nb_evenements,
    coalesce(c.n, 0)                  as nb_centres,
    coalesce(org.n, 0)                as nb_organisations,
    p.created_at                      as cree_le,
    p.updated_at                      as modifie_le
from {{ source('guichet_raw', 'programmes') }} p
left join opportunites   o   on o.programme_id = p.id
left join ressources     r   on r.programme_id = p.id
left join evenements     e   on e.programme_id = p.id
left join centres        c   on c.programme_id = p.id
left join organisations  org on org.programme_id = p.id
