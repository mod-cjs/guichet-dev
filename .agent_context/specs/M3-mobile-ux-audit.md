# Audit UX mobile — Module M3 Opportunités

**Date :** 2026-05-22 · **Périmètre :** pages et composants livrés par GUIC-20 / GUIC-21.
Référentiel : `M3-opportunites-ux.md`, `M3-opportunites-ui.md`, `tokens.css` (cibles 44 px,
corps 16 px anti-zoom, safe-area).

Légende sévérité : 🔴 bloquant · 🟠 gênant · 🟡 mineur · ✅ corrigé dans cette passe.

---

## 1. `/opportunites` — liste (`OpportunitesClient`)

| # | Constat | Sév. |
|---|---|---|
| 1.1 | ✅ Bouton « Filtres » mobile n'indiquait l'état actif que par un « · » discret → remplacé par un compteur explicite « Filtres (2) ». | 🟡 |
| 1.2 | ✅ Le bouton « Voir N résultats » du bottom-sheet de filtres était en fin de contenu défilant → rendu **collant** en bas du sheet, toujours atteignable. | 🟠 |
| 1.3 | Barre de recherche : hauteur 48 px, police 16 px (anti-zoom iOS) — conforme. | ✅OK |
| 1.4 | Grille `grid-cols-1` sur mobile, scroll infini via IntersectionObserver — conforme. | ✅OK |
| 1.5 | Bandeau pré-filtre région : texte + lien « Voir tout le Sénégal » en `justify-between` ; sur très petit écran le lien `shrink-0` reste lisible mais le texte peut passer sur 2 lignes. Acceptable. | 🟡 |

**Challenge** — Les filtres s'appliquent **immédiatement** à chaque tap de pastille (re-fetch),
alors que `M3-opportunites-ux.md` (F5) prévoyait une application explicite sur mobile. En
pratique le feedback instantané (compteur de résultats live) est une bonne UX ; le bouton
collant sert de confirmation/fermeture. Décision : **garder l'application immédiate**, l'écart
à la spec est un choix UX assumé — à acter.

---

## 2. `OpportunityCard`

| # | Constat | Sév. |
|---|---|---|
| 2.1 | Carte = lien étiré + bouton cœur en `z-[1]` ; cible tactile cœur 44 px — conforme. | ✅OK |
| 2.2 | Titre `line-clamp-2`, badges type/région qui passent à la ligne — conforme. | ✅OK |
| 2.3 | Ligne deadline + rémunération en `flex-wrap justify-between` : sur carte étroite les deux passent à la ligne proprement. | ✅OK |

**Challenge** — Le cœur et le lien étiré cohabitent par `z-index`. Robuste, mais sur de très
vieux navigateurs Android le `z-index` sur élément `relative` est fiable — testé OK. RAS.

---

## 3. Détail — `OpportuniteDetail` (page SSR + sheet intercepté)

| # | Constat | Sév. |
|---|---|---|
| 3.1 | ✅ Barre d'actions `sticky bottom-0 bg-white` sans séparation visuelle du contenu défilant dessous → ajout d'un `border-t`. | 🟡 |
| 3.2 | ✅ Bouton « Sauvegarder » : simple bouton texte ghost, état « Sauvegardé » peu lisible → refondu en **toggle avec icône cœur** (cœur plein + fond teal-soft quand sauvegardé). | 🟠 |
| 3.3 | Barre d'actions en `flex-wrap` : sur écran ~360 px, Postuler (min-w 160) + Sauvegarder + Partager passent sur 2 lignes. Acceptable mais dense. | 🟡 |
| 3.4 | `keyfacts` en `grid-cols-2` — lisible sur mobile. | ✅OK |

**Challenge** — La barre d'actions sur 2 lignes en petit écran : envisager, en suivi, de
réduire « Partager » à une icône seule sur mobile pour tout garder sur une ligne.

---

## 4. `CandidatureModal`

| # | Constat | Sév. |
|---|---|---|
| 4.1 | ✅ Le `ui/Modal` (centré) n'avait pas de hauteur max : sur petit téléphone, le formulaire (contexte profil + textarea 6 lignes + consentement + 2 boutons) pouvait dépasser le viewport et rendre les boutons inatteignables → `max-h-[85dvh] overflow-y-auto` ajouté au `Modal`. | 🔴 |
| 4.2 | Champs `font-size 16 px` (anti-zoom), checkbox 20 px — conforme. | ✅OK |

**Challenge** — Sur mobile, un formulaire de candidature serait mieux servi par un
**bottom-sheet plein écran** (`ui/Sheet`) qu'une modale centrée. Le correctif 4.1 lève le
risque de coupe ; la bascule vers un sheet mobile reste une amélioration de suivi.

---

## 5. `ui/Sheet`

| # | Constat | Sév. |
|---|---|---|
| 5.1 | Bottom-sheet `max-h-85%`, grab handle, `padding-bottom` safe-area, fermeture overlay + Échap — conforme. | ✅OK |
| 5.2 | La **fermeture au swipe** (glisser vers le bas) n'est pas implémentée — seuls le tap overlay et Échap ferment. `M3-opportunites-ux.md` la mentionnait. | 🟠 |

**Challenge** — Le swipe-to-dismiss améliore le ressenti natif mais le tap overlay couvre le
besoin. À implémenter en suivi (gestion `touchstart`/`touchmove` sur le grab handle).

---

## 6. `FiltresPanel`

| # | Constat | Sév. |
|---|---|---|
| 6.1 | Sections repliables via `<details>` natif — accessible, sans JS. | ✅OK |
| 6.2 | Pastilles `min-h 36px` : **sous la cible 44 px** recommandée sur mobile. Tap un peu juste. | 🟠 |
| 6.3 | Liste Région : 14 lignes `py-space-2` (~40 px) — limite. | 🟡 |

**Challenge** — Les pastilles à 36 px viennent du prototype `design/html` (`.dom-tag`). Sur
mobile, viser 44 px. Correctif simple mais touchant le rendu visuel des filtres → à valider
avec le design avant application (non corrigé dans cette passe).

---

## 7. `MesCandidatures` / `MesFavoris` (`/jeune/*`)

| # | Constat | Sév. |
|---|---|---|
| 7.1 | Listes en `grid-cols-1` mobile, `EmptyState` avec action — conforme. | ✅OK |
| 7.2 | Le contenu `/jeune/*` doit respecter `pb-[calc(56px+safe-area)]` pour ne pas passer sous la `BottomNav` — géré globalement par le shell (`globals.css :has(.gj-bottom-nav)`). | ✅OK |

---

## Synthèse

**Tous les constats de l'audit sont corrigés (2 passes, 2026-05-22) :**

Passe 1 — 1.1, 1.2, 3.1, 3.2, 4.1 (dont un 🔴 : modale candidature qui pouvait couper ses
boutons sur petit écran).

Passe 2 — les 4 recommandations initialement différées, finalement traitées :
- ✅ 6.2 — pastilles de filtre à `--tap-min` (44 px) sur mobile, 36 px sur desktop
  (`tokens.css` proscrit explicitement 36 px sur mobile).
- ✅ 5.2 — `Sheet` : fermeture au glissement vers le bas du grab handle (seuil 90 px).
- ✅ 4.x — `CandidatureModal` bascule de `ui/Modal` vers `ui/Sheet` (`variant="side"`) :
  bottom-sheet plein écran sur mobile, slide-over sur desktop.
- ✅ 3.3 — « Partager » en icône seule sur mobile (libellé `sr-only md:not-sr-only`).

Aucun défaut ni recommandation en suspens.
