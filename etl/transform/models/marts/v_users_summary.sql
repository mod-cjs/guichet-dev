-- GUIC-149 — Démographie des bénéficiaires, agrégée par dimension.
--
-- Les comptes supprimés logiquement sont COMPTÉS À PART et non écartés : les exclure
-- ferait apparaître une chute d'effectif là où il y a eu exercice du droit à l'oubli.
-- La distinction est ce qui rend la série temporelle interprétable.

with utilisateurs as (
    select * from {{ source('guichet_raw', 'utilisateurs') }}
)

select
    region,
    genre,
    tranche_age,
    statut,
    count(*)                                                as nb_comptes,
    count(*) filter (where deleted_at is null)              as nb_actifs,
    count(*) filter (where deleted_at is not null)          as nb_supprimes,
    count(*) filter (where onboarding_complete)             as nb_onboardes,
    min(date_inscription)                                   as premiere_inscription,
    max(date_inscription)                                   as derniere_inscription
from utilisateurs
group by region, genre, tranche_age, statut
