# Spec GUIC-20 — Page Opportunités : recherche et filtres avancés

**Ticket :** GUIC-20 · **Sprint :** 1 · **Story Points :** 8
**Module :** M3 (m3-opportunites) — catalogue public, parent GUIC-3
**Branche prévue :** `feature/GUIC-20-opportunites-recherche` (depuis `dev`)
**Sous-tâches :** GUIC-71, 72, 73, 74, 75, 76, **GUIC-167** (GUIC-70 fermée — modèle déjà livré)
**Études liées :** UX `M3-opportunites-ux.md` · UI `M3-opportunites-ui.md`

---

## Contexte

La migration GUIC-17 a déjà livré en base le modèle `Opportunite` : enums `TypeOpportunite`,
`Domaine`, `Region`, `StatutOpportunite`, index `@@fulltext([titre, description])`, compteur
`vues`, soft-delete `deletedAt`. Les pages `/opportunites` et `/api/opportunites` ne sont que
des stubs (`{ data: [], meta: { total: 0 } }`).

GUIC-20 livre le **catalogue public consultable** : liste, recherche plein-texte, filtres,
état vide, support **favoris** (nouveau modèle, GUIC-167), et le champ **`slug`** SEO du
modèle `Opportunite` (déplacé depuis GUIC-21 — voir « Décisions »).

### Hors scope GUIC-20
- Rendu du détail d'une opportunité + candidature → **GUIC-21**
- Création/édition d'opportunités (côté recruteur) → **m9-recruteur**
- Page « Mes favoris » dédiée → API livrée ici, page reportée (ticket de suivi si besoin)

### Décisions de cadrage (arbitrées avec le PO)
- **`slug` livré ici, pas en GUIC-21** : la carte doit pouvoir linker dès le Sprint 1.
  GUIC-21 ne fait plus qu'ajouter le *rendu* du détail.
- **Modèle de favori aligné sur l'existant** `RessourceFavorite` : clé composite, pas de
  `id` uuid (voir ci-dessous).
- **Favori non connecté** : toast/prompt incitatif sans quitter la page (pas de redirection).
- **Recherche plein-texte** : `@@fulltext` en **BOOLEAN MODE** (pas de seuil 50 %, robuste
  dès 50 lignes seedées).

---

## Schéma Prisma — changements

### Nouveau modèle `OpportuniteFavorite` (GUIC-167)

> Aligné sur le pattern existant `RessourceFavorite` (clé composite, pas de uuid).
> Le modèle `Favori` générique de la spec précédente est abandonné pour cohérence du schéma.

```prisma
model OpportuniteFavorite {
  cjsUid        String   @map("cjs_uid") @db.VarChar(36)
  opportuniteId String   @map("opportunite_id") @db.VarChar(36)
  createdAt     DateTime @default(now()) @map("created_at")

  utilisateur Utilisateur @relation(fields: [cjsUid], references: [cjsUid])
  opportunite Opportunite @relation(fields: [opportuniteId], references: [id])

  @@id([cjsUid, opportuniteId])
  @@index([cjsUid])
  @@map("opportunites_favorites")
}
```
- Relations inverses à ajouter : `opportunitesFavorites OpportuniteFavorite[]` sur
  `Utilisateur` **et** sur `Opportunite`.
- La clé composite `@@id` rend le `DELETE` trivial et garantit l'unicité sans `@@unique`.

### Ajout du champ `slug` à `Opportunite` (déplacé depuis GUIC-21)
```prisma
slug String @unique @db.VarChar(280)   // SEO — généré depuis le titre
```

**Migration en 3 étapes** (une colonne `@unique` non-null sur une table déjà peuplée par la
migration Drupal ne peut pas être créée en une passe) — éditer la migration générée :
1. `ALTER TABLE opportunites ADD COLUMN slug VARCHAR(280) NULL;`
2. Backfill SQL : `slugify(titre)` + suffixe court anti-collision (`-<6 hex>` si doublon).
3. `ALTER TABLE opportunites MODIFY slug VARCHAR(280) NOT NULL, ADD UNIQUE (slug);`

Migrations : `prisma migrate dev --name add_opportunite_slug` puis
`add_opportunites_favorites` (deux migrations distinctes, ordre libre).

---

## Contrats API

### `GET /api/opportunites`
Endpoint **public** — rate-limit Redis (`rateLimit`, 60 req/min/IP).
**Cache Redis 5 min** sur clé dérivée des query params. Le cache est **anonyme** : il ne
porte aucun état favori (voir « État favori » côté frontend).

Query params :
| Param | Type | Défaut | Notes |
|---|---|---|---|
| `q` | string | — | recherche plein-texte `titre`+`description` (`@@fulltext`, BOOLEAN MODE) |
| `domaine` | enum `Domaine` | — | filtre exact |
| `type` | enum `TypeOpportunite` | — | filtre exact |
| `region` | enum `Region` | — | filtre exact |
| `page` | number ≥ 1 | 1 | pagination **offset** |
| `sort_by` | `recent` \| `deadline` | `recent` | tri |

