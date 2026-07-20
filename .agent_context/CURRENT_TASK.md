# CURRENT_TASK — GUIC-598 · US-3 Extraction déterministe en cascade

**Épic** : GUIC-595 · **Spec** : `.agent_context/specs/M3-curation-opportunites.md` §4ter (validée lead 2026-07-20)
**Branche** : `feature/GUIC-598-extraction-deterministe` (worktree `.claude/worktrees/curation-598`, **stackée sur GUIC-597**)
**JIRA** : GUIC-598 En cours

## Décisions lead (2026-07-20)
- Moteur sélecteurs : **css-select** (+ htmlparser2/domutils déjà présents). Ajouté à package.json (^5.2.2).
- Extraction par lot = **phase 2 du cron** `/api/cron/veille-sources` (lot borné d'items `decouvert`, politesse, verrou Redis partagé).
- Aperçu admin : **endpoint + bouton UI** dans SourceFormModal.

## Périmètre (AUCUNE migration — colonnes ItemCuration déjà posées en US-2)
- `src/lib/curation/extraction/` : jsonld (schema.org JobPosting/Event, sans dép), selecteurs (css-select : `sel` texte / `sel@attr`), meta (og:/meta/title/h1), dates (FR→ISO), cascade+score.
- Extraction remplit `payloadExtrait`+`titre`+`scoreCompletude`, passe `decouvert → a_valider` (jamais de rejet auto).
- Phase 2 orchestrateur : fetch chaque item (réutilise `ssrf-guard`+`clientHttpReel`, politesse), lot borné N/run.
- Route `POST /api/admin/sources-veille/apercu` (RBAC admin + SSRF + fetch + extraction, SANS persistance).
- UI : bouton « Tester l'extraction » dans `SourceFormModal` → affiche champs extraits + score.

## TDD
1. RED : extraction JSON-LD/sélecteurs/meta/regex sur fixtures réelles, score, mapping type/domaine ; intégration (decouvert→a_valider, non ré-extraction) ; aperçu 403 non-admin + SSRF refusé.
2. GREEN.

## Garde-fous
- Baseline tsc 12 (GUIC-622). **node_modules partagé** : `npm install css-select` a élagué `.prisma/client` → régénéré. Signaler à l'autre session.
- US-3 fetch chaque item → garde SSRF obligatoire (réutilisée d'US-2).
- pre-push rouge préexistant (observability+yaye+qr-badge flaky) → bypass déjà tranché pour la famille curation.
