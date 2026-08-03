-- GUIC-149 — Fréquentation des centres CJS.
--
-- Les passages badgés sont la seule mesure de fréquentation RÉELLE : une réservation
-- dit l'intention, le passage dit la venue. L'écart entre les deux — les absences —
-- est un indicateur de pilotage à part entière.

with centres as (
    select * from {{ source('guichet_raw', 'centres') }}
),

passages as (
    select
        centre_id,
        count(*)                            as nb_passages,
        count(distinct cjs_uid)             as nb_jeunes_distincts,
        avg(dwell_minutes)                  as duree_moyenne_minutes,
        max(effectue_a)                     as dernier_passage
    from {{ source('guichet_raw', 'checkins') }}
    group by centre_id
),

reservations as (
    select
        centre_id,
        count(*)                                     as nb_reservations,
        count(*) filter (where statut = 'Acceptee')  as nb_acceptees,
        count(*) filter (where no_show)              as nb_non_honorees
    from {{ source('guichet_raw', 'reservations') }}
    group by centre_id
)

select
    c.id                                            as centre_id,
    c.nom_centre,
    c.region,
    c.ville,
    c.est_actif,
    coalesce(p.nb_passages, 0)                      as nb_passages,
    coalesce(p.nb_jeunes_distincts, 0)              as nb_jeunes_distincts,
    p.duree_moyenne_minutes,
    p.dernier_passage,
    coalesce(r.nb_reservations, 0)                  as nb_reservations,
    coalesce(r.nb_acceptees, 0)                     as nb_reservations_acceptees,
    coalesce(r.nb_non_honorees, 0)                  as nb_non_honorees
from centres c
left join passages p on p.centre_id = c.id
left join reservations r on r.centre_id = c.id
