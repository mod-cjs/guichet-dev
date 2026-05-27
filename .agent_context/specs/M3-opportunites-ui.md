# Étude UI — Module M3 Opportunités (GUIC-20 + GUIC-21)

**Périmètre :** spécification visuelle des écrans M3, à partir de la source de vérité
`design/html/` (tokens v2, `UI Kit.html`, `Mobile Patterns.html`). À lire après
`M3-opportunites-ux.md` et avant l'écriture du code.

**Statut :** validée le 2026-05-22 — tous les points UI tranchés (§6).

---

## 1. Source de vérité et fondations

- **Tokens** : `design/html/tokens.css` (v2). Couleurs `gj-*`, échelle typo `--fs-100..900`
  (corps = `--fs-400` 16px, anti-zoom iOS), espacement `--space-1..8`, radii `--gj-r-*`,
  hit-targets (`--tap-min` 44px, `--tap-comfortable` 48px), `--focus-ring`, safe-area.
- **Patterns réutilisables repérés** dans `design/html/` :
  - `.opp` / `.opp-m` — carte opportunité (desktop / mobile), accent bord gauche 4px.
  - `.sheet` — bottom-sheet : `grab` handle, `h3`, `meta`, `keyfacts` (grille 2 col `kf`),
    `actions` (boutons `primary`/`ghost`, `min-height: --tap-comfortable`).
  - `.skel-card` / `.skel-line` — squelette de chargement.
  - `.empty` — état vide (`em` illustration, `h3`, message).
  - `.toast` — toast sombre ancré bas.
  - `.fm-form` / `.fm-field` — formulaire mobile.
