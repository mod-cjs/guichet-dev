# Handoff : Guichet Jeunesse Sénégal — plateforme jeunesse (15 lots)

## Vue d'ensemble

Plateforme numérique du **Consortium Jeunesse Sénégal (CJS)** mettant en relation les jeunes
Sénégalais de 15 à 35 ans avec des opportunités d'emploi, de stage, de formation et de
financement, via un guichet unique — web, mobile et centres physiques CJS.

Quatre profils d'utilisateurs :

| Profil | Périmètre |
| --- | --- |
| **Bénéficiaire** (jeune) | recherche d'opportunités, candidatures, profil, événements, ressources, centres, carte CJS, assistante IA « Yaye » |
| **Conseiller** CJS | suivi des bénéficiaires, agenda, bibliothèque physique (prêts / retours / classement) |
| **Recruteur** / employeur | dépôt d'offres, gestion des candidatures reçues |
| **Administrateur** | pilotage, statistiques, modération, inventaire de la bibliothèque |

Le périmètre est découpé en **15 lots** (voir « Écrans / Vues »), le lot 14 étant la
bibliothèque de composants (design system vivant).

---

## À propos des fichiers de design

**Les fichiers de ce dossier sont des références de design réalisées en HTML.** Ce sont des
prototypes qui montrent l'apparence et le comportement attendus — **ce n'est pas du code de
production à copier tel quel.**

La tâche consiste à **recréer ces designs dans l'environnement du dépôt cible** (React,
Vue, Flutter, React Native, SwiftUI, Laravel + Blade, etc.) en suivant ses conventions,
sa bibliothèque de composants et son système de routage existants. Si aucun environnement
n'existe encore, choisir la pile la plus adaptée au projet et y implémenter les designs.

Concrètement, dans ces prototypes :

- Le rendu passe par **React 18 + Babel Standalone chargés depuis un CDN**, avec du JSX
  transpilé dans le navigateur. C'est un dispositif de maquettage : à remplacer par une
  vraie chaîne de build.
- Les composants sont exposés sur `window` via `Object.assign(window, {...})` parce que
  chaque `<script type="text/babel">` a sa propre portée. À remplacer par des imports ES.
- Les styles sont majoritairement des **objets de style inline** en JSX. Les valeurs sont
  justes et à reprendre ; le mécanisme est à convertir vers la solution du dépôt
  (CSS Modules, Tailwind, styled-components, StyleSheet…).
- Les écrans sont posés sur un **canvas de maquette** : chaque écran web est un cadre de
  1280 px de large, chaque écran mobile un cadre de 390 × 844. Ces cadres sont un
  dispositif de présentation, pas une contrainte de mise en page.
- Les données sont **statiques et en dur** dans des fichiers `*-data.jsx`. Elles servent de
  contrat de données implicite : les champs présents indiquent ce que l'API doit fournir.

**Ce qui est à reprendre fidèlement**, en revanche : la palette, la typographie, les
espacements, les rayons, les ombres, les libellés en français, les états, les règles
d'accessibilité et les règles de design listées plus bas.

---

## Fidélité

**Haute fidélité (hifi).** Couleurs, typographie, espacements et interactions sont
définitifs, issus de la charte graphique **Yaakaar 2030 (Treevans)** et validés par deux
tours de retour designer. L'implémentation doit être fidèle au pixel, en s'appuyant sur
`tokens.css` comme source de vérité des valeurs.

Le lot 14 (« Bibliothèque Composants ») est la **référence normative** : en cas de
divergence entre un écran et le lot 14, le lot 14 fait foi.

---

## Écrans / Vues

Chaque lot est un fichier HTML autonome contenant plusieurs écrans posés côte à côte sur un
canvas pannable et zoomable. Ouvrir le fichier dans un navigateur pour explorer.

