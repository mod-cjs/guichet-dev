# CURRENT_TASK — GUIC-700 · Lot 7 durcissement ETL : suppressions, rétention, v_programs_summary

**Spec** : `.agent_context/specs/M13-durcissement-etl.md` (§4.3 R6, §5 Lot 7 — arbitrages
tranchés le 2026-08-03) · **Branche** : `feature/GUIC-700-etl-suppressions-retention`, **empilée
sur** `feature/GUIC-694-etl-lot1-exploitabilite` · **JIRA** :
[GUIC-700](https://consortiumjeunesse.atlassian.net/browse/GUIC-700)

## Arbitrages tranchés (voir spec pour le détail des 3 questions posées)
1. Absent détecté par le full-refresh hebdomadaire des clés → **suppression physique** dans
   l'entrepôt (guichet_raw + marts, qui se recalculent dessus). Pas de tombstone.
2. **Rétention événementielle uniquement** — pas de purge indépendante par durée côté entrepôt.
3. **v_programs_summary dans la même passe** (support FULL_TABLE pour les 5 tables de jonction
   programmes).

## Vérification empirique faite avant tout code
`Utilisateur` n'est jamais hard-deleted (soft-delete + anonymisation SSO, déjà propagé).
Hard-deletes réels confirmés, sans `softDelete` déclaré : `Emprunt`, `Centre`, `Evenement`,
`Ressource`. `Opportunite.delete()` existe mais aucun appelant identifié.

## État — Parties A et B livrées, TDD strict ; branche resynchronisée avec dev
- [x] Ticket GUIC-700 créé (sous-tâche GUIC-693) + arbitrages obtenus + spec mise à jour
- [x] Partie A — `src/lib/datahub/purge-absents.ts` (module pur, injection comme
      `reconcile.ts`) : détecte les clés présentes dans l'entrepôt mais absentes de la liste
      complète des clés source, supprime physiquement dans `guichet_raw`. Appliqué
      uniformément aux 13 flux — une ligne soft-deleted reste listée, jamais supprimée à tort.
- [x] Partie A — `scripts/datahub/purge-absents.ts` (Prisma direct + `psql` dockerisé, même
      patron que `reconcile.ts`) — à planifier hebdomadairement, crontab séparée de
      `run-nightly.sh`.
- [x] Partie B — support `FULL_TABLE` dans un système PARALLÈLE à l'incrémental
      (`full-table-types.ts`, `full-table-streams.ts`, `full-table-descriptor.ts`,
      `full-table-export.ts`) : clé composite à deux champs, curseur dédié, jamais de `since`.
      5 flux déclarés (jonctions programmes), câblés dans la route `[stream]` (registre
      incrémental essayé d'abord) et dans les trois générateurs (OpenAPI, manifeste tap,
      sources dbt). Documentation `///` ajoutée sur les 5 modèles Prisma (manquante sur 3/5).
- [x] Partie B — `v_programs_summary.sql` corrigé : 5 compteurs de rattachement réels
      (LEFT JOIN + COALESCE — un programme sans rattachement ne disparaît pas du comptage).
- [x] `npm run validate` intégral vert la première fois : 559 suites, 4362 tests.
- [x] **Rebasage post-incident** — PR #325 (GUIC-694) avait mergé sur `dev` avant que PR #335
      (GUIC-697) ne merge dans `feature/GUIC-694-etl-lot1-exploitabilite`, laissant GUIC-697
      orphelin (jamais atteint `dev`). Corrigé par la PR #342 (cette branche →
      `feature/GUIC-694-etl-lot1-exploitabilite` → `dev`). Cette branche (GUIC-700) a ensuite
      mergé la branche GUIC-694 à jour : conflits résolus dans `openapi.ts` (chemins
      FULL_TABLE + `/export/counts` coexistent), `[stream]/route.ts` (routage FULL_TABLE +
      validation `parseSince` combinés), `package.json` (les deux scripts npm coexistent),
      `datahub-openapi.test.ts` (assertions fusionnées). Artefacts régénérés
      (`npm run datahub:generate`) plutôt que résolus à la main (fichiers générés).
- [x] `npm run validate` après régénération des artefacts : 566/567 suites vertes (1 échec
      `api-cron-veille-sources` confirmé flaky, pollution MariaDB partagée — passe seul).
