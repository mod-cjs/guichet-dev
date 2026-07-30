-- GUIC-149 — Offres et pression de candidature, par dimension.
--
-- Le taux de candidature par offre est l'indicateur qui dit si le catalogue rencontre
-- sa demande. Une offre publiée sans candidature ne se distingue pas, dans un simple
-- comptage d'offres, d'une offre qui en reçoit cinquante.

with opportunites as (
    select * from {{ source('guichet_raw', 'opportunites') }}
    where deleted_at is null
),

candidatures as (
    select
        opportunite_id,
        count(*)                                      as nb_candidatures,
        count(*) filter (where statut = 'Retenue')    as nb_retenues
    from {{ source('guichet_raw', 'candidatures') }}
    group by opportunite_id
)

select
    o.domaine,
    o.region,
    o.statut,
    o.type_legacy                                          as type_offre,
    count(*)                                               as nb_offres,
    count(*) filter (where o.deadline >= current_date)     as nb_ouvertes,
    sum(o.vues)                                            as vues_cumulees,
    coalesce(sum(c.nb_candidatures), 0)                    as nb_candidatures,
    coalesce(sum(c.nb_retenues), 0)                        as nb_retenues,
    -- Offres n'ayant reçu aucune candidature : le signal d'un catalogue mal ciblé.
    count(*) filter (where c.opportunite_id is null)       as nb_sans_candidature
from opportunites o
left join candidatures c on c.opportunite_id = o.id
group by o.domaine, o.region, o.statut, o.type_legacy