| Lot | Fichier | Contenu |
| --- | --- | --- |
| 1 | `Lot 1 - Onboarding + Ecrans cles.html` | Onboarding mobile, OTP, consentement, tableau de bord, candidatures, notifications, centres, carte CJS |
| 2 | `Lot 2 - Onboarding Web + Dashboard Beneficiaire.html` | Onboarding web, tableau de bord bénéficiaire web et mobile |
| 3 | `Lot 3 - Opportunites.html` | Liste d'opportunités, filtres, détail en panneau latéral, candidature, états vides |
| 4 | `Lot 4 - Profil Beneficiaire.html` | Profil, complétion, compétences, documents, paramètres |
| 5 | `Lot 5 - Evenements.html` | Agenda, détail d'événement, inscription, emplacements photo |
| 6 | `Lot 6 - Ressources.html` | Médiathèque en étagère (couvertures générées en CSS), lecteur, téléchargement hors-ligne |
| 7 | `Lot 7 - Centres CJS.html` | Carte des centres, fiche centre, prise de rendez-vous, carte CJS |
| 8 | `Lot 8 - Espace Conseiller.html` | Portefeuille de bénéficiaires, fiche suivi, agenda, **bibliothèque physique** (prêts, retours, disponibilité, classement par cote) |
| 9 | `Lot 9 - Mes Candidatures.html` | Suivi de candidatures, chronologie, relances |
| 10 | `Lot 10 - Espace Recruteur.html` | Dépôt d'offre, tableau des candidatures, tri, entretiens |
| 11 | `Lot 11 - Administration.html` | Pilotage, statistiques, modération, utilisateurs, inventaire bibliothèque |
| 12 | `Lot 12 - Complements Beneficiaire.html` | Messagerie, éléments sauvegardés, notifications, connexion, consentement |
| 13 | `Lot 13 - Etats Systeme.html` | Chargement, squelettes, erreurs, hors-ligne, états vides, 404 |
| 14 | `Lot 14 - Bibliotheque Composants.html` | **Design system** : 16 catégories, versions web et mobile, règles à faire / à éviter |
| 15 | `Lot 15 - Yaye Opportunites Depot.html` | Assistante IA Yaye, dépôt d'opportunité assisté |

### Bibliothèque de composants (lot 14) — table des matières

Cinq familles, 16 catégories :

- **Fondations** — Charte Yaakaar 2030, Règles design V3, Couleurs & typographie
- **Éléments d'interface** — Boutons & actions, Formulaires, Onglets & filtres, Navigation, Pastilles & avatars
- **Contenu** — Cartes & listes, Cartes d'opportunité, Données & progression, Composants signature
- **Surfaces & états** — Surfaces & overlays, États & feedback
- **Assistant IA** — Bouton & accessibilité, Conversation IA

---

## Règles de design non négociables

Ces règles sont le résultat des retours designer. Les enfreindre casse la cohérence du
produit.

### Couleur

1. **Une couleur d'action unique** : le magenta `#ae0057` (`--gj-action`) est réservé aux
   CTA de conversion — Postuler, Valider, S'inscrire, Déposer. **Jamais** pour la
   navigation, les liens, les états ou la marque.
2. **Le teal `#027f7e` est la couleur de marque et de structure** : navigation, en-têtes,
   liens, éléments de chrome.
3. **Une catégorie d'offre = une couleur**, sur toutes les surfaces (voir les tokens
   `--cat-*`). Emploi = indigo, stage = cyan, formation = vert, financement = orange,
   volontariat = teal, événement = ambre, type inconnu = gris neutre.
4. **Le rouge est exclusivement réservé à l'urgence d'échéance** (J-3 et moins). Il ne code
   jamais un type d'offre.
5. **Rouge vif `#fc3241` et rose `#fe1c66` ne portent aucun texte** — ni noir, ni blanc
   (contrastes de 3,7:1 et 3,3:1). Ils servent aux aplats muets, filets et pictogrammes.
   Tout texte passe par la variante assombrie (`--gj-red` = `#C1121F`).
6. **Ambre, orange, cyan et vert en aplat portent du texte NOIR**, jamais blanc. Leur
   variante assombrie porte du texte blanc. Leur variante `-ink` sert au texte sur blanc.

### Typographie

