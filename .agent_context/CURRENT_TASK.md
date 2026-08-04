# CURRENT_TASK — GUIC-695 · Lot 2 durcissement ETL : brèche CDP du hachage de consultation

**Spec** : `.agent_context/specs/M13-durcissement-etl.md` (§4.2 S1, §5 Lot 2 — rapport GUIC-693,
branche `feature/GUIC-694-etl-lot1-exploitabilite`, PR #325) · **Branche** :
`feature/GUIC-695-cdp-hachage-consultation` (depuis `dev`) · **JIRA** :
[GUIC-695](https://consortiumjeunesse.atlassian.net/browse/GUIC-695)

## Contexte
Campagne d'épreuve GUIC-693 (§4.2 S1) : le hachage de pseudonymisation des consultations était
réversible — `.env.example` livrait `CONSULTATION_HASH_SALT=""`, que `??` laisse passer ; un seul
tour de SHA-256 s'énumère à 3,3 M hachages/s sur un cœur, soit ~21 min pour couvrir les 2³² IPv4.
Aggravant : `cjs_uid` et `sujet_hash` voyageaient sur la même ligne de l'entrepôt Data Hub, un
oracle gratuit pour confirmer un sel candidat.

## État — les deux volets du correctif sont faits
- [x] RED puis GREEN — `hashSujet` devient un HMAC-SHA256 à clé obligatoire
      (`src/lib/analytics/consultation-hash.ts`, module pur). Refus au **démarrage** en
      production si la clé est absente/blanche, via `instrumentation.ts` — sans ce garde,
      `trackConsultation` (fail-soft) aurait avalé l'absence de clé en silence. Rotation
      possible (relecture paresseuse à chaque appel). `.env.example` :
      `CONSULTATION_HASH_KEY` remplace `CONSULTATION_HASH_SALT=""`.
- [x] RED puis GREEN — `sujet_hash` **masqué à l'export** dès que `cjs_uid` est renseigné
      (le connecté se suit par `cjs_uid`, le hash ne sert qu'aux anonymes). Le contrat
      d'export (`stream-types.ts`) passe désormais la ligne source aux `transform`, et gagne
      `outputNullable` pour déclarer qu'une colonne NOT NULL peut sortir masquée à null —
      sans quoi le manifeste Singer généré aurait rejeté chaque ligne d'un connecté (même
      mécanique que le défaut B2 du rapport GUIC-693). Artefacts régénérés (OpenAPI,
      `streams.json`, `sources.yml`), `///` de `Consultation` réalignés.
- [x] `npm run validate` intégral vert : 557 suites, 4299 tests, tsc et lint propres.
- [ ] Push + PR vers `dev` (lot autonome, séparé de PR #325 — un lot = une PR).

## Point d'attention découvert en cours (pas une régression de ce ticket)
La base MariaDB locale partagée (`guichet_jeunesse`, celle que ciblent les tests d'intégration
via `tests/setup.ts`, différente de `guichet_push` que `.env.local` pointe pour le labo ETL)
n'avait pas les 2 migrations du 30/07 (`add_consultations`,
`datahub_watermarks_et_index_extraction`) — déjà mergées sur `dev`, juste jamais rejouées sur
cette base partagée entre sessions parallèles. `prisma migrate deploy` appliqué dessus pour
débloquer `npm run validate` ; aucune donnée détruite, uniquement rattrapage de schéma.

## Déploiement — à poser AVANT le merge en préprod/prod
- `CONSULTATION_HASH_KEY` : `openssl rand -hex 32`, valeur différente par environnement.
  Sans elle, l'app **refuse de démarrer** en production (comportement voulu).
- Les hash changent de valeur (HMAC ≠ SHA-256 salé) : la garde de dédoublonnage Redis (30 min)
  repart de zéro au déploiement — sur-comptage ponctuel d'une fenêtre, sans action requise.
- L'entrepôt ne reçoit plus `sujet_hash` pour les connectés : aucun mart dbt ne le lisait à ce
  jour, donc pas de rupture de contrat aval identifiée.

## Reste du plan de durcissement (spec §5)
Lot 1 GUIC-694 (PR #325, ouverte) · **Lot 2 = cette branche** · Lot 3 refus nets (S2/S3/S4/R3,
500→400) · Lot 4 pré-vol étendu + fiabilité (R1/R2/R4/R5) · Lot 5 exploitabilité (B5, alertes,
rejeu) · Lot 6 contrat/doc (D1-D8) · Lot 7 arbitrages hors correctif (suppressions dures R6…).
