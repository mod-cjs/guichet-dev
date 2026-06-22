# Wave `<wave-name>` — spec

> Template à copier vers `.agent_context/specs/wave-<nom>.md` pour chaque vague
> d'intégration design v3. Lu par la skill `/wave` et le workflow
> `wave-integration`. Toutes les sections sont **obligatoires** sauf celles
> marquées (optionnel).

---

## Objectif

(1-3 phrases FR décrivant la valeur métier de la vague.)

## Tickets

Liste des `GUIC-NNN` à implémenter dans cette vague. Format :

| Ticket | Titre court | Lot ref | Estimation | Agent suggéré |
|---|---|---|---|---|
| GUIC-501 | Tokens design system v3 | Lot 14 (component-kit) | 4h | refactoring-specialist |
| GUIC-502 | Primitive Button v3 | Lot 14 | 3h | frontend-developer |
| GUIC-503 | Primitive Card v3 | Lot 14 | 2h | frontend-developer |

## Périmètres disjoints

Pour chaque ticket, lister les **fichiers que l'agent peut toucher** (allow-list strict). Aucun chevauchement entre tickets autorisé.

### GUIC-501
- `src/styles/tokens.css`
- `src/styles/colors_and_type.css`
- `src/styles/globals.css`

### GUIC-502
- `src/components/ui/Button/index.tsx`
- `src/components/ui/Button/Button.stories.tsx`
- `tests/unit/button.test.tsx`

### GUIC-503
- `src/components/ui/Card/index.tsx`
- `src/components/ui/Card/Card.stories.tsx`
- `tests/unit/card.test.tsx`

## Dépendances

Ordre dans lequel les tickets doivent finir (DAG). Format `X -> Y` = "Y attend que X soit mergé sur mouhammadouod avant de pouvoir lancer".

- `GUIC-501 -> GUIC-502` (Button consomme les tokens)
- `GUIC-501 -> GUIC-503` (Card consomme les tokens)
- `GUIC-502` indépendant de `GUIC-503`

Indépendants = peuvent tourner en parallèle. Séquentiels = workflow respecte l'ordre.

## Lot v3 références

- **Lot 14** — Bibliothèque Composants : `public/design-v3/Lot 14 - Bibliotheque Composants.html` + `design-guichet-v3/component-kit*.jsx`
- Note de design : `public/design-v3/Note de design - Lots ajoutes.html` (toujours lu pour les principes)

## Feature flag

- Cette vague doit-elle livrer derrière `NEXT_PUBLIC_DESIGN_V3=true` ? **OUI / NON**
- Si OUI : pattern `/feature-flag activate` (split files OU early-return — préciser)

## Critères de succès

Pour considérer la vague terminée :

- ✅ Tous les tickets en `Revue en cours` sur Jira
- ✅ `cjs-regression-guard` PASS sur chaque branche
- ✅ `cjs-design-auditor` retourne ≤ N findings medium/low (préciser le seuil acceptable)
- ✅ Storybook stories à jour pour les nouveaux composants
- ✅ Tests verts (préciser le compteur ciblé)
- ✅ Audit visuel `ui-ux-tester` Playwright 3 viewports sans Critical
- ✅ Aucune régression sur les routes critiques (login SSO + 5 routes clés HTTP 2xx/3xx)

## Hors périmètre (à ne PAS faire dans cette vague)

- Lister les choses tentantes mais HORS scope (typiquement repris dans une vague ultérieure)
- Ex : "Internationalisation des labels — voir Wave +2"
- Ex : "Animation transitions micro-interactions — Wave +1"
- Ex : "Refacto signature props existante — séparer en ticket dédié"

## Risques connus

- Lister les pièges anticipés (régression sur consumers, dépendance externe, conflit avec une PR ouverte, etc.)
- Pour chaque risque : action de mitigation prévue

## Validation humaine

Décisions à valider AVANT de spawn les agents (cochez quand done) :

- [ ] Le périmètre disjoint a été relu fichier par fichier (aucun overlap)
- [ ] Les estimations sont réalistes (vélocité 3-5 PRs/jour utile observée)
- [ ] Le tech lead s'est engagé sur des créneaux merge pour cette vague
- [ ] Vague 0 (purge-debt) est terminée et CI verte

---

**Notes au workflow** : le workflow `wave-integration` lit ce fichier, valide qu'il est complet, et refuse de spawn si une section obligatoire est vide. Le DAG est extrait des `->` dans § Dépendances.
