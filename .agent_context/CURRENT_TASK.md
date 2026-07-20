# CURRENT_TASK — GUIC-597 · US-2 Robot de découverte planifié

**Épic** : GUIC-595 · **Spec** : `.agent_context/specs/M3-curation-opportunites.md` §4bis (validée lead 2026-07-20)
**Branche** : `feature/GUIC-597-robot-decouverte` (worktree `.claude/worktrees/curation-597`, **stackée sur GUIC-596**)
**JIRA** : GUIC-597 En cours

## État — LIVRÉE + DURCIE, PR #272 (En review)
- RED `d290d0c` → GREEN `e958b9d` (base) → durcissement post double revue adverse. 54/54 verts (2 runs), intégration MariaDB réelle.
- PR #272 basée sur la branche GUIC-596 (stackée) → retarget vers dev après merge US-1 (#269).
- Findings adverses corrigés : ReDoS, SSRF/DNS-rebinding (épinglage IP undici), OOM streaming, IPv6 fail-closed, Crawl-delay plafonné, verrou Redis, CRON_SECRET timing-safe, `auto`↔`<link>` HTML (CRITIQUE), politesse intra-hôte, chute-à-zéro (nbLiensDecouverts+partiel), redirections, retry, URLs >500.
- Sentinelle GUIC-570 : vercel.json + scripts/cron/jobs.json (les deux).
- **US-3 devra** appliquer `ssrf-guard.ipPubliqueValidee` au fetch de CHAQUE item (US-2 ne fetch que les listings).

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
