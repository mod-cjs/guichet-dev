# GUIC-581 — Inclusion & accessibilité — espace bénéficiaire

Parent **GUIC-580** (labels `accessibilite` · `inclusion` · `go-live-v1`) · Priorité **Highest**
Module **m1-socle** (tokens/primitive) + espace jeune · Design **v4 Lot 4**
(`design-guichet-v4/profil-web.jsx` → `InclusionPage`, l.336-442) · Spec validée le 2026-07-23.

## Principes directeurs (validés PO)

1. **Le design reste le même** : zéro attribut `data-*` posé par défaut → rendu actuel
   pixel-identique. Aucun FAB flottant (`accessibility.js` v4 = script de démo, non
   porté — sert de référence fonctionnelle seulement). Aucune carte insérée dans les
   écrans existants.
2. **Choix réfléchi** : l'accessibilité s'active depuis une **page dédiée** que l'on
   visite volontairement — pas de panneau de toggles rapides superposé.
3. **Périmètre** : `/jeune/*` uniquement en phase 1. Les préférences ne fuient pas
   vers les pages publiques / recruteur / admin (cleanup au démontage du provider).
   Extension pages publiques partagées (/opportunites, /agenda…) = phase ultérieure.

## 1. Entrée — sidebar (desktop)

- Le CTA Yaye (`BenefSidebar/index.tsx` l.443-521, slot `marginTop:'auto'` avant le
  footer) est **remplacé** par le bouton « Inclusion & accessibilité ».
  Justification : depuis GUIC-376 ce CTA ouvre le même drawer que `YayeBubble`
  (bulle flottante rendue par le layout) → zéro perte d'accès à Yaye.
- Style **sobre** (pas de gradient) : fond `--gj-teal-soft`, icône `eye` du sprite,
  titre « Inclusion & accessibilité », sous-titre « Adapter l'application ».
  `Link` vers `/jeune/accessibilite`. `aria-label` explicite.
- **Mobile** (pas de sidebar) : entrée dans l'écran Paramètres/Profil (ligne de
  navigation standard) — cohérent avec le design v4 mobile.

## 2. Page `/jeune/accessibilite`

Reprise de l'`InclusionPage` v4, composants `src/components/ui/` exclusivement :

- **Hero** teal (gradient `--gj-teal-deep → --gj-ink-teal`), icône œil jaune,
  titre + sous-titre « Adapte l'application à tes besoins… ».
- **Taille du texte** : 4 boutons S / M / L / XL (« Aa » à taille croissante) →
  `data-text` (défaut `m`).
- **Vision** : Contraste élevé → `data-contrast="high"` · Niveaux de gris →
  `data-gray="on"` (nouveau bloc CSS, `filter: grayscale(1)` sur body) · Réduire
  les animations → `data-motion="reduce"` (nouveau) · Espacement du texte
  (WCAG 1.4.12) → `data-spacing="on"` (nouveau).
- **Lecture & compréhension** : Mode FALC → `data-falc="on"`.
- **Navigation** : Clavier renforcé → `data-kbd="on"` (focus-visible amplifié,
  nouveau bloc CSS — complète GUIC-582).
- **Phase 2** (à cadrer avec l'équipe inclusion avant les tests pilotes GUIC-583,
  pas de stub en phase 1) : lecture vocale (pas de voix wolof TTS sur les
  appareils — stratégie TTS français + contenus audio wolof à définir), curseur
  agrandi, guide de lecture. **Épic séparé** : langues nationales (i18n).

## 3. Mécanique — `A11yProvider`

- Client provider monté dans `src/app/jeune/(app)/layout.tsx` : état = `{ text,
  contrast, gray, motion, spacing, falc, kbd }`, applique/retire les `data-*`
  sur `<html>`. Hook `useA11y()` consommé par la page.
- **Anti-FOUC** : `<script>` inline dans le layout jeune qui lit
  `localStorage["gj-a11y"]` et pose les attributs avant hydratation (try/catch).
- Cleanup à l'unmount (sortie de l'espace jeune → attributs retirés).

## 4. Persistance — par profil (critère d'acceptation GUIC-580)

- **Serveur** : colonne JSON nullable `prefsAccessibilite` sur `ProfilJeune`
  (`prisma migrate dev`, clé `cjs_uid`). Server action `modifierPrefsAccessibilite`
  (session requise, validation Zod du shape, valeurs inconnues strippées).
- **Client** : `localStorage["gj-a11y"]` = cache local pour application immédiate
  (anti-FOUC, hors-ligne). Au mount : serveur (via props du layout) fait foi,
  localStorage resynchronisé. Écriture : optimiste local + action serveur.

## 5. Tokens CSS (`src/styles/tokens.css`)

Les blocs `data-contrast` / `data-text` / `data-falc` existent déjà (l.395-447,
aujourd'hui orphelins — aucun setter dans `src/`). À ajouter : `data-gray="on"`,
`data-motion="reduce"` (même contenu que le bloc `prefers-reduced-motion`),
`data-spacing="on"` (line-height ≥1.7, letter-spacing .04em, word-spacing .1em),
`data-kbd="on"` (outline 4px `--focus-ring-color` + offset sur `:focus-visible`).

## 6. Primitive `Switch` (nouvelle)

`src/components/ui/Switch/` : rôle `switch`, `aria-checked`, piste 46×27,
`--gj-teal` actif / `--gj-line-strong` inactif, clavier (Espace/Entrée),
`disabled`. Story `Switch.stories.tsx` obligatoire.

## Tests (TDD)

- `a11y-provider.test.tsx` : défauts (aucun attribut posé), activation → attribut
  sur `<html>`, persistance localStorage, restauration au mount, priorité serveur
  sur localStorage, cleanup unmount, localStorage corrompu → défauts silencieux.
- `a11y-actions.test.ts` : garde session, shape Zod (valeurs inconnues rejetées),
  update `prefsAccessibilite`.
- `switch.test.tsx` : rôle/aria-checked, toggle clic + clavier, disabled.
- `benef-sidebar.test.tsx` (existant à amender) : le CTA Yaye n'est plus rendu,
  le lien Inclusion pointe `/jeune/accessibilite`.

## DoD

Migration appliquée · `npm run validate` vert · rendu par défaut inchangé (aucun
`data-*` sans opt-in) · Yaye accessible via la bulle · page fonctionnelle desktop +
mobile · réglages persistants par profil · story Switch · PR → dev · Jira En review.