- [x] **Bug réel trouvé en répondant à « est-ce fonctionnel ? »** — `client.py` du tap
      Python faisait `manifest["replication_key"]` sans `.get()` : `KeyError` sur tout flux
      FULL_TABLE, tuant `discover_streams()` pour les 18 flux d'un coup. Invisible à
      tsc/Jest (ils ne testent que la génération du manifeste, jamais sa consommation
      Python). Reproduit et corrigé empiriquement (venv `singer-sdk`, sans Docker) :
      contre-épreuve faite (fix retiré → 4 tests échouent). Tests ajoutés
      (`etl/plugins/extractors/tap-guichet/tests/`), **non intégrés en CI** (aucun
      pipeline Python dans ce dépôt — documenté dans `etl/README.md`).
- [x] Push du fix Python + tests, `npm run validate` re-vérifié : 568/568 vert.

## Laboratoire réel monté et pipeline exécuté de bout en bout (2026-08-04)

Réutilisé l'infrastructure de la campagne GUIC-693 (`etllab_postgres`, MariaDB
`guichet_etl_lab` — 22 510 utilisateurs, 26 161 candidatures), entrepôt réinitialisé
(schémas `guichet_raw`/`marts` recréés), app Guichet lancée sur le port 3100 avec
`DATAHUB_API_KEYS` de test. Données semées pour exercer ce qui n'existait jamais dans le
dump POC : 4 rattachements `opportunites_programmes` réels, 1 `Centre` jetable pour tester
la suppression.

**Deux bugs réels supplémentaires trouvés et corrigés en cours de route** (aucun visible à
tsc/Jest) :
1. Tap Python plantait sur `KeyError: 'replication_key'` pour tout flux FULL_TABLE (voir
   commit dédié plus haut).
2. Image `guichet/meltano:3.7.9` sans driver PostgreSQL (`psycopg2`) — `MELTANO_DATABASE_URI`
   (obligatoire, R5) échouait dès `meltano install`. Ajout de `psycopg2-binary` au Dockerfile.

**Tout vérifié vert, en conditions réelles** :
- Pré-vol : 57/58 (le seul échec est le `sql_mode` du conteneur MariaDB **partagé** entre
  sessions — non modifié pour ne pas perturber les autres sessions)
- `meltano install` : 3/3 plugins
- **Run 1** : 18 flux extraits (13 incrémentaux + 5 FULL_TABLE), comptages exacts
- **Run 2 consécutif** : réussi — c'est EXACTEMENT le défaut B1 original (jamais vérifié
  corrigé en pratique jusqu'ici), et les comptages restent identiques (upsert absorbe le
  recouvrement, aucun doublon)
- `dbt build` : 54/54 tests verts, marts dans le bon schéma (`marts`, pas `marts_marts`)
- `v_programs_summary` : compteurs exacts, vérifiés contre les rattachements semés
  (yaakaar=2, yeah=1, yjc=1, edupop=0)
- `reconcile.ts` (jamais exécuté avant) : 13/13 flux concordants
- `purge-absents.ts` (jamais exécuté avant) : scénario réel — `Centre` supprimé
  physiquement de la source MariaDB (comme le fait le code admin), détecté et supprimé de
  l'entrepôt par le script, **aucune fausse suppression** sur les 9 autres centres ni sur
  aucun autre flux
- `run-nightly.sh` (jamais exécuté avant, seulement simulé par shim docker) : chaîne
  complète extraction→dbt→réconciliation, tout vert, code de sortie 0

## Notes
- Le mécanisme de suppression révise le `?fields=id` public de la spec §8.5 initiale : script
  interne Prisma-direct, pas de nouveau paramètre exposé sur l'API publique.
- Labo laissé **tourner** (décision explicite) pour permettre une inspection ou un rejeu sans
  reconstruire (~20 min de build+install). `etllab_postgres` + MariaDB `guichet_etl_lab`.

## Plan de durcissement ETL (spec §5) — état des 5 PRs
Lot 1 GUIC-694 (#325, mergée `dev`) · Lot 2 GUIC-695 (#326, mergée `dev`) · Lots 3+4 GUIC-696
(#327, mergée `dev`) · Lots 5+6 GUIC-697 (#335, rapatriée vers `dev` par #342) · **Lot 7
GUIC-700 (#341) = cette branche**, dernier lot du plan, resynchronisée avec `dev`.
