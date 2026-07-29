# CURRENT_TASK — GUIC-690 Fondation design v5

**Branche** : `feature/GUIC-690-design-v5-fondation-tokens` (worktree `.claude/worktrees/design-v5`, depuis origin/dev a12890d8)
**Épic** : GUIC-689 — migration design v5 hors admin.
**Spec** : `.agent_context/specs/design-v5-fondation.md` · **Registre d'écarts** : `.agent_context/specs/design-v5-deviations.md`

Étapes : extraction (chore) → tests RED tokens → GREEN (tokens.css + design-tokens.ts + Lexend next/font + design-preview) → validate + Playwright → PR dev + miroir.

⚠ Coordination : ne pas toucher `src/app/admin/**`, AdminSidebar, CentreCard/PartenaireCard/ThemeToggle, tokens `--gj-admin-*`/`--gj-edge`/`--gj-lift`. Seul fichier partagé : `tokens.css` (palette globale seulement).
⚠ É-04 en attente : focus ring ambre v5 rejeté (WCAG 1.4.11) — statu quo #00B287, arbitrage lead demandé dans la PR.
