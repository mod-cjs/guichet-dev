# Tâche active — GUIC-15

## Tâche : [GUIC-15] Setup Next.js SSR + design system — navigation responsive

Branche   : feature/GUIC-15-setup-nextjs-design-system
Spec      : .agent_context/specs/layout-navigation.md
JIRA      : https://consortiumjeunesse.atlassian.net/browse/GUIC-15

### Architecture navigation validée (2026-05-05)
Voir `.agent_context/specs/layout-navigation.md` — OBLIGATOIRE de lire avant tout travail sur les layouts.

### Fichiers à modifier / créer
- [ ] `src/components/layout/Header/index.tsx` — responsive, nav hidden mobile, Se connecter visible
- [ ] `src/components/layout/AppTopbar/index.tsx` — NOUVEAU, top bar app jeune mobile
- [ ] `src/components/layout/BottomNav/index.tsx` — NOUVEAU, bottom nav 5 items SVG, route active
- [ ] `src/app/jeune/layout.tsx` — AppTopbar + BottomNav + padding-bottom
- [ ] `src/app/admin/layout.tsx` — mini topbar mobile + drawer hamburger
- [ ] `src/app/recruteur/layout.tsx` — mini topbar mobile + drawer hamburger

### Déjà fait
- [x] Design tokens v2, globals.css, tailwind, postcss.config.mjs
- [x] Composants UI (Button, Toast, Modal, Alert, Avatar, Skeleton, DataTable)
- [x] Footer, pages stubs (15), next.config.ts, prisma, libs
- [x] Build ✓ 39 pages statiques

### Prochaine étape
Implémenter les 6 fichiers ci-dessus → commit → PR GUIC-15 → rebase GUIC-16.
