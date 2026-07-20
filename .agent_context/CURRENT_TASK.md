# CURRENT_TASK — GUIC-597 · US-2 Robot de découverte planifié

**Épic** : GUIC-595 · **Spec** : `.agent_context/specs/M3-curation-opportunites.md` §4bis (validée lead 2026-07-20)
**Branche** : `feature/GUIC-597-robot-decouverte` (worktree `.claude/worktrees/curation-597`, **stackée sur GUIC-596**)
**JIRA** : GUIC-597 En cours

## État — GREEN committé, passe adverse en cours
- RED `d290d0c` → GREEN `e958b9d`. 36/36 tests verts (2 runs), intégration MariaDB réelle 3307 (transport HTTP injecté).
- Suite complète : 4 suites préexistantes rouges (observability + yaye, = origin/dev) + qr-badge flaky préexistant. tsc baseline 12, lint clean, build exit 0.
- Sentinelle GUIC-570 (parité vercel.json ↔ scripts/cron/jobs.json) : les DEUX ordonnanceurs mis à jour.
- **Deux reviewers adverses lancés** (sécurité SSRF/DNS-rebinding/TOCTOU + métier/contrat) — fixes à venir avant push/PR.

## Décisions lead (2026-07-20)
- ItemCuration dès US-2 (statut `decouvert`, empreinte URL @unique) + ExecutionVeille.
- Découverte = listing seul. UA `CJSGuichetBot/1.0`, politesse 2 s + Crawl-delay.

## Points à surveiller (auto-challenge)
- TOCTOU : urlFetchable résout le DNS, puis fetch re-résout → fenêtre de rebinding. Node fetch ne permet pas le pinning IP simplement. À arbitrer avec la review.
- exec.nbNouveautes = nouveaux.length vs createMany count sous concurrence (léger).
- Crawl-delay de la source N appliqué avant source N+1 (hôte différent) = conservateur, pas strict.
- US-3 devra appliquer la MÊME garde SSRF au fetch de chaque item (US-2 ne fetch pas les items).

## Garde-fous
- Baseline tsc 12 (GUIC-622). vercel.json + scripts/cron/jobs.json autorisés (hors zone M14 deploy/backup/observability/storage/instrumentation).
- Push : pre-push rouge pour cause préexistante → arbitrage lead (déjà autorisé pour la famille curation).
