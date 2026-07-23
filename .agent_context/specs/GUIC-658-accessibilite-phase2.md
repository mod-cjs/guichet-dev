# GUIC-658 — Accessibilité phase 2 : lecture vocale, curseur agrandi, guide de lecture

Parent **GUIC-580** · Suite de **GUIC-581** (PR #295 en review) · Référence fonctionnelle :
`design-guichet-v4/accessibility.js` (rows voice/cursor/guide) · Spec validée PO 2026-07-23.

## Décisions PO

1. **Lecture vocale : TTS français seul** (`speechSynthesis`, `fr-FR`, rate ≈ 0.98) —
   pas de détection wolof (voix inexistantes sur les appareils ; wolof = contenus
   audio enregistrés, badge Lot 6). Confirmation vocale à l'activation.
2. **Curseur agrandi** et **guide de lecture** : réglages **desktop uniquement**
   (lignes masquées `< lg` — inutiles au tactile).
3. Invariants phase 1 conservés : opt-in strict, design par défaut inchangé,
   scope `/jeune/*`, persistance profil + cache localStorage.

## 1. Extension `A11yPrefs` (A11yProvider)

- 3 clés booléennes : `cursor`, `guide`, `voice` (défaut `false`).
- `ATTR_MAP` : `cursor → data-cursor="on"` · `guide → data-guide="on"` ·
  `voice → data-voice="on"`. `sanitizeA11yPrefs` les couvre (rétro-compat :
  Json phase 1 sans ces clés → false).
- Script anti-FOUC du layout : map complétée (seul `data-cursor` a un effet
  pré-hydratation, les 2 autres passent par le composant).

## 2. Tokens CSS (`src/styles/tokens.css`)

- `data-cursor="on"` : curseur SVG haute visibilité (data URI, flèche blanche
  bord noir 40px, hotspot 4 4 — reprise v4) sur `html` et descendants
  (`!important`, comme le bloc motion).
- `data-guide="on"` : styles de `#gj-a11y-guide` (barre fixe h-38px, fond
  jaune translucide, liserés teal, `pointer-events:none`, z-index maximal) —
  masquée sans l'attribut.
- `data-voice="on"` : affordance hover `outline: 2px dashed` teal sur
  `p, li, h1-h3, a, button` (équivalent v4 `data-gj-readable`).

## 3. Composant `A11yGadgets` (nouveau, `src/components/a11y/A11yGadgets.tsx`)

Client, monté dans le layout jeune sous le provider. Ne rend rien si guide
et voice sont off.

- **Guide** : rend `<div id="gj-a11y-guide" aria-hidden>` ; écouteur
  `mousemove` (ajouté seulement si `guide`) qui suit `clientY` (barre centrée
  sur le curseur). Cleanup au démontage.
- **Lecture vocale** : écouteur `click` en capture sur `document` (seulement si
  `voice`) : remonte au plus proche `button, a, label, h1-h4, p, li` ; lit
  `innerText` (trim, espaces normalisés, tronqué à 320 chars) via
  `speechSynthesis` — `cancel()` avant chaque `speak()`, `lang fr-FR`.
  Ne bloque pas l'événement (les liens/boutons continuent de fonctionner).
  Garde `'speechSynthesis' in window` (no-op sinon). À l'activation depuis la
  page : lit « Lecture vocale activée. Touche un texte pour l'écouter. »

## 4. Action serveur

Schéma Zod étendu à 10 clés strictes (`cursor`, `guide`, `voice` requis).
La page envoie toujours le shape complet — pas de rétro-compat côté action.

## 5. Page `/jeune/accessibilite`

- **Lecture & compréhension** : + « Lecture vocale » (icône `play`,
  sous-titre « Touche un texte pour l'écouter — voix française »).
- **Navigation** : + « Grand curseur » (icône `desktop`) et « Guide de
  lecture » (icône `menu`) — wrappers `hidden lg:flex` (desktop only).

## Tests (TDD)

- `a11y-provider` (extension) : cursor/guide/voice → attributs posés/retirés,
  sanitize rétro-compat (Json 7 clés → 3 nouvelles à false), cleanup complet.
- `a11y-gadgets` (nouveau) : rien rendu tout off · guide suit mousemove (style
  top) · voice : clic sur un `<p>` → `speechSynthesis.speak` appelé (mock)
  avec lang fr-FR et cancel préalable · clic quand voice off → aucun speak ·
  environnement sans speechSynthesis → pas de throw.
- `a11y-actions` (extension) : shape 10 clés accepté · shape 7 clés (phase 1)
  → VALIDATION · clé voice non-booléenne → VALIDATION.
- `a11y-page` (extension) : 3 nouveaux switches présents, rows cursor/guide
  avec `lg:` (masquées mobile).

## Git

Branche `feature/GUIC-658-accessibilite-phase2` **empilée sur**
`feature/GUIC-581-inclusion-accessibilite` (le code phase 1 n'est pas sur dev).
PR ouverte vers dev **après merge de #295** (sinon base = branche phase 1).

## DoD

`npm run validate` vert · rendu par défaut inchangé · réglages persistants
par profil · lignes cursor/guide invisibles mobile · PR → dev · Jira En review.
