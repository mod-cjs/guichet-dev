# CURRENT_TASK — Métriques de performance conversationnelle Yaye (GUIC-435)

**Branche** : `feature/GUIC-435-metriques-performance-yaye` (stack sur `feature/GUIC-263-yaye-formateur-multicanal` — les lots Yaye ne sont pas encore mergés sur `dev`)
**Story** : GUIC-435 « Métriques de performance conversationnelle de Yaye (Yaye Quality Score) »
**Spec** : `.agent_context/specs/yaye/14-metriques-performance-conversationnelle.md` · tickets `14b`

## Objectif
Noter la qualité conversationnelle de Yaye à partir des bases enrichies existantes, **sans modifier les services existants** (on ajoute). 5 couches → score composite **YQS 0-100**, garde-fous non compensables (fidélité anti-hallucination + conformité CDP).

## Découpage (jalons A→F) · ordre : A → (B ∥ C ∥ D) → F → E
- **A — Socle** : reconstructeur de transcript + rollups `agent_logs` + dashboard couches 1-2. *(en cours)*
- **B — Feedback** : `YayeFeedback` + UI pouce web/WA + CSAT.
- **C — Juge LLM** : `YayeEvalScore` + cron `yaye-eval` (Groq llama-3.3-70b) + rubric.
- **D — Résultat** : jointures métier (conversion reco→candidature, complétion action).
- **F — YQS composite** : `YayeSessionSummary` + agrégation + garde-fous + alertes.
- **E — Golden set** : harnais reproductible + précision d'intention + détection régression.

## Invariants
- On **ajoute**, on ne modifie pas (`AgentLog`, `tools.ts`, endpoints métier intacts).
- Fail-soft : une erreur de mesure n'interrompt jamais une conversation.
- Garde-fous fidélité/CDP non compensables (plafonnent le YQS + drapeau rouge).
- CDP : pseudonymisation avant juge, purge au droit à l'oubli (cascade `cjs_uid`).
- Dashboard sous `/admin/analytics/yaye` (convention existante `src/app/admin/analytics/`).
- Cron `yaye-eval` : auth `Bearer ${CRON_SECRET}`, planifié à 03:00+ (après `yaye-graph-sync` 02:30).

## Garde-fou Git (incident résolu)
- Brancher depuis le lot précédent, **jamais depuis `dev`** (sinon les ~79 fichiers Yaye disparaissent).
- État disque `~dev` rencontré en début de tâche → sauvegardé dans `stash@{0}` (WIP-disque-pre-GUIC-435).

## Fait (jalons A→F livrés, tsc=0, eslint 0 erreur, 184 tests Yaye verts)
- Spec `14` + tickets `14b` rédigés, vérifiés, corrigés.
- **A** : 3 modèles Prisma + migration SQL `20260622120000_add_yaye_metrics_guic435` · `metrics/transcript.ts` · `metrics/rollups.ts` · dashboard `/admin/analytics/yaye`.
- **B** : `YayeFeedback` · `metrics/feedback.ts` · `POST /api/ia/feedback` · `components/yaye/YayeFeedback.tsx` (pouce web) · CSAT au dashboard. *(émission boutons feedback WhatsApp : différée — ne pas déstabiliser le formateur WA)*.
- **C** : `metrics/pseudonymize.ts` · `metrics/judge.ts` (Groq llama-3.3-70b, rubric adversariale, JSON) · `metrics/eval-run.ts` (stratifié) · cron `GET /api/cron/yaye-eval` (Bearer CRON_SECRET, `vercel.json` 03:15).
- **D** : `metrics/outcomes.ts` (conversion reco→candidature, actions via Yaye) — lecture seule.
- **F** : `metrics/yqs.ts` (composite 0-100, garde-fous non compensables fidélité/CDP) + hero dashboard.
- **E** : `metrics/golden/` (scénarios + harnais précision d'intention) · `metrics/regression.ts`.
- Tests : 8 nouvelles suites `tests/unit/yaye-metrics-*.test.ts`.

## Reste
- Migration à appliquer en base (`prisma migrate deploy`).
- Décision commit (branche porte 31 rouges PRÉEXISTANTS hors périmètre).
- Sous-tâche : émission des boutons feedback côté WhatsApp.
