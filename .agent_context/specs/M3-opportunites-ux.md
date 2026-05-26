# Étude UX — Module M3 Opportunités (GUIC-20 + GUIC-21)

**Périmètre :** parcours de découverte, recherche, consultation et candidature aux
opportunités. Couvre les tickets GUIC-20 (liste/recherche/filtres) et GUIC-21 (détail/
candidature). À lire avant l'étude UI (`M3-opportunites-ui.md`) et avant tout code.

**Statut :** validé le 2026-05-22 — décisions UX tranchées (§5).

---

## 1. Contexte d'usage réel

| Facteur | Implication UX |
|---|---|
| ~22 000 jeunes, 14 régions du Sénégal | Mobile-first strict — conception au pouce, pas de survol |
| Connexions lentes, data coûteuse | Chargement incrémental, pas d'images lourdes, feedback immédiat |
| Arrivées fréquentes via lien WhatsApp / partage / Google | Deep-link obligatoire : état d'URL + `slug`, rendu SSR |
| Public peu habitué aux formulaires longs | Candidature courte, friction minimale, aucun champ piège |
| Auth SSO externe (redirection hors site) | Chaque « connexion requise » est un point de fuite à minimiser |
| Feature phones possibles | Aucune dépendance à des interactions complexes (drag fin, hover) |

**Personas prioritaires :**
- *Jeune en recherche active* — connaît son domaine, veut filtrer vite, postuler souvent.
- *Jeune en exploration* — ne tape pas de requête, parcourt, a besoin que la liste soit
  pertinente d'emblée.
- *Visiteur anonyme* — arrive par un lien partagé, doit pouvoir tout consulter sans compte ;
  la connexion n'est exigée qu'au moment de postuler ou sauvegarder.

---

## 2. Parcours principal

```
Découverte ──► Liste /opportunites ──► Filtrer / Chercher ──► Carte
 (WhatsApp,        (browse — pas          (région, domaine, type)    │
  Google, accueil)  forcément search)                                ▼
                                                Détail (slide-over desktop /
                                                        sheet mobile / page SSR)
                                                          │
                                  ┌───────────────────────┼────────────────────┐
                              Sauvegarder              Postuler             Partager
                              (favori)                    │
                                              [connecté ?] ──non──► login ──► retour
                                                          │ oui                 (rouvre le
                                              Formulaire candidature             formulaire)
                                                          │
                                              Toast + notification (si consentie)
                                                          │
                                              /jeune/candidatures (suivi du statut)
```

---

## 3. Points de friction identifiés et résolutions

### F1 — Le détail ignore l'état par-utilisateur
`GET /api/opportunites/[slug]` est public et anonyme ; le bouton d'action dépend pourtant de
l'utilisateur (*Postuler* / *Déjà candidaté* / *Candidatures closes*). Sans gestion, le jeune
remplit le formulaire pour récolter un `409`/`422` final.
**Résolution :** le client connecté charge **une fois** l'ensemble de ses candidatures
(set d'IDs d'opportunités, via `GET /api/candidatures`) — même pattern que le set de favoris
de GUIC-20. Le détail et la carte dérivent l'état du bouton de ce set. Bouton désactivé +
libellé explicite si l'opportunité est expirée ou déjà candidatée.

### F2 — La connexion casse le parcours au pire moment
*Postuler* en anonyme → redirection SSO → retour. Le jeune perd le fil.
**Résolution :** `callbackUrl` pointe vers `/opportunites/[slug]?postuler=1` — au retour, le
détail s'ouvre **et** le formulaire de candidature est ré-ouvert directement.

### F3 — Découverte sans recherche
La majorité ne tape pas de requête ; elle parcourt. Une liste « tout le Sénégal » non triée
par pertinence noie les opportunités proches.
**Résolution :** **pré-filtre doux par région**. Si l'utilisateur est connecté et a une
région au profil, la liste s'ouvre filtrée sur sa région, avec un **bandeau** explicite :
« Opportunités dans [région] · voir tout le Sénégal » (clic = retire le filtre). Réversible,
visible, jamais bloquant. Anonyme ou sans région → liste nationale par défaut.