7. **Lexend** est la police unique de l'interface (poids 300 à 900). **Delhi** est réservée
   au logotype et n'est jamais chargée en interface.
8. **Plancher absolu de 11 px** : aucun texte sous 11 px, sur aucune surface, y compris
   pastilles, badges, compteurs et métadonnées. Un écran d'entrée de gamme en plein soleil
   ne les rendrait plus lisibles.
9. Corps de texte à **16 px** — en dessous, iOS zoome les champs de saisie.

### Cibles tactiles et accessibilité

10. **44 px minimum** pour toute cible tactile sur mobile (`--tap-min`), 48 px recommandé
    pour les champs de saisie.
11. Anneau de focus visible partout : `--focus-ring-color` (ambre `#f8a309`), 4 px, décalé
    de 3 px.
12. Le réglage **« animations réduites »** (classe `gjm` sur `<html>`, plus
    `prefers-reduced-motion`) doit couper non seulement les animations CSS mais aussi les
    **minuteries JavaScript** — sinon un texte continue de s'écrire mot à mot pour qui a
    demandé l'inverse.
13. Un panneau d'accessibilité persistant est ancré en **bas à gauche** de chaque écran
    (contraste renforcé, espacement, zoom, guide de lecture, lecture vocale). Ce coin lui est
    réservé. Préférences persistées sous la clé `gj-a11y`.
14. Contenu **FALC** (facile à lire et à comprendre) présent sur les écrans à forte densité
    textuelle : phrases courtes, une idée par phrase, vocabulaire concret.

### Assistant IA (Yaye)

15. **Un seul point d'entrée IA permanent par écran** : le bouton flottant, 56 px en bas à
    droite du cadre web, 52 px en mobile au-dessus de la barre d'onglets. La pastille
    « Y IA » de l'en-tête mobile et l'encart Yaye du pied de colonne ont été retirés pour
    cette raison. Seule exception : l'invitation contextuelle d'un écran vide.
16. **Aucune réponse de Yaye sans ligne de sources.** C'est une condition de publication.
17. Yaye **oriente et prépare, ne décide d'aucune attribution** : le message de limites est
    affiché en tête de fil, avant l'échange, pas après l'erreur.
18. **La saisie vocale est retirée pour l'instant** : la barre n'accepte que l'écrit.
19. Attente : pastille de frappe sous une seconde ; **réflexion visible** au-delà (3 à 4
    étapes nommées en langage courant, chacune fermée par son résultat chiffré) ; réponse
    affichée d'un coup au-delà de six secondes.
20. **Trois cartes d'offre au maximum** par réponse, classées par correspondance, suivies
    d'un renvoi vers la liste complète.

### Mise en page

21. **Grilles et `gap`** pour tout groupe d'éléments frères, jamais d'espacement par marges
    individuelles ou par blancs de source.
22. Le conteneur de conversation est **toujours de hauteur bornée**, avec **une seule zone
    défilante**, pour que le composeur reste atteignable.
23. Sur web, l'IA s'ouvre en **panneau latéral** (400 px) ou en **bulle flottante**
    (384 × 560) — **jamais en modal plein écran**, qui ferait perdre le contexte dont
    l'utilisateur parle.

---

## Interactions et comportements

### Navigation

- **Web bénéficiaire** : colonne de navigation de 232 px à gauche (rubriques groupées,
  pied de colonne « Accessibilité »), barre supérieure avec recherche globale
  (raccourci ⌘K), contenu à droite.
- **Tablette** : à 834 px, la colonne devient un **rail de 76 px** à icônes.
- **Mobile** : barre d'onglets basse à 5 colonnes (Accueil, Explorer, Centres,
  Candidatures, Profil), hauteur 40–90 px. Sa présence est la signature d'un écran
  **connecté** : les écrans de connexion et de consentement n'en ont pas.
- **Back-office** (conseiller, recruteur, admin) : rail sombre à gauche sur fond navy,
  logo en version blanche.

### Bouton flottant IA — comportement précis

