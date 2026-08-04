# Standard de qualité — migration design v5 (épic GUIC-689)

Capitalisation des décisions et du niveau d'exigence établis pendant les vagues 1 à 3
et la reprise de l'espace opportunités. **À lire avant toute vague suivante** (profil,
recruteur, conseiller, centre-staff) et à coller dans les briefs d'agents.

Le registre des écarts (`design-v5-deviations.md`) dit *ce qui* a été décidé, écart par
écart. Ce document dit *comment* on décide et *quand* un écran est fini.

---

## 1. Les cinq règles qui ont fait toute la valeur

Elles ont été apprises sur des défauts réels, pas posées a priori.

### R1 — Un contrôle qui ne fait rien est pire que pas de contrôle
Trois CTA morts et deux filtres décoratifs ont été trouvés. Le plus grave n'était pas
l'inaction mais le **résultat faux** : cocher « Rémunérée » affichait « 1 filtre actif »
et renvoyait le catalogue entier. Un jeune croyait ne voir que des offres rémunérées.
→ Ne jamais livrer un bouton, un filtre ou un onglet sans son effet réel.
→ Si la donnée n'existe pas, **ne pas livrer le contrôle** et le tracer au registre.

### R2 — Ne jamais fabriquer une caution
Un score de correspondance « 94 % » en dur, une ligne de sources posée en dur alors que
le contexte pouvait être vide : deux cas où l'écran affirmait une analyse qui n'avait pas
eu lieu. C'est plus grave qu'un manque, parce que ça oriente une décision (postuler,
faire confiance à une réponse).
→ Toute affirmation affichée doit être **dérivée** de ce qui a réellement servi.
→ En l'absence de donnée : **ne rien afficher**, jamais une valeur de repli.

### R3 — Une valeur présente peut être sémantiquement vide
« Montant — 0 FCFA » et « Organisme — À renseigner » venaient de marqueurs de
remplissage stockés en base. Le premier laisse croire que la bourse ne verse rien, le
second fait fuiter un marqueur interne vers le public.
→ Filtrer les montants nuls et les marqueurs (`à renseigner`, `n/a`, `inconnu`, `-`).
→ Ne jamais rendre une cellule vide, un « true », un enum brut (`cdd`, `Saint_Louis`).

### R4 — Vérifier la donnée avant de promettre un champ
Les filtres « Format » de l'agenda et la notation des événements n'ont pas été livrés :
aucun champ `format` sur le modèle (invention de la maquette), aucune API de notation.
À l'inverse, la check-list des prérequis a été livrée en une passe : les données étaient
déjà en mémoire dans le composant.
→ Avant d'implémenter un bloc de maquette : lire `schema.prisma` et le loader.
→ Trois issues : **livrable** / **à exposer dans le DTO** / **absent du modèle** (ticket).

### R5 — Le rendu réel trouve ce que les tests ne voient pas
Suite verte à 4466 tests, et pourtant : liens de pied de page à 1,93:1, pastilles
illisibles après une régression de spécificité CSS, « 0 FCFA », mode hors-ligne livré
mais **monté nulle part**. Les fixtures portent des valeurs plausibles ; la base réelle non.
→ Build + rendu multi-viewports **obligatoire** avant de clore une vague.
→ Vérifier qu'un composant livré est **effectivement monté** quelque part.

---

## 2. Décisions transverses (déjà tranchées — ne pas re-débattre)

