# CURRENT_TASK — Vague 1 design v5 : public + auth (épic GUIC-689)

**Branche** : `feature/GUIC-689-design-v5-vague1-public-auth` — **empilée sur** `feature/GUIC-690-design-v5-fondation-tokens` (PR #314 pas encore mergée ; rebase sur dev après merge).
**Worktree** : `.claude/worktrees/design-v5` (node_modules PROPRE — ne pas re-symlinker).
**Ticket** : à créer dès que le token JIRA est régénéré (mort le 2026-07-30, 401) — commits sur GUIC-689 en attendant.

## Périmètre
`src/app/(public)/**` (accueil, opportunités, agenda, ressources, centres, legal), `src/app/auth/**`, Header marketing, Footer. **EXCLU : admin** (session parallèle — `src/app/admin/**`, AdminSidebar, CentreCard/PartenaireCard/ThemeToggle, tokens `--gj-admin-*`).

## Flux
1. Audit bidirectionnel par 3 agents (accueil / opportunités / auth+reste) — findings ÉCART-CODE · PROBLÈME-V5 · AMBIGUÏTÉ — EN COURS.
2. Arbitrage findings (PROBLÈME-V5 → registre `.agent_context/specs/design-v5-deviations.md`).
3. TDD par user-story (RED → GREEN), 1 PR = 1 user-story, base de PR = branche fondation tant que #314 non mergée.
4. `npm run validate` + sweep Playwright (recette : `docker start guichet_mariadb guichet_redis guichet_minio`, `NEXTAUTH_URL=http://localhost:3211`, `waitUntil:'load'` — jamais networkidle sur /centres).

## Règles v5 (rappel)
Magenta `--gj-action`/`.gj-cta` = conversion uniquement, une seule action pleine par écran · hero : CTA jaune sur fond sombre · badges `--cat-*`/`.gj-cat--*` déduits du libellé · rouge = urgence J-3 seulement · vives/rose jamais sous texte blanc · zéro hex en dur · zéro gradient hors exceptions · ≥11px · ≥44px.
