# CURRENT_TASK — GUIC-697 · Lots 5+6 durcissement ETL : exploitabilité et contrat publié

**Spec** : `.agent_context/specs/M13-durcissement-etl.md` (§4.1 B5, §4.4 D1-D8, §5 Lots 5+6 —
rapport GUIC-693) · **Branche** : `feature/GUIC-697-etl-exploitabilite-contrat`, **empilée sur**
`feature/GUIC-694-etl-lot1-exploitabilite` (Lot 1, PR #325 — docker-compose.etl.yml et le script
e2e n'existent pas encore sur `dev`) · **JIRA** : [GUIC-697](https://consortiumjeunesse.atlassian.net/browse/GUIC-697)

## Contexte
Sous-tâche de l'épic GUIC-693. Contrairement à GUIC-696 (Lots 3+4, basé sur `dev`), cette
branche dépend des artefacts du Lot 1 (docker-compose.etl.yml, script e2e, briefing) — d'où
le stacking sur GUIC-694 plutôt que sur `dev` directement. PR ouverte avec `--base
feature/GUIC-694-etl-lot1-exploitabilite` : stacked PR classique, se rebasera sur `dev` une
fois #325 mergée.

## État — Lot 6 (contrat publié) et Lot 5 (exploitabilité) livrés, TDD strict
- [x] **D1** — `meta.replication_key` renvoie le nom EXPORTÉ (`updated_at`), plus le nom
      Prisma (`updatedAt`) : `keyset.ts` résout `column.as` pour la clé de réplication.
- [x] **D2** — OpenAPI généré complété : `429` sur chaque flux, chemin `/export/counts`
      (absent jusqu'ici), paramètre `sinceRequis` (`required: true`) rendant visible D6.
- [x] **D3** — commentaire d'en-tête de `[stream]/route.ts` réaligné : ne décrit plus
      `opportunites`/`programmes` comme actives (retirées au commit `b2128682`).
- [x] **D4** — spec `M13-etl-meltano.md` : `_counts` → `counts` partout.
- [x] **D5** — schéma `Bearer` insensible à la casse (`auth.ts`, RFC 7235 §2.1).
- [x] **D6** — `since` rendu OBLIGATOIRE sur `counts` (400 `BORNE_REQUISE` sans elle) : sans
      borne, 13 `COUNT(*)` séquentiels sous `maxDuration=60` timeout sur gros volume.
- [x] **Lot 5** — `src/lib/datahub/reconcile.ts` (module pur, testé par injection comme
      `keyset.ts`) + `scripts/datahub/reconcile.ts` (Prisma côté source, `psql` via conteneur
      `postgres:16-alpine --rm` côté entrepôt — pas de dépendance `pg` ajoutée) : réconciliation
      des comptages **automatisée**, appelée après chaque run.
- [x] **Lot 5** — `scripts/etl/run-nightly.sh` : chaîne extraction → `dbt build` (couvre D8,
      les 35 tests dbt n'étaient lancés par aucune commande documentée) → réconciliation.
      Tout-ou-rien assumé (§4.1 B5, arbitrage retenu par le ticket) : une étape en échec
      arrête tout, bruyamment (marqueur ✗ + code de sortie non nul, même convention que
      `scripts/cron/run-job.sh`). Rotation du log par seuil de taille, avant le run.
- [x] **Lot 5** — briefing (§6, §10, §13) mis à jour : `WAREHOUSE_DATABASE_URL`, la nouvelle
      chaîne planifiée, procédure de rejeu documentée (`meltano state get/clear`, rejeu
      manuel `--state-id-suffix`) — absente jusqu'ici, un opérateur devait improviser.
- [x] `npm run validate` intégral vert : 559 suites, 4341 tests, tsc et lint propres.
- [ ] Push + PR vers `feature/GUIC-694-etl-lot1-exploitabilite` (stacked, pas vers `dev`).

## Notes
- Deux échecs rencontrés en cours de route (`api-cron-veille-sources`,
  `admin-rattachement-masse`) confirmés flaky — pollution de la base MariaDB locale
  partagée entre sessions parallèles, pas une régression : passent en isolation, et le
  run complet suivant est entièrement vert.
- Cette branche n'a PAS les correctifs de GUIC-695 (lot 2) ni GUIC-696 (lots 3+4), stackée
  sur GUIC-694 seul (siblings, convergeront sur `dev` une fois les trois mergées).

## Reste du plan de durcissement (spec §5)
Lot 1 GUIC-694 (PR #325) · Lot 2 GUIC-695 (PR #326) · Lots 3+4 GUIC-696 (PR #327) ·
**Lots 5+6 GUIC-697 = cette branche** · Lot 7 arbitrages hors correctif (suppressions dures
R6, `v_programs_summary`, rétention/purge) — pas de ticket dédié constaté.
