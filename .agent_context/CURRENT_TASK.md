# CURRENT_TASK — GUIC-680

**Épic** GUIC-679 · Refonte console admin — langage « registre » + thème clair/sombre
**Story** GUIC-680 · Fondation thème clair/sombre + Tableau de bord au langage registre
**Branche** `feature/GUIC-680-refonte-admin-dashboard-theme` (worktree `.claude/worktrees/admin-refonte`, depuis `origin/dev`)
**Spec** `.agent_context/specs/admin-console-refonte.md` §2.1

## Décisions (validées avec le lead)
- Thèmes **clair + sombre commutables** (défaut = **clair**, = état réel actuel du contenu admin → non-breaking).
- Paradigme **cartes-grille + slide-over** (adopté progressivement, écran par écran).
- Portée thème = **contenu admin uniquement** (`[data-admin-theme="dark"]`), sans impacter jeune/recruteur/conseiller.
- 1 écran = 1 PR vers `dev`. Retrait du rail `accent` de `Card` = **ticket séparé** (blast radius tous espaces).

## Plan d'exécution (incréments)
1. **Fondation thème** *(en cours)* : helper pur testé (`src/lib/admin-theme.ts`) · tokens `--gj-edge`/`--gj-lift` + scope `[data-admin-theme="dark"]` dans `tokens.css`.
2. **Toggle UI** : `ThemeToggle` (primitive) + provider client dans le layout admin, wiring topbar.
3. **Dashboard registre** : cartes plates edge/lift, en-têtes teintés, call-outs, en clair ET sombre.
4. **Vérif** : `npm run validate` + `tsc` + Playwright 2 thèmes 0 erreur.

## Garde-fous
- TDD strict : commit `test(RED)` séparé AVANT `feat(GREEN)`.
- `npm run validate` avant commit ; `tsc` complet avant push.
- **Ne pas committer/push sans go explicite du lead.**
- Commits `feat|test(m8-admin): [GUIC-680] …` + `Closes GUIC-680`, auteur `mod-cjs`, zéro mention IA.
