# CURRENT_TASK — GUIC-700 · Lot 7 durcissement ETL : suppressions, rétention, v_programs_summary

**Spec** : `.agent_context/specs/M13-durcissement-etl.md` (§4.3 R6, §5 Lot 7 — arbitrages
tranchés le 2026-08-03) · **Branche** : `feature/GUIC-700-etl-suppressions-retention`, **empilée
sur** `feature/GUIC-694-etl-lot1-exploitabilite` (Lot 1, PR #325 — même besoin que GUIC-697) ·
**JIRA** : [GUIC-700](https://consortiumjeunesse.atlassian.net/browse/GUIC-700)

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

## État — Parties A et B livrées, TDD strict
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
- [x] `npm run validate` intégral vert : 559 suites, 4362 tests, tsc et lint propres.
- [ ] Push + PR vers `feature/GUIC-694-etl-lot1-exploitabilite` (stacked, comme GUIC-697)

## Notes
- Cette branche n'a PAS les correctifs de GUIC-695/696/697, stackée sur GUIC-694 seul
  (siblings, convergeront sur `dev` une fois les quatre mergées).
- Le mécanisme de suppression révise le `?fields=id` public de la spec §8.5 initiale : script
  interne Prisma-direct, pas de nouveau paramètre exposé sur l'API publique.

## Reste du plan de durcissement (spec §5)
Lot 1 GUIC-694 (PR #325) · Lot 2 GUIC-695 (PR #326) · Lots 3+4 GUIC-696 (PR #327) · Lots 5+6
GUIC-697 (PR #335) · **Lot 7 GUIC-700 = cette branche, dernier lot du plan**.