### F4 — Lettre de motivation vide
Champ optionnel → des candidatures sans aucun texte côté recruteur.
**Résolution :** champ **optionnel mais encouragé** — texte d'aide incitatif (« Quelques
lignes sur votre motivation augmentent vos chances ») + compteur de caractères. Pas de
minimum bloquant : la friction prime sur la complétude pour cette cible.

### F5 — Volumétrie des filtres (14 régions × 9 domaines × 6 types)
Un bottom-sheet à plat devient une liste interminable.
**Résolution :** filtres groupés par catégorie, sections repliables, et application explicite
sur mobile (bouton « Appliquer » — pas de re-fetch à chaque coche). Desktop : panneau latéral,
application immédiate acceptable.

### F6 — Coût d'un parcours abandonné
Chaque écran ajoute une chance d'abandon sur connexion lente.
**Résolution :** détail en slide-over/sheet (pas de navigation pleine page depuis la liste),
formulaire en modal par-dessus le détail — le jeune ne « quitte » jamais visuellement la
liste tant qu'il n'a pas fini.

---

## 4. États d'interface à couvrir (obligatoires)

| Écran | États |
|---|---|
| Liste | `chargement` (skeleton cartes), `vide-sans-filtre` (catalogue vide), `aucun-résultat-avec-filtre` (≠ — propose de réinitialiser), `erreur-réseau` (message + retry) |
| Détail | `chargement`, `404` (opportunité introuvable/retirée), `erreur` |
| Bouton action détail | `postuler`, `déjà-candidaté` (désactivé), `candidatures-closes` (désactivé), `non-connecté` (CTA login) |
| Formulaire candidature | `idle`, `soumission` (loading), `succès` (Toast), `409 déjà postulé`, `422 opportunité fermée`, `hors-ligne` |
| Favori | `actif` / `inactif`, `optimistic`, `non-connecté` (toast/prompt) |
| Mes candidatures | `chargement`, `vide` (EmptyState + lien vers /opportunites), liste |

`vide-sans-filtre` et `aucun-résultat-avec-filtre` sont **deux états distincts** : le premier
n'offre pas de « réinitialiser les filtres », le second oui.

---

## 5. Décisions UX tranchées (2026-05-22)

1. **Pré-filtrage région** → pré-filtre doux sur la région du profil + bandeau réversible
   (F3). Liste nationale par défaut pour l'anonyme.
2. **Lettre de motivation** → optionnelle, avec texte d'aide incitatif et compteur (F4).
3. **État du bouton détail** → set de candidatures chargé côté client, comme le set de
   favoris (F1).
4. `callbackUrl` rouvre le formulaire après connexion (F2).
5. Détail et formulaire restent en surcouche de la liste — pas de navigation pleine page
   depuis la liste (F6).

---

## 6. Accessibilité et contraintes transverses

- Cibles tactiles ≥ 44 px, navigation au pouce, zone basse privilégiée pour les actions.
- Focus visible, libellés de formulaire explicites, `aria-*` sur la sheet et la modal.
- Aucun texte porté uniquement par la couleur (badges statut = texte + couleur).
- Tout libellé en français ; pas d'emoji comme icône fonctionnelle ou de navigation
  (l'illustration d'un état vide via `EmptyState` fait exception — cf étude UI §6).
- Le parcours complet (liste → détail → candidature) doit rester utilisable sans JavaScript
  pour la consultation (SSR), l'interactivité (sheet, optimistic) étant une amélioration.

---

## 7. Suite

→ Étude UI : `M3-opportunites-ui.md` — composants, tokens `gj-*`, layouts précis à partir
de `design/html/` (source de vérité visuelle).