- **Règles CLAUDE.md** : composants `src/components/ui/` exclusivement, tokens `gj-*`
  (jamais de hex), SVG inline `currentColor` (jamais d'emoji comme icône fonctionnelle),
  `gj-indigo` interdit (réservé Aïssatou).

---

## 2. Inventaire des composants

### Réutilisés tels quels (`src/components/ui/`)
| Composant | Usage M3 |
|---|---|
| `Button` | variants `primary` (Postuler), `secondary`, `ghost` (Sauvegarder), `text`, `danger` ; `loading`, `disabled` |
| `Badge` | type d'opportunité (`teal`), **région** (`grey` — métadonnée neutre), statut candidature (`blue/green/yellow/red/grey`) |
| `Tag` | non utilisé en M3 — ses variantes (`cjs/partner/urgent/new/…`) sont des états sémantiques, aucune ne convient à une région neutre |
| `Input` / `Select` | champ recherche, champs de filtre |
| `Modal` | **formulaire de candidature** (modal centrée — convient) |
| `EmptyState` | liste sans résultat, « Mes candidatures » vide |
| `Skeleton` | chargement liste et détail |
| `Toast` | confirmation de candidature, prompt favori anonyme |
| `Card` | base de composition pour les cartes |

### À créer
| Composant | Raison | Réf. design |
|---|---|---|
| **`ui/Sheet`** | Slide-over latéral desktop / bottom-sheet mobile. `Modal` est centré → ne convient pas. Composant responsive unique. **Créé par GUIC-20** (FiltresPanel mobile), réutilisé par GUIC-21 (détail). | `.sheet` (Mobile Patterns) |
| `OpportunityCard` | carte composée (titre, badges, deadline, favori) | `.opp` / `.opp-m` |
| `OpportuniteDetail` | contenu du détail (partagé sheet + page SSR) | `.sheet` keyfacts |
| `FiltresPanel` | filtres groupés (panneau desktop / contenu du `Sheet` mobile) | UI Kit `.dom-tag`, `.obj-b` |
| `CandidatureModal` | formulaire dans `Modal` | `.fm-form` |
| `MesCandidatures` | liste de suivi | `.opp-m` simplifié |

> **`ui/Sheet` est créé par GUIC-20** : GUIC-20 est livré en premier (GUIC-21 en dépend) et
> a déjà besoin d'un bottom-sheet pour `FiltresPanel` sur mobile. GUIC-21 le **réutilise**
> pour le détail (variante slide-over desktop).

---

## 3. Spécification par écran

### 3.1 Liste `/opportunites` (GUIC-20)
- **En-tête** : titre `--fs-800`, sous-titre `--fs-300` `text-secondary`.
- **Barre de recherche** : `Input` pleine largeur, hauteur `--tap-input` (48px), icône loupe
  SVG `currentColor` à gauche. Compteur de résultats `--fs-200` sous la barre.
- **Bandeau pré-filtre région** (UX F3) : bandeau `bg teal-soft`, texte `teal-deep`
  `--fs-200`, « Opportunités dans [région] · voir tout le Sénégal » (lien). Fermable.
- **Desktop (≥ `--bp-lg`)** : grille 2 colonnes — `FiltresPanel` sticky à gauche
  (~280px), grille de cartes à droite. **Mobile** : 1 colonne, bouton « Filtres » (avec
  pastille du nombre de filtres actifs) ouvrant le `Sheet`.
- **Cartes** : scroll infini, spinner `Skeleton` en pied. Skeleton initial = 6 `.skel-card`.
- États : voir §4.

### 3.2 `OpportunityCard`
D'après `.opp` / `.opp-m` :
- Surface blanche, `border --gj-bw`, `border-radius --gj-r-xl`, **accent bord gauche 4px**.
- Accent : `gj-teal` par défaut, **`gj-red` si deadline imminente (< 7 j)**. *(Pas de
  variante « partner » : aucun champ du modèle ne porte cette notion — voir §6.)*
- Contenu : titre `--fs-400` `font-black` (2 lignes max, ellipsis) · `Badge` type (`teal`) ·
  organisation `--fs-200` `text-secondary` · `Badge` région (`grey`) · deadline relative
  (`time-ago.ts`, locale `fr`) en `gj-red` `font-bold` si imminente · rémunération si
  présente.
- **Bouton favori** : icône cœur SVG `currentColor`, zone tactile 44px, coin haut-droit.
  État actif = rempli `gj-teal`. Optimistic.
- Carte entière cliquable (lien `/opportunites/[slug]`) — le cœur stoppe la propagation.

### 3.3 `FiltresPanel`
- Sections repliables : **Domaine** (9), **Type** (6), **Région** (14), **Tri**.
- Items : **pastilles** (`.dom-tag`) pour Domaine et Type ; **liste de checkboxes** pour
  Région (volumétrie 14).
- Desktop : application immédiate. Mobile (dans `Sheet`) : bouton « Appliquer (N) » collant
  en bas + « Réinitialiser ».

### 3.4 Détail — `Sheet` (GUIC-21)
D'après `.sheet` :
- **Mobile** : bottom-sheet, `grab` handle (48×5px `line-strong`), `max-height 78%`,
  `border-radius 18px 18px 0 0`, `padding-bottom` safe-area, fermeture swipe + overlay.
- **Desktop** : slide-over latéral droit (largeur ~480px), même composant, variante.
- Overlay `--gj-overlay`, `z-index --gj-z-overlay`, animation `--motion-slow --motion-ease`.
- Contenu (`OpportuniteDetail`) : titre `--fs-600` `font-black`, méta organisation/région,
  description `--fs-300` `lh-loose`, **`keyfacts`** en grille 2 col (`kf` : label `--fs-100`
  majuscules / valeur `--fs-300` bold — type, domaine, rémunération, deadline).
- **Barre d'actions** collante en bas : `Postuler` (`Button primary`, pleine largeur
  prioritaire), `Sauvegarder` (`ghost`), `Partager` (`ghost`, icône). Hauteur
  `--tap-comfortable`.
- **États du bouton d'action** (UX F1) : `Postuler` / `Déjà candidaté` (disabled) /
  `Candidatures closes` (disabled) / `Se connecter pour postuler` (anonyme).