- Web : 56 px, ancré à 26 px du bord bas droit du cadre.
- Mobile : 52 px, ancré à 16 px du bord droit, 84 px du bas.
- Face à une **barre d'action épinglée** au bas du cadre (`position: sticky/fixed/absolute`,
  bord bas à moins de 24 px du bas du cadre, largeur ≥ 35 % du cadre), le bouton remonte
  juste au-dessus d'elle, **de 120 px au maximum**.
- Les zones défilantes réservent **72 px** (mobile) à **76 px** (web) de marge basse, pour
  qu'aucun contrôle de fin de page ne se retrouve sous la zone de clic.
- Il survole en revanche le contenu qui défile — c'est le comportement attendu d'un bouton
  flottant.

### Animations

- Halo du bouton IA : respiration continue, 2,6 s, `ease-out`.
- Indicateur de frappe : trois points, 1,3 s, décalage de 0,16 s.
- Réflexion de l'agent : une étape toutes les 1,1 s ; disque tournant 0,8 s linéaire.
- Réponse en flux : un mot toutes les 130 ms. La bulle **réserve dès le premier mot la
  hauteur du texte entier** (cale invisible), sinon la conversation sursaute.
- Basculement d'état terminal : l'en-tête passe de « Je cherche… » à « J'ai cherché » avec
  coche verte statique, et **toute animation s'arrête**.

### Retours et confirmations

- **Toasts** : `window.gjToast(message, "success" | "error" | "info")` — voir `toast.js`.
- **Actions destructrices** confirmées par un dialogue nommant l'objet et la conséquence.
- **États système** complets au lot 13 : chargement, squelettes, erreur, hors-ligne, vide,
  404.

---

## État applicatif attendu

Le prototype simule ; l'implémentation devra gérer au minimum :

| Domaine | État |
| --- | --- |
| Session | profil connecté, rôle (bénéficiaire / conseiller / recruteur / admin), jeton |
| Opportunités | liste paginée, filtres actifs (type, région, échéance), tri, offre sélectionnée, éléments sauvegardés |
| Candidatures | statut par candidature, chronologie, pièces jointes |
| Profil | complétion (pourcentage), compétences, documents, préférences |
| Conversation IA | fil de messages, état d'attente (frappe / réflexion / flux), sources, suggestions de rebond |
| Bibliothèque physique | catalogue, emprunts en cours, retours, retards, cotes (rayon + numéro), exemplaires disponibles |
| Accessibilité | contraste, espacement, zoom, guide de lecture, animations réduites — persistés (`localStorage` clé `gj-a11y`) |
| Réseau | état hors-ligne, file d'attente de synchronisation, ressources téléchargées |

---

## Tokens de design

Source de vérité : **`tokens.css`** (492 lignes, commentées). Extraits :

### Palette de marque — charte Yaakaar 2030

12 couleurs : 6 vives, 4 profondes, noir, blanc.

| Token | Valeur | Usage |
| --- | --- | --- |
| `--brand-ambre` | `#f8a309` | accent, focus, pastille « IA » |
| `--brand-orange` | `#ee6f21` | financement (aplat muet) |
| `--brand-magenta` | `#ae0057` | **action de conversion** |
| `--brand-indigo` | `#1e35ba` | emploi, information |
| `--brand-rouge` | `#fc3241` | urgence — aplats sans texte |
| `--brand-rose` | `#fe1c66` | accent — aucun texte |
| `--brand-cyan` | `#139ce8` | stage (aplat muet) |
| `--brand-vert` | `#19a657` | succès, formation (aplat muet) |
| `--brand-teal` | `#027f7e` | **marque, navigation, structure** |
| `--brand-navy` | `#162c5e` | fonds sombres, rails back-office |
| `--brand-noir` | `#202020` | encre |
| `--brand-blanc` | `#FFFFFF` | surfaces |

### Dérivées porteuses de texte

