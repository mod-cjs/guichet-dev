# GUIC-717 — Dictionnaire du Data Hub dans l'administration

> Module : `m13-data` · Branche : `feature/GUIC-717-datahub-dictionnaire` (depuis `dev` @ `19b6f20c`)
> ⚠ Numéro de ticket **provisoire** : le connecteur JIRA n'était pas authentifié au moment
> de l'écriture. À confirmer ou corriger avant fusion.

## Problème

`/admin/data-hub` portait le nom du Data Hub mais rendait le tableau de bord statistique.
Le Data Hub lui-même — le contrat d'export, ses 19 flux, ses 163 colonnes — n'avait
**aucune surface humaine** : il n'existait que sous trois formes machine (OpenAPI, catalogue
Singer, sources dbt) et une forme hors application (`dbt docs`, qui suppose Docker, un accès
à l'entrepôt et une commande).

Trois questions restaient donc sans réponse dans la plateforme :

1. « Que contient ce flux ? » — la doc n'était lisible que dans du JSON.
2. « Quelles données personnelles sortent ? » — le tier CDP n'était nulle part visible.
3. « Ces chiffres datent de quand ? » — l'état des runs vivait dans un fichier de log sur
   l'hôte ETL, visible du seul administrateur système.

## Décisions

| Décision | Pourquoi |
|---|---|
| Les statistiques déménagent sur `/admin/statistiques` | Elles n'ont rien à voir avec le Data Hub ; la route porte enfin son nom. Rien n'est supprimé : l'écran est livré (Lot 11) et couvert par 6 tests. |
| Le dictionnaire dérive de `streams.json`, pas de `schema.prisma` | Recalculer imposerait un `readFileSync` au rendu : Turbopack trace alors tout le projet dans la sortie standalone et alourdit l'image Docker. L'artefact est déjà généré et gardé contre les retouches manuelles. |
| Le tier de gouvernance est filtrable | Répond à la question du DPO. 100 des 163 colonnes sont `pseudonyme`. |
| Le volume est chargé après le rendu | 19 `COUNT(*)` non bornés dans un composant serveur feraient attendre tout l'écran pour une information d'appoint. Route séparée, cache Redis 5 min. |
| Le pipeline POUSSE sa fraîcheur, l'app ne lit jamais l'entrepôt | GUIC-700 sépare délibérément l'app et PostgreSQL (aucun réseau partagé). Publication par `exec_via_app`, comme la réconciliation — pas d'endpoint HTTP, donc pas de secret HMAC de plus à distribuer. |
| La publication de statut n'est jamais bloquante | Confondre « le pipeline a échoué » et « le compte rendu n'est pas parti » ferait sonner l'alerting pour un run parfaitement réussi. |
| Le PDF passe par l'impression navigateur | Aucune bibliothèque PDF dans le projet. Les descriptions sont pleines de « », — et d'accents que les polices standard d'un PDF n'encodent pas : il faudrait embarquer une police Unicode puis réimplémenter pagination, coupe de texte et répétition d'en-têtes. |
| Les trois exports reprennent le filtre actif | Sans quoi la vue « pseudonyme », celle qui sert à un examen CDP, perdrait son intérêt au moment de la transmettre. |

## Périmètre livré

- `/admin/data-hub` — dictionnaire : 19 flux, 163 colonnes, type, nullabilité, format,
  valeurs admises, description, tier CDP, méthode de réplication, clés.
- Filtre gouvernance (`Toutes` / `Publiques` / `Pseudonymes`) et recherche insensible aux
  accents, tous deux portés par l'URL (`?q=`, `?tier=`) — donc partageables.
- Volume par flux (`GET /api/admin/data-hub/volumes`), badge « vide » quand le flux est à 0.
- Bandeau de fraîcheur du dernier run (`role="alert"` seulement en cas d'échec).
- Exports CSV / JSON (`GET /api/admin/data-hub/export`) et PDF (`/admin/data-hub/imprimer`).
- `/admin/statistiques` — l'écran statistique, déplacé, inchangé.
- Table `datahub_runs` + `scripts/datahub/publier-run.ts` + 4 points de publication dans
  `scripts/etl/run-nightly.sh`.

## Hors périmètre

- Le lignage, la couche `marts` et les 35 tests dbt : ils décrivent l'entrepôt, que
  l'application ne lit jamais. Ils restent dans `dbt docs`.
- La suppression de l'écran statistique (déplacé, pas supprimé).

## User story (à coller dans JIRA)

> **En tant qu'** administrateur CJS ou analyste de données,
> **je veux** consulter dans l'administration le contrat d'export du Data Hub — ses flux,
> ses colonnes, leur description, leur tier de gouvernance CDP, leur volume et la fraîcheur
> du dernier run —, le filtrer et l'exporter en CSV, JSON ou PDF,
> **afin de** savoir ce que la plateforme expose, quelles données personnelles en sortent,
> et si les chiffres affichés sont à jour, sans avoir besoin de Docker ni d'un accès à
> l'entrepôt.