### 3.5 `CandidatureModal` (GUIC-21)
- `Modal` centré (`maxWidth ~460px`), titre « Postuler — [titre opportunité] ».
- **Contexte profil** en lecture seule : bloc `bg gj-bg` `--gj-r-md`, nom/prénom/téléphone.
- Champ `lettreMotivation` : `textarea`, `--fs-400` (anti-zoom), `helper` incitatif sous le
  champ, **compteur de caractères** `x / 2000` aligné à droite.
- **Case `notificationsConsent`** : checkbox non pré-cochée + libellé `--fs-300`.
- Pied : `Button primary` « Envoyer ma candidature » (`loading` à la soumission) +
  `Button ghost` « Annuler ». Erreurs `409`/`422` → `Alert` variant danger en haut du modal.

### 3.6 `/jeune/candidatures` (GUIC-21)
- Layout dashboard GUIC-19 (`AppTopbar` + `BottomNav`).
- Liste de cartes `.opp-m` simplifiées : titre (lien détail), organisation, date,
  **`Badge` statut** : `En_attente` grey · `Vue` blue · `Retenue` green · `Refusee` red.
- Vide → `EmptyState` (« Pas encore de candidature ») + bouton vers `/opportunites`.

---

## 4. États d'interface (rendu)

| État | Rendu |
|---|---|
| Liste — chargement | 6 × `Skeleton` `.skel-card` |
| Liste — vide catalogue | `EmptyState`, **sans** bouton de réinitialisation |
| Liste — aucun résultat (filtre) | `EmptyState` + `Button` « Réinitialiser les filtres » |
| Liste — erreur réseau | `Alert` danger + `Button` « Réessayer » |
| Détail — chargement | `Skeleton` dans le `Sheet` |
| Détail — 404 | message centré + lien retour liste |
| Candidature — succès | fermeture modal + `Toast` confirmation |
| Candidature — 409 / 422 | `Alert` danger dans le modal, modal maintenu |
| Favori anonyme | `Toast` « Connectez-vous pour sauvegarder » + lien login |

Tous les états respectent `prefers-reduced-motion` (déjà géré globalement par `tokens.css`).

---

## 5. Mapping tokens (extrait)

| Élément | Token |
|---|---|
| Action primaire (Postuler) | `--color-action-primary` (`gj-teal`) / hover `gj-teal-deep` |
| Accent carte urgente | `gj-red` |
| Deadline imminente (texte) | `gj-red` `font-bold` |
| Badge statut `Retenue` | `--color-status-success` + `-bg` |
| Surface carte / sheet | `--color-bg-surface` · bordure `--color-border-default` |
| Focus | `--focus-ring` (partout, déjà global) |
| Z-index sheet / overlay | `--gj-z-overlay` · toast `--gj-z-toast` |

---

## 6. Points UI tranchés (2026-05-22)

1. **Composant `Sheet`** → créé comme composant **`ui/Sheet`** générique (slide-over desktop /
   bottom-sheet mobile), réutilisable par d'autres modules. **Créé par GUIC-20**, réutilisé
   par GUIC-21.
2. **`EmptyState` et l'emoji** → `EmptyState` **réutilisé tel quel** ; son `emoji` est une
   illustration d'état, distincte des icônes de navigation visées par la règle CLAUDE.md.
3. **Style des filtres** → **pastilles** (`.dom-tag`) pour Domaine (9) et Type (6) ;
   **liste de checkboxes** pour Région (14, volumétrie trop élevée pour des pastilles).
4. **Variante « partner » de carte** → non livrée en M3 : aucun champ du modèle `Opportunite`
   ne porte cette notion. Accent carte = `gj-teal` par défaut, `gj-red` si deadline < 7 j.

---

## 7. Suite

UX et UI validées → **étape 5 du protocole** : validation finale des specs avec l'humain,
puis `CURRENT_TASK.md`, branche `feature/GUIC-20-...`, et écriture du code en TDD.