| Token | Valeur | Contraste sur blanc |
| --- | --- | --- |
| `--gj-teal-deep` | `#026463` | 4,9:1 |
| `--gj-teal-deep-2` | `#014B4A` | hover / pressed |
| `--gj-action` | `#ae0057` | 7,2:1 |
| `--gj-action-deep` | `#8C0046` | hover / pressed |
| `--gj-red` | `#C1121F` | 5,3:1 |
| `--gj-cyan` | `#0B5F8D` | 5,4:1 |
| `--gj-green` | `#0E6234` | 5,1:1 |
| `--gj-yellow-ink` | `#7A4E02` | texte sur ambre clair |
| `--gj-grey` | `#4A4A4A` | texte secondaire |
| `--gj-grey-2` | `#767676` | texte tertiaire, 4,5:1 |

Chaque couleur de marque dispose d'une variante `-soft` (aplat de fond) et `-ink` (texte,
assombrie pour passer AA).

### Catégories d'offre

| Catégorie | Aplat | Fond clair | Texte |
| --- | --- | --- | --- |
| Emploi | `#1e35ba` | `#E7EAFA` | `#182B95` |
| Stage | `#0B5F8D` | `#E2F2FD` | `#0B5F8D` |
| Formation | `#0E6234` | `#E4F6EB` | `#0E6234` |
| Financement | `#97400F` | `#FDEDE3` | `#97400F` |
| Volontariat | `#027f7e` | `#E2F1F1` | `#014B4A` |
| Événement | `#7A4E02` | `#FEF3DE` | `#7A4E02` |
| Type inconnu | `#4A4A4A` | `#F0F2F5` | `#3A3A3A` |

### Typographie

```
--gj-font-sans: "Lexend", "Segoe UI", system-ui, -apple-system,
                "Helvetica Neue", Arial, "Noto Sans", sans-serif;
```

| Token | Taille | Usage |
| --- | --- | --- |
| `--fs-100` | 11 px | **plancher absolu** — pastilles, badges, métadonnées |
| `--fs-200` | 13 px | légendes |
| `--fs-300` | 14 px | texte d'appui, sous-titres |
| `--fs-400` | 16 px | **corps** — défaut, anti-zoom iOS |
| `--fs-500` | 18 px | libellés clés |
| `--fs-600` | 20 px | titres de carte |
| `--fs-700` | 24 px | titres de section, chiffres KPI |
| `--fs-800` | 28 px | titres de page |
| `--fs-900` | 36 px | hero |

Poids : 400 / 600 / 700 / 800. Interlignes : 1,2 (serré) · 1,5 (corps) · 1,65 (aéré).

### Espacement, rayons, élévation

```
--space-1..8 : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px
--gj-r-xs..2xl : 3 · 6 · 8 · 10 · 14 · 18 px    --gj-r-pill : 999px
--gj-shadow-sm : 0 1px 3px  rgba(0,0,0,.08)
--gj-shadow-md : 0 3px 10px rgba(0,0,0,.18)
--gj-shadow-lg : 0 8px 32px rgba(0,0,0,.15)
--tap-min : 44px    --tap-comfortable : 48px    --tap-input : 48px
```

### Cotes de conteneur

| Surface | Dimensions |
| --- | --- |
| Cadre web de maquette | 1280 px de large |
| Cadre mobile de maquette | 390 × 844 |
| Colonne de navigation web | 232 px |
| Rail tablette | 76 px (à partir de 834 px) |
| Panneau IA latéral | 400 px × hauteur de page |
| Bulle IA flottante | 384 × 560, à 24 px des bords |
| Feuille IA basse mobile | 390 × 608 (72 % de la hauteur) |
| Largeur minimale de conversation | **320 px** — en dessous, les cartes d'offre ne tiennent plus |
| En-tête de conversation | 58 px (filet compris) |
| Composeur de conversation | 70 px (filet compris), champ et bouton d'envoi à 48 px |

---

## Ressources (assets)

Dans `assets/` :