```ts
// Response 200 — ApiResponse<OpportuniteListItem[]>
{ data: OpportuniteListItem[], meta: { total: number, page: number, pageSize: 20 } }
```
**Conditions de visibilité (toutes obligatoires) :**
- `statut = publiee`
- `deletedAt IS NULL` ← **soft-delete : à ne pas oublier (couvert par test)**
- non expirée : `deadline >= now()` **OU** `deadline IS NULL`

Notes :
- 20 items/page (règle CLAUDE.md). `OpportuniteListItem` = champs carte uniquement :
  `id, slug, titre, type, domaine, region, organisation, deadline, remuneration`.
- `q` vide / absent → pas de filtre plein-texte (liste complète).
- `sort_by=recent` → `createdAt desc` · `sort_by=deadline` → `deadline asc, nulls last`.
- Params invalides → `400 VALIDATION_ERROR` (Zod).

> **Recherche plein-texte — BOOLEAN MODE :** la recherche natural-language MariaDB applique
> un seuil de 50 % et `ft_min_word_len` ; sur 50 lignes seedées elle peut ne rien renvoyer.
> Utiliser `MATCH ... AGAINST (? IN BOOLEAN MODE)`. Comme Prisma `search` ne pilote pas le
> mode, c'est l'**unique exception SQL brut tolérée** — à consigner dans `DECISIONS.md`,
> requête paramétrée via `prisma.$queryRaw`. Tester explicitement « 1 mot court → résultats ».

### `POST /api/favoris`
Auth SSO requise. Rate-limit 20/min/user.
```ts
// Body Zod : { opportuniteId: string (uuid) }
// 201 → { data: { cjsUid, opportuniteId, createdAt } }
// doublon → 200 idempotent (upsert sur clé composite)
// opportunité inexistante → 404
```

### `DELETE /api/favoris/[opportuniteId]`
Auth SSO. Ownership implicite (clé `cjsUid` de session). Réponse `204` (idempotent : 204
même si le favori n'existait pas).

### `GET /api/favoris`
Auth SSO. Rate-limit 30/min. Renvoie les favoris de l'utilisateur (jointure opportunité,
champs `OpportuniteListItem`). Pagination offset 20/page. Tri `createdAt desc`.

---

## Frontend

### `/opportunites` (page publique — `(public)`)
Layout `Header` marketing seul, pas de bottom-nav (cf `layout-navigation.md`).

```
┌─ En-tête (titre + sous-titre) ───────────────────────────────────────────┐
├─ Barre de recherche (debounce 300ms) + compteur de résultats ────────────┤
├─ Desktop : panneau filtres latéral │ grille cartes (scroll infini)       │
│  Mobile  : bouton "Filtres" → bottom-sheet  │ grille 1 col               │
├─ État "aucun résultat" : EmptyState + bouton "Réinitialiser les filtres" │
└──────────────────────────────────────────────────────────────────────────┘
```

- **État d'URL** : `q`, `domaine`, `type`, `region`, `sort_by` persistés en query params
  (partage de lien, retour navigateur). Source de vérité = `useSearchParams`.
- **Recherche** : input contrôlé, debounce 300 ms avant fetch.
- **Scroll infini** : consomme l'API **offset** (`page` incrémenté), bouton/spinner de
  chargement ; pas de pagination curseur.
- **Filtres** : checkboxes par valeur d'enum (`Domaine` 9, `TypeOpportunite` 6, `Region` 14),
  **groupés par catégorie, sections repliables**. Desktop = panneau latéral sticky, application
  immédiate ; mobile = bottom-sheet avec bouton **« Appliquer »** explicite (pas de re-fetch à
  chaque coche). **Jamais** `overflow-x-auto`.
- **Pré-filtre doux par région** (cf `M3-opportunites-ux.md` F3) : si l'utilisateur est
  connecté et a une `region` au profil, la liste s'ouvre **filtrée sur sa région**, avec un
  bandeau « Opportunités dans [région] · voir tout le Sénégal » (clic = retire le filtre).
  Anonyme ou sans région → liste nationale. Le pré-filtre n'écrase pas un `region` déjà
  présent dans l'URL (lien partagé prioritaire).
- Tokens `gj-*` uniquement, icônes SVG inline `currentColor`, composants `src/components/ui/`.

### État favori (résolution du conflit cache ↔ état par-utilisateur)
La liste publique est cachée et anonyme : elle **ne porte pas** `isFavori`.
- Si l'utilisateur est connecté, le client charge `GET /api/favoris` une fois et garde le
  **set d'IDs favorites** en mémoire ; chaque carte dérive son état par appartenance au set.
- Toggle favori → **optimistic UI** sur le set local + `POST`/`DELETE` ; rollback si erreur.
- **Non connecté** : clic cœur → `Toast`/mini-prompt « Connectez-vous pour sauvegarder »
  avec lien `/auth/login`. **Pas de redirection** — filtres et scroll préservés.

### Composant `OpportunityCard`
- Affiche : titre, `Badge` type (`teal`), organisation, `Badge` région (`grey`), deadline
  (relative, locale `fr` via `time-ago.ts`), rémunération si présente, bouton favori.
