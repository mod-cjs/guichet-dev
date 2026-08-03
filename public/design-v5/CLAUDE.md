# CLAUDE.md — Guichet Jeunesse Sénégal

Ce dépôt contient une **référence de design** : 15 prototypes HTML du produit Guichet
Jeunesse Sénégal, plus le design system qui les gouverne. Lire `README.md` en entier avant
d'écrire du code — il contient les tokens, les cotes et les 23 règles de design non
négociables.

## Ce que tu dois faire

Recréer ces designs dans l'environnement du dépôt cible, en suivant ses conventions
existantes. Si aucun environnement n'existe, proposer une pile et la justifier avant de
commencer.

**N'expédie pas ces fichiers HTML en production.** Ce sont des maquettes : React et Babel
sont chargés par CDN, le JSX est transpilé dans le navigateur, les composants sont exposés
sur `window`, les données sont en dur, et les écrans sont posés sur un canvas de
présentation.

## Ordre de lecture conseillé

1. `README.md` — vue d'ensemble, règles, tokens, cotes
2. `tokens.css` — source de vérité de toutes les valeurs, commentée
3. `Lot 14 - Bibliotheque Composants.html` — **référence normative**. En cas de divergence
   entre un écran et le lot 14, le lot 14 fait foi
4. Le lot correspondant à la fonctionnalité à implémenter

## Règles à ne jamais enfreindre

Détaillées dans `README.md`, résumé des plus faciles à casser par inadvertance :

- **Magenta `#ae0057` uniquement pour les CTA de conversion** (Postuler, Valider,
  S'inscrire, Déposer). Le teal `#027f7e` porte la navigation et la marque. Ne jamais
  intervertir.
- **Aucun texte sous 11 px**, sur aucune surface, y compris pastilles et compteurs.
- **44 px minimum** pour toute cible tactile sur mobile.
- **Le rouge signale uniquement l'urgence d'échéance** (J-3 et moins), jamais un type
  d'offre.
- **Rouge vif `#fc3241` et rose `#fe1c66` ne portent aucun texte.** Utiliser `--gj-red`
  (`#C1121F`) dès qu'un libellé est posé dessus.
- **Ambre, orange, cyan et vert en aplat portent du texte noir**, jamais blanc.
- **Un seul point d'entrée IA permanent par écran** : le bouton flottant.
- **Aucune réponse de l'assistante Yaye sans ligne de sources.**
- **Le réglage « animations réduites » doit couper les minuteries JavaScript**, pas
  seulement les animations CSS.
- **Lexend** partout en interface. **Delhi** est réservée au logotype et n'est jamais
  chargée en interface.
- Espacer les groupes d'éléments frères avec **`gap`** en flex ou grid, jamais par marges
  individuelles.

## Langue

Toute l'interface est en **français**, avec un registre tutoyant et direct côté bénéficiaire
(« Que cherches-tu aujourd'hui ? »), plus neutre côté back-office. Les libellés exacts des
prototypes sont validés — les reprendre tels quels plutôt que les retraduire. Certains
écrans portent une variante **FALC** (facile à lire et à comprendre) : la conserver.

Le public cible est jeune, majoritairement mobile, sur réseau intermittent et matériel
d'entrée de gamme. Cela explique le plancher typographique, les grandes cibles tactiles, les
états hors-ligne et le mode de téléchargement des ressources.

## Contrat de données

Les fichiers `*-data.jsx` contiennent des données en dur. Leur forme est le contrat implicite
attendu de l'API : les champs présents indiquent ce que le back-end doit fournir. À lire
avant de concevoir les schémas.

## Ce qu'il ne faut pas porter

- `lot-nav.js` — navigation entre maquettes
- `design-canvas.jsx` et les cadres du canvas — dispositif de présentation
- Les cadres fixes de 1280 px (web) et 390 × 844 (mobile) — cotes de maquette, pas de
  contraintes de mise en page
- Les données en dur des `*-data.jsx`
- Le chargement de React et Babel par CDN

## Points d'attention techniques déjà résolus dans les maquettes

Ces solutions valent d'être reprises, elles corrigent des défauts réels observés :

- Le bouton flottant IA détecte les **barres d'action épinglées** (ancêtre en
  `sticky`/`fixed`/`absolute`, bord bas à moins de 24 px du bas, largeur ≥ 35 % du cadre) et
  remonte au-dessus, de 120 px au maximum. Les zones défilantes réservent 72 à 76 px de
  marge basse.
- La bulle de réponse en flux **réserve dès le premier mot la hauteur du texte entier**,
  sinon la conversation sursaute à chaque ligne.
- Le conteneur de conversation est **toujours de hauteur bornée**, avec **une seule zone
  défilante** — sinon le composeur sort de l'écran, ou l'utilisateur ne sait plus quelle
  zone il fait glisser.
- Sur mobile, la **barre d'onglets à 5 colonnes** est la signature d'un écran connecté :
  elle distingue les écrans de session des écrans de connexion et de consentement.