| Fichier | Contenu |
| --- | --- |
| `icons.js` / `icons.svg` / `icons.css` | jeu d'icônes maison en sprite SVG (`<use href="#i-…">`), tracé 1,5–1,7 px, `stroke-linecap: round` |
| `logo-guichet.png` | logotype complet, fonds clairs (mot-symbole encre `#202020`) |
| `logo-guichet-blanc.png` | logotype complet, fonds sombres (mot-symbole blanc, symbole en couleurs) |
| `logo-symbole.png` | symbole seul, carré — rails étroits, favicon |
| `logo-symbole-blanc.png` | symbole seul sur fond sombre |
| `logo-guichet-original.png` | logotype d'origine avant recolorisation, pour référence |

**Règle de logotype** : sous 120 px de large, utiliser le symbole seul — le logotype
complet, de ratio 4,7:1, devient illisible. Le symbole garde toujours ses trois couleurs
(ambre, vert, rouge) et ne passe jamais en monochrome.

**Photographies** : les prototypes utilisent des emplacements de dépôt (`<image-slot>`,
voir `image-slot.js`) là où de vraies photos doivent venir — photos de centres CJS,
portraits d'événements, avatars. Aucune photo n'est fournie : les visuels devront venir du
CJS lui-même (avec autorisation écrite) ou de banques à représentation africaine réelle
(Iwaria, Nappy, CreateHer Stock). Les avatars sans photo tombent sur un **monogramme
coloré**, qui tient très bien seul.

---

## Fichiers

### Design system

```
tokens.css            source de vérité des tokens (492 lignes commentées)
colors_and_type.css   couleurs et typographie de document
assets/               icônes et logotypes
```

### Prototypes

Les 15 fichiers `Lot N - *.html` à la racine du dossier, aux côtés de `tokens.css`, `assets/` et des modules JSX — la structure est plate pour que chaque prototype s'ouvre et fonctionne tel quel. Chacun charge ses propres modules
JSX, également à la racine. Ouvrir un lot dans un navigateur suffit : tout est en place et
les chemins relatifs fonctionnent.

### Modules partagés — les plus utiles à lire

| Fichier | Rôle |
| --- | --- |
| `phone.jsx` | cadre téléphone, barre d'état, en-têtes, barre d'onglets |
| `web-dashboard.jsx` | colonne de navigation bénéficiaire, barre supérieure, carte d'opportunité web |
| `tablet-dashboard.jsx` | rail tablette de 76 px |
| `lot3-opps-web.jsx` / `lot3-opps-mobile.jsx` | cartes d'opportunité, filtres, détail, candidature |
| `component-kit-shell.jsx` | coquille du lot 14 : 16 catégories groupées, bascule web / mobile |
| `component-kit.jsx` … `component-kit11.jsx` | contenu de la bibliothèque, une famille par fichier |
| `component-kit10.jsx` | **conversation IA** : bulles, réflexion visible, flux, conteneur, intégrations |
| `component-kit11.jsx` | **cartes d'opportunité** documentées |
| `cjs-card.jsx` | carte physique CJS (recto / verso), ratio 1,585:1 |
| `library-pret.jsx` | bibliothèque physique : prêts, retours, cotes |
| `yaye-fab.js` | bouton flottant IA — logique d'injection, évitement, réservation d'espace |
| `accessibility.js` | panneau d'accessibilité, préférences persistées, `window.gjOpenA11y()` |
| `toast.js` | `window.gjToast(message, type)` |
| `image-slot.js` | emplacements de dépôt d'image |
| `lot-nav.js` | navigation inter-lots — **outil de maquette uniquement, à ne pas porter** |

### Documents de contexte

| Fichier | Contenu |
| --- | --- |
| `Audit UX - Guichet Jeunesse.html` | audit UX, priorités P1 / P2 / P3 et leur traitement |
| `Reponse au retour design V3.html` | réponse point par point au retour designer |
| `Note de design - Lots ajoutes.html` | note sur les lots ajoutés en cours de route |

---

## À ne pas porter dans le produit

- `lot-nav.js` — navigation entre maquettes, outil de présentation.
- `design-canvas.jsx` et les cadres de canvas — dispositif de présentation.
- Les données en dur des fichiers `*-data.jsx` — à remplacer par de vrais appels d'API,
  en conservant la forme des objets comme contrat de données.
- Le chargement de React et Babel par CDN.