- La carte est un lien vers `/opportunites/[slug]` (le `slug` existe dès GUIC-20). GUIC-21
  transformera cette navigation en slide-over via *intercepting route* — GUIC-20 livre le
  lien plein-page nominal.
- Basé sur `Card` (`src/components/ui/Card`).

---

## Fichiers à créer / modifier

### Nouveaux
- `prisma/migrations/<ts>_add_opportunite_slug/migration.sql` (éditée — 3 étapes + backfill)
- `prisma/migrations/<ts>_add_opportunites_favorites/migration.sql`
- `src/app/api/opportunites/route.ts` — **remplace le stub** (GET réel)
- `src/app/api/favoris/route.ts` — GET + POST
- `src/app/api/favoris/[opportuniteId]/route.ts` — DELETE
- `src/lib/validations/opportunite.ts` — Zod query params + favori
- `src/lib/opportunites-loader.ts` — requêtes Prisma liste + filtres + `$queryRaw` fulltext + cache Redis
- `src/lib/slug.ts` — `slugify()` + génération unique (utilisé par le backfill et le seed)
- `src/components/ui/Sheet/` — composant générique slide-over/bottom-sheet (cf `M3-opportunites-ui.md`)
- `src/components/opportunites/OpportunitesClient.tsx` — recherche + filtres + grille
- `src/components/opportunites/OpportunityCard.tsx` — carte `.opp` (accent teal/red deadline)
- `src/components/opportunites/FiltresPanel.tsx` — pastilles Domaine/Type + liste Région ;
  panneau latéral desktop, contenu du `Sheet` sur mobile
- `src/components/opportunites/index.ts`
- `src/types/opportunite.ts` — `OpportuniteListItem`, `OpportuniteFiltres`
- `prisma/seed/opportunites.ts` — 50 opportunités réalistes (importé par `prisma/seed/index.ts`)

### Tests (TDD — écrits AVANT le code)
- `tests/unit/slug.test.ts` — slugify, unicité, collisions
- `tests/unit/opportunites-loader.test.ts` — filtres, exclusion `statut`/`deletedAt`/expirées, tri
- `tests/integration/opportunites-api.test.ts` — GET filtres, recherche BOOLEAN MODE (mot court),
  pagination, 400 params invalides, rate-limit
- `tests/integration/favoris-api.test.ts` — POST/DELETE/GET, idempotence, auth, 404

### Modifiés
- `prisma/schema.prisma` — champ `slug` sur `Opportunite`, modèle `OpportuniteFavorite` + relations inverses
- `prisma/seed/index.ts` — appelle le seed opportunités
- `src/app/(public)/opportunites/page.tsx` — refonte (server component + `OpportunitesClient`)

---

## Critères Done

### Backend
- [ ] Migration `slug` (3 étapes + backfill sans collision) et `OpportuniteFavorite` appliquées
- [ ] `GET /api/opportunites` : filtres q/domaine/type/region, tri, pagination 20/page
- [ ] Exclut `statut != publiee`, `deletedAt != null`, expirées — couvert par tests
- [ ] Recherche plein-texte en BOOLEAN MODE, exception SQL brut consignée dans `DECISIONS.md`
- [ ] Cache Redis 5 min (anonyme) + rate-limit Redis sur l'endpoint public
- [ ] API favoris (GET/POST/DELETE), idempotence, auth SSO, 404 cohérents
- [ ] Seeder 50 opportunités (tous domaines/types/régions, données sénégalaises, slugs)

### Frontend
- [ ] Recherche debounce 300 ms, compteur de résultats
- [ ] Filtres desktop latéral / mobile bottom-sheet, état dans l'URL
- [ ] Scroll infini sur API offset
- [ ] `EmptyState` + réinitialisation des filtres
- [ ] Favori : set d'IDs chargé une fois, optimistic toggle, cas non-connecté = toast/prompt
- [ ] Carte = lien `/opportunites/[slug]`
- [ ] Icônes = SVG inline `currentColor` (aucun emoji comme icône fonctionnelle/nav ;
      l'illustration `EmptyState` fait exception), tokens `gj-*`, composants `ui/` uniquement

### Qualité
- [ ] Tests écrits AVANT le code (TDD)
- [ ] `npm run validate` vert (lint + tsc + tests)
- [ ] `ApiResponse<T>` partout, Zod partout, Prisma partout sauf exception fulltext documentée
- [ ] `CURRENT_TASK.md` à jour · commit `[GUIC-20]` + `Closes GUIC-20` · auteur `mod-cjs` · aucune mention IA

---

## Questions ouvertes / à décider en revue PR

1. **Compteur par filtre** : pour 50 opportunités, recompter à la volée suffit ; facettes
   pré-agrégées à revoir si la volumétrie augmente.
2. **Opportunités sans région** (`region = null`, ex. offres nationales) : invisibles sous un
   filtre région — comportement accepté ; à confirmer si un libellé « national » est attendu.
3. **Nom de route favoris** : `/api/favoris` ne sert que les opportunités en Sprint 1 ;
   à renommer/scoper si M6 ajoute une API favoris ressources.
</content>
</invoke>