| Sujet | Décision | Pourquoi |
|---|---|---|
| Rouge | **Urgence d'échéance uniquement (J-3 ou moins)**. Jamais un type, un statut, une incitation | Règle non négociable du handoff ; le rouge à J-7 le banalisait |
| Échéance | Gradation : rouge ≤ 3 j · ambre 4-7 j · gris au-delà. **Gras systématique**. Libellé complet conservé (« Postuler avant le 12 juin »), le compte à rebours vit dans la pastille | Lisibilité à toutes distances sans banaliser l'alerte |
| Magenta `--gj-action` | CTA de **conversion** uniquement, **une seule action pleine par écran** | Retour design V3 §1 |
| Graisses | **800** (`font-extrabold`) pour titres de carte, chips, CTA. 900 réservé aux titres de hero | La maquette n'utilise 900 que sur les hero |
| Gradients | Interdits **sauf** hero, wordmark/avatar Yaye, `--prog-*`, admin gold | Consigne projet + la maquette fait elle-même ces exceptions |
| Plancher typo | **11 px partout**, y compris pastilles et compteurs. Sentinelle en CI | Écrans d'entrée de gamme en plein soleil |
| Cotes de maquette | Le canvas est figé à 1280 px : container 1280 (pas 920), 2 colonnes en `2xl` autorisées | Une cote de maquette n'est pas une règle |
| Focus ring | Statu quo `#00B287` — l'ambre v5 **échoue WCAG 1.4.11** (1,91:1 sur le fond) | Mesuré, pas supposé. Arbitrage design en attente |
| Primitive `Button` | Corriger **localement** les graisses, ne pas modifier la primitive | Partagée avec admin/recruteur/conseiller (autres vagues) |
| Hex en dur | Zéro, sauf exception documentée en commentaire (ex. noir d'impression d'un QR) | — |

---

## 3. Quand un écran est-il fini ?

Un écran n'est pas fini parce que la maquette est reproduite. Il l'est quand :

1. **Chaque contrôle agit** (R1) — vérifié au rendu, pas seulement en test.
2. **Chaque affirmation est adossée à une donnée** (R2, R3).
3. **Les champs du modèle sont exploités** — pas 3 sous-types sur 10 (R4).
4. **Les états existent** : chargement, vide, erreur, hors-ligne.
5. **Zéro erreur console** sur le parcours, en mobile et en desktop.
6. **Les règles transverses passent** : plancher 11 px, cibles 44 px, rouge réservé, une seule action pleine, zéro hex.
7. **Ce qui n'est pas livré est tracé** au registre avec sa raison et ce qu'il faudrait.

---

## 4. Méthode de travail (ce qui a marché)

- **Audit bidirectionnel** : code↔maquette, findings classés ÉCART-CODE / PROBLÈME-V5 / AMBIGUÏTÉ. La maquette n'a pas toujours raison (focus ring, filtres sans données).
- **Sentinelle sur la cause racine**, pas sur le symptôme : la sentinelle anti-filtre décoratif s'adosse à `FILTER_PARAM_KEYS` exporté par le panneau — ajouter un filtre non branché casse la CI. Idem sprite d'icônes, plancher typo, cohérence du code couleur inter-écrans.
- **Cohérence transverse** : corriger un mapping sur un écran ne suffit pas (Conférence était teal en liste, rouge en détail et au calendrier). Vérifier **toutes les surfaces**.
- **Ne jamais conclure sur une lecture partielle** : un ternaire lu à moitié m'a fait clore à tort une violation de règle non négociable. Monter le composant et compter.
- « **Tracé** » ≠ « **fait** » : le bandeau « Offre portée par » a traversé trois audits en étant exclu comme « déjà connu ». Un écart tracé doit avoir un statut explicite (corrigé / en attente / refusé).

---

## 5. Pièges techniques récurrents

| Piège | Conséquence | Parade |
|---|---|---|
| Classes Tailwind composées à l'exécution (`bg-${x}-soft`) | Jamais générées dans le CSS | `Record<Famille, string>` avec classes en toutes lettres |
| Scope d'un sélecteur global avec `:not()` | Spécificité (0,1,2) → écrase toutes les classes utilitaires | `:where()` (spécificité nulle) |
| Nouveau filtre sans clé de cache | Le résultat **non filtré** est resservi depuis Redis | Ajouter le param à `cacheKey()` |
| `leading-loose` | Vaut 2.0 et **écrase** l'interligne du token | Valeur explicite (`leading-[1.6]`) |
| jsdom + styles inline `var()` | Non sérialisés → assertions impossibles | Sentinelle sur la source |
| `npm run build \| tail` | Masque un échec | Capturer le code de sortie |
| Index git partagé entre agents parallèles | Un commit emporte le travail d'un autre | `git commit -- <chemins explicites>` |
| Hook TDD | Refuse un commit `feat` sans fichier de test | Ajouter une **assertion utile**, jamais `--no-verify` |
| Suites d'intégration en parallèle | Deadlock InnoDB (`curation-*`, `programme-*`, `admin-*`) | Flake connue : verte en isolé. **À corriger** (sérialiser) |
