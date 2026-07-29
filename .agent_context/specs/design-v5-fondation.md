# Spec — Fondation design v5 (GUIC-690, épic GUIC-689)

**Livraison** : `design_handoff_guichet_jeunesse/` (juillet 2026) — réponse aux retours design V3 + audit UX P1/P2/P3.
**Périmètre épic** : public, auth, jeune, recruteur, conseiller, centre-staff, checkin. **EXCLU : admin** (session parallèle — `src/app/admin/**`, AdminSidebar, CentreCard/PartenaireCard/ThemeToggle, tokens `--gj-admin-*`/`--gj-edge`/`--gj-lift` intouchés).
**Sources** : `design-guichet-v5/` (référence) + `public/design-v5/` (servi) + `/design-preview` section v5. Arbitre en cas de divergence entre écrans : **Lot 14** (normatif).

## Vague 0 — cette branche

1. **Extraction** handoff (chore) — fait.
2. **Tests RED** (`src/styles/__tests__/tokens-v5.test.ts`) :
   - Ratios WCAG **recalculés** depuis `tokens.css` (jamais les revendications des commentaires) : toutes les paires porteuses de texte ≥ 4.5:1 (action/blanc, teal-deep/blanc, cat-ink/cat-soft ×7, x-ink/x-soft, ink/bg…).
   - Tokens v5 critiques présents : famille `--gj-action`, `--cat-*` (7 catégories × 3), `--gj-cyan*`, `--gj-red-vif`, `--gj-rose`, `--gj-green-vif`, `--gj-ink-teal-2`, `--brand-*`.
   - Valeurs charte exactes : teal `#027f7e`, yellow `#f8a309`, ink-teal `#162c5e`, action `#ae0057`, ink `#202020`.
   - Lexend en tête de `--gj-font-sans` (via variable next/font + fallback), stack système conservée en fallback.
   - **Sentinelle admin** : les 12 tokens `--gj-admin-*` strictement identiques à `origin/dev`.
   - **Sentinelles règles v5** : `#fc3241`/`#fe1c66`/teintes vives jamais déclarées sous du texte blanc dans tokens.css ; plancher `--fs-100` = 11px ; `--tap-min` = 44px.
3. **GREEN** :
   - `src/styles/tokens.css` : merge sélectif (table ci-dessous).
   - `src/styles/design-tokens.ts` : GJ_COLORS resynchronisé.
   - `src/app/layout.tsx` : Lexend via `next/font/google` (self-host au build, zéro requête runtime — jamais le `@import` Google du handoff), variable `--font-lexend` sur `<html>`.
   - `/design-preview` : section « Design v5 (actif) », v3 rétrogradé en référence précédente.
4. `npm run validate` + Playwright rendu (3 viewports) → PR vers dev + miroir mouhammadouod.

## Table de merge tokens.css

| Bloc | Décision |
|---|---|
| `--brand-*` (12 couleurs charte) | AJOUT |
| teal / yellow / red / blue / green / neutres / lines / bg | VALEURS v5 en place (pas de renommage) |
| `--gj-action*`, `--cat-*`, `--gj-cyan*`, `--gj-red-vif`, `--gj-rose`, `--gj-green-vif`, `--gj-ink-teal-2` | AJOUT v5 |
| `--color-cta`, `--color-cta-hover` | AJOUT v5 (sémantiques) |
| Gradient Yaye (valeurs v5), `--prog-*` (+ `--prog-brm`) | VALEURS v5 — exception gradient validée (signature IA / programmes) |
| `--gj-font-sans` | Lexend d'abord (variable next/font), fallback système |
| Focus ring | **STATU QUO** `#00B287` — v5 ambre rejeté (voir registre É-04) |
| `--gj-admin-*` (section 15) | INTOUCHÉ |
| Structurels repo : topbar/bottom-nav/sticky/skel/status-live/bg-teal-soft/container-max-xl/containers/z-index/a11y modes GUIC-581-658/gj-spin/focus-ring-soft | CONSERVÉS |
| `--gj-container-x` | 1280 conservé (registre É-01) |
| Utilitaires v5 `.gj-cta`, `.gj-cat--*`, `.gj-fill--*`, `.gj-urgent`, `.gj-banner` | AJOUT (additifs, consommés par les vagues) |
| `a{}` global v5 | NON PORTÉ (registre É-05) |

## Vagues suivantes (1 PR = 1 user-story)

1. Public + auth (27 tsx) · 2. Jeune (47) + P1 audit UX · 3. Recruteur (28) · 4. Conseiller (33) + P1 cartes personnes · 5. Centre-staff + checkin (14) · 6. Transverse P2 (toasts) ; P3 → backlog épic.
Chaque vague : audit bidirectionnel (code↔lot v5, findings classés ÉCART-CODE / PROBLÈME-V5 / AMBIGUÏTÉ) → TDD → validate + Playwright → PR.

## Règles opposables (encodées en sentinelles au fil des vagues)

Magenta = CTA de conversion uniquement, une seule action pleine par écran · teal = marque/nav · rouge = urgence d'échéance uniquement · catégorie → couleur `--cat-*` déduite du libellé · teintes vives (ambre, orange, cyan, vert, rouge-vif, rose) : texte NOIR ou couple soft/ink, jamais blanc · CTA jaune sur fond sombre · aucun texte < 11px · cibles ≥ 44px · zéro hex en dur · zéro gradient hors exceptions (Yaye wordmark/avatar, `--prog-*`, admin gold).
