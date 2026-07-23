# CURRENT_TASK — GUIC-581 · Inclusion & accessibilité (espace bénéficiaire)

**Spec** : `.agent_context/specs/GUIC-581-inclusion-accessibilite.md` (validée PO 2026-07-23) · **Branche** : `feature/GUIC-581-inclusion-accessibilite` (depuis dev @ 89ef9258) · **JIRA** : En cours (sous-tâche de GUIC-580, label `go-live-v1`)

## Décisions PO (2026-07-23)
- Design par défaut strictement inchangé — aucun `data-*` sans opt-in explicite. Pas de FAB (`accessibility.js` v4 = référence fonctionnelle seulement).
- Activation réfléchie via page dédiée `/jeune/accessibilite` (design v4 Lot 4 `InclusionPage`).
- Sidebar desktop : CTA Yaye remplacé par bouton « Inclusion & accessibilité » sobre (Yaye reste via la bulle). Mobile : entrée Paramètres/Profil.
- Persistance **par profil** (`ProfilJeune.prefsAccessibilite` Json) + cache `localStorage["gj-a11y"]` anti-FOUC.

## Étapes (TDD strict)
1. Migration Prisma `add_profil_prefs_accessibilite`
2. Tokens CSS : nouveaux blocs `data-gray` / `data-motion` / `data-spacing` / `data-kbd` (les blocs `data-contrast`/`data-text`/`data-falc` existent déjà, orphelins)
3. RED `switch.test.tsx` → GREEN primitive `Switch` + story
4. RED `a11y-provider.test.tsx` → GREEN `A11yProvider` + script anti-FOUC + `useA11y()`
5. RED `a11y-actions.test.ts` → GREEN action `modifierPrefsAccessibilite`
6. Page `/jeune/accessibilite` (hero, taille texte, Vision, Lecture, Navigation)
7. Sidebar : swap CTA Yaye → bouton Inclusion (amender `benef-sidebar.test.tsx`) + entrée mobile
8. `npm run validate` → PR → dev → Jira « En review »

## Hors périmètre : lecture vocale, curseur agrandi, guide de lecture (phase 2 — à cadrer avant GUIC-583) · langues nationales (épic i18n) · pages publiques partagées.
