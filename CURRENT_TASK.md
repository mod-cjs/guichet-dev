# CURRENT_TASK — GUIC-492 Responsive mobile recruteur (US-10)

**Branche** : `feature/GUIC-492-responsive-mobile-recruteur` (depuis dev)
**Épic** : GUIC-9 · **Spec** : `.agent_context/specs/layout-navigation.md` (mis à jour)

## Décision (arbitrée)
Bottom-nav recruteur mobile (design v4 + AC), **contre** l'ancienne règle « pas de bottom-nav
recruteur » → `CLAUDE.md` + `layout-navigation.md` mis à jour.

## ⚠️ Répare aussi un dev cassé
Le merge #222 (cloche) × #223 (recherche) a collisionné : layout recruteur utilisait `<Icon>`
sans import (tsc rouge) + `RecruteurSearch` importé non branché. Ce lot corrige.

## Livrables
- [x] `RecruteurBottomNav` (5 items : Accueil/Offres/Candidats/Messages/Plus + sheet secondaire)
- [x] Layout : bottom-nav mobile + cloche mobile + `RecruteurSearch` branché + padding bas + Icon importé
- [x] `RecruteurSidebar` desktop-only (hamburger masqué)
- [x] Docs nav (CLAUDE.md + layout-navigation.md)
- [x] tsc 0 · eslint clean
- [ ] PR → Jira Revue
