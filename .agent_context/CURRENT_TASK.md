# CURRENT_TASK — GUIC-696 · Lots 3+4 durcissement ETL : refuser au lieu de rendre faux

**Spec** : `.agent_context/specs/M13-durcissement-etl.md` (§4.2 S2/S3, §4.3 R1/R2/R4/R5,
§4.1 R3 — rapport GUIC-693, branche `feature/GUIC-694-etl-lot1-exploitabilite`, PR #325) ·
**Branche** : `feature/GUIC-696-etl-refus-nets` (depuis `origin/dev`) · **JIRA** :
[GUIC-696](https://consortiumjeunesse.atlassian.net/browse/GUIC-696)

## Contexte
Sous-tâche de l'épic GUIC-693 (campagne d'épreuve du pipeline ETL Data Hub). Famille de
défauts commune aux deux lots : une entrée invalide produit un résultat FAUX plutôt qu'une
erreur — le pire mode de défaillance pour un ETL, parce qu'il ne s'annonce pas.

## État — Lot 3 (refus nets) et Lot 4 (fiabilité pré-vol) livrés, TDD strict
- [x] **S4** — `convertirCle` (keyset.ts) : `BadCursorError` typée au lieu d'un `Error` nu
      sur clé BigInt forgée, validation stricte `/^\d+$/` avant `BigInt()` (rejette `""` et
      `0x10`, acceptés silencieusement par `BigInt()` seul).
- [x] **R3** — `trancheAge` (transforms.ts) : garde explicite sur `Number.isNaN(date.getTime())`
      — le garde existant `age < 0 || age > 120` ne protégeait pas contre NaN.
- [x] **S2 + S3** — nouveau module `src/lib/datahub/since.ts`, `parseSince()` partagée par
      `[stream]/route.ts` ET `counts/route.ts` : refuse une borne illisible (400, plus de
      500) et une date hors plage MariaDB DATETIME (an 1000-9999) plutôt que de laisser le
      filtre silencieusement ignoré.
- [x] **R1** — `src/lib/datahub/date-columns.ts`, `colonnesDateExportees()` dérivée du
      contrat : le pré-vol contrôle désormais ~35 colonnes date exportées, pas seulement
      les 13 clés de réplication.
- [x] **R2** — `scripts/sql/repair-donnees-poc.sql` aligné sur le pré-vol : `candidatures`
      (`soumise_a`) ajoutée, absente jusqu'ici alors que le pré-vol l'y signalait.
- [x] **R4** — `src/lib/datahub/sql-mode.ts`, `sqlModeSuffisant()` : contrôle `SELECT
      @@sql_mode` ajouté au pré-vol (`NO_ZERO_DATE` + `NO_ZERO_IN_DATE` requis).
- [x] **R5** — `MELTANO_DATABASE_URI` rendue obligatoire au pré-vol.
- [x] `npm run validate` intégral vert : 559 suites, 4313 tests, tsc et lint propres.
- [ ] Push + PR vers `dev`.

## Notes
- Le module `since.ts` est le point de convergence : avant ce lot, `[stream]` et `counts`
  validaient chacun `since` à leur façon, et avaient déjà divergé (`counts` validait
  l'illisibilité, `[stream]` pas du tout). Une seule fonction partagée empêche que ça se
  reproduise.
- Cette branche a été créée depuis `origin/dev` avant le merge de la PR #326 (GUIC-695,
  lot 2) : `tests/unit/datahub-schema-doc.test.ts` référence donc encore l'ancien commentaire
  SHA-256 de `Consultation.sujetHash` dans `schema.prisma` — normal, pas une régression de
  ce ticket. Un rebase sur `dev` sera nécessaire une fois #326 mergée.

## Reste du plan de durcissement (spec §5)
Lot 1 GUIC-694 (PR #325, ouverte) · Lot 2 GUIC-695 (PR #326, ouverte) · **Lots 3+4 GUIC-696 =
cette branche** · Lots 5+6 GUIC-697 (exploitabilité + contrat publié) · Lot 7 arbitrages
hors correctif (suppressions dures R6, `v_programs_summary`, rétention/purge).
