# Spec — CRUD Opportunités admin + édition/publication directe

**Tickets :** GUIC-28 (CRUD Opportunités admin · Highest · 5 SP) + GUIC-471 (Édition + publication directe par l'admin · High)
**Module :** m3-opportunites × m8-admin · **Livraison unique** (une branche, une PR, deux `Closes`)
**Décision périmètre :** admin-only (le rôle conseiller-sous-validation reste cross-cutting, traité avec le cluster A ressources)

---

## 1. Contexte & état réel

- Le panneau admin opportunités = **modération seule** : `AdminModerationList` → Approuver / Rejeter / Aperçu. Aucun create/edit/delete.
- Le « rejet **avec motif** » supposé par GUIC-471 **n'existe pas** : `rejeterOpportunite(id)` est appelé sans motif ([actions.ts:61](../../src/app/admin/opportunites/actions.ts#L61)).
- Machine à états : `StatutOpportunite = brouillon | publiee | archivee | expiree`. `brouillon` = file de modération, `archivee` = rejeté/retiré.
- **Socle de réutilisation** : `OpportuniteService.create / update / delete` ([opportunite-service.ts:299](../../src/lib/services/opportunite-service.ts#L299)) est **complet, testé, transactionnel (invariant XOR mère+sous-type)** mais **non branché** à aucune UI/route. GUIC-28 = câbler ce service à des server actions admin + UI de formulaire. **Ne pas réécrire le service** (mémoire projet : brancher l'existant, ne pas recréer un service).
- Contrat d'entrée : `CreateOpportuniteInput = { type: SousTypeSlug, base: BaseInput, details: <sous-type> }` ([opportunite-service.ts:65](../../src/lib/services/opportunite-service.ts#L65)).

## 2. Objectifs (acceptance)

**GUIC-28 — CRUD**
1. L'admin **crée** une opportunité (10 sous-types) → statut `brouillon` par défaut, ou `publiee` si publication directe.
2. L'admin **édite** une opportunité existante (n'importe quel statut) — base + sous-type.
3. L'admin **archive** (`statut=archivee`) et **supprime** (soft-delete `deletedAt`, préserve l'historique candidatures — jamais de hard delete depuis l'UI).
4. Liste de **gestion** = toutes les opportunités non supprimées (tous statuts), filtrable par statut, paginée 20/page.

**GUIC-471 — modération enrichie**
5. Le **rejet capture un motif** (obligatoire, ≥ 10 caractères) → persisté sur l'offre + audit.
6. Depuis la file de modération, l'admin peut **« Éditer »** puis **« Éditer et publier »** un brouillon (backup recruteur).
7. Traçabilité : qui a approuvé/rejeté, quand, et le motif de rejet — lisible dans le journal d'audit ET rattaché à l'offre.

## 3. Migration Prisma (légère)

Ajouts sur `model Opportunite` (aucune colonne existante touchée, tout nullable → rétro-compatible) :

```prisma
// Traçabilité de modération (GUIC-471 / conformité CDP)
motifRejet String?   @map("motif_rejet") @db.Text      // motif de rejet (null si approuvée/non modérée)
moderePar  String?   @map("modere_par")  @db.VarChar(36) // cjs_uid de l'admin décideur (approve OU reject)
modereLe   DateTime? @map("modere_le")                   // horodatage de la décision
```

> Note de nommage : générique `moderePar/modereLe` (couvre approve **et** reject) plutôt que `approuvePar/approuveLe` — même intention validée (traçabilité + motif), sémantique correcte pour les deux décisions.

- `prisma migrate dev --name opportunite_moderation_trace`
- **Pas** d'ajout d'états à l'enum (décision : on garde brouillon/archivee, hors périmètre — évite d'impacter le loader public et les requêtes existantes).

## 4. Couche audit

Étendre `AuditAction` ([audit.ts:19](../../src/lib/audit.ts#L19)) :
```
| 'opportunite.create'
| 'opportunite.update'
| 'opportunite.delete'
| 'opportunite.publish'
```
(`opportunite.approve` / `opportunite.reject` existent déjà.)

## 5. Server actions — `src/app/admin/opportunites/actions.ts`

Toutes gardées par `assertAdmin()` (fail-closed, déjà présent). Validation Zod sur chaque entrée. `revalidatePath` sur les vues admin concernées.

| Action | Effet | Audit |
|---|---|---|
| `creerOpportunite(input)` | `OpportuniteService.create` ; si `statut=publiee` → set `moderePar/modereLe` = admin/now | `create` (+`publish` si direct) |
| `modifierOpportunite(id, patch)` | `OpportuniteService.update` | `update` |
| `publierBrouillon(id)` | `brouillon → publiee` + `moderePar/modereLe` | `publish` |
| `approuverOpportunite(id)` | *(existant)* + set `moderePar/modereLe` | `approve` |
| `rejeterOpportunite(id, motif)` | *(signature étendue)* `brouillon → archivee` + `motifRejet/moderePar/modereLe` ; motif requis ≥10 car. | `reject` |
| `archiverOpportunite(id)` | `→ archivee` (retrait volontaire, sans motif de rejet) | `update` |
| `supprimerOpportunite(id)` | **soft-delete** `deletedAt=now` (pas de hard delete) | `delete` |

> `OpportuniteService.delete` fait un **hard delete cascade** → on ne l'utilise PAS depuis l'UI. Le soft-delete admin se fait via `prisma.opportunite.update({ deletedAt })` (préserve candidatures). Le service reste pour les usages internes/tests.

## 6. Routes & UI (`src/app/admin/opportunites/`)

- `page.tsx` (existant) → devient la **file de modération** (onglet « En attente », `statut=brouillon`) inchangé dans l'esprit + boutons « Éditer » / « Éditer et publier » + modale motif au rejet.
- `gestion/page.tsx` (nouveau) → **liste de gestion** tous statuts, filtre statut, actions Éditer/Archiver/Supprimer + CTA « Nouvelle opportunité ».
- `nouveau/page.tsx` (nouveau) → formulaire de création.
- `[id]/modifier/page.tsx` (nouveau) → formulaire d'édition (préchargé via `findByIdWithDetails`).
- `OpportuniteForm.tsx` (nouveau, client) → formulaire partagé création/édition piloté par `CreateOpportuniteInput` : champs `base` + sélecteur de sous-type + champs discriminés du sous-type. Composants `src/components/ui/` exclusivement, tokens `gj-*`, `<Icon>` (jamais de HTML brut / hex / emoji). Story `OpportuniteForm.stories.tsx`.
- `RejetMotifModal.tsx` (nouveau) → saisie du motif obligatoire.
- Nav : ajouter l'entrée « Opportunités » (gestion) dans `AdminSidebar` à côté de « Modération ».

## 7. Sécurité & règles

- Défense en profondeur : middleware `/admin` + re-check `isAdminRole` en page + `assertAdmin()` dans chaque action.
- `recruteurUid` : les créations admin le laissent `null` (MVP — pas de sélecteur de recruteur ce lot).
- Payload ≤ 50KB, pas de SQL brut, tout via Prisma/service.
- Slug unique : validation + message d'erreur clair sur collision.

## 8. Tests (TDD strict — RED avant GREEN)

- **Server actions** (`tests/unit/admin-opportunites-actions.test.ts`) : garde admin fail-closed ; create → brouillon ; create publié → moderePar set ; update ; reject sans motif → rejeté ; reject avec motif → motifRejet persisté ; delete = soft (deletedAt, candidatures intactes) ; idempotence.
- **Migration** : le client Prisma régénéré expose `motifRejet/moderePar/modereLe`.
- **Form** : rendu création + édition préchargée (RTL), story.
- Ré-utiliser les tests existants `opportunite-service.test.ts` (ne pas régresser).

## 9. Hors périmètre (explicite)

- Rôle conseiller-sous-validation (→ cluster A).
- Flux recruteur `/recruteur/mes-offres` (stub Sprint 4 — inchangé).
- Nouveaux états d'enum (`en_attente`/`rejete`).
- Sélecteur de recruteur à la création.

## 10. Découpage livraison (commits TDD)

1. `test` migration+actions (RED) → `feat` migration Prisma + audit actions (GREEN)
2. `test` server actions CRUD (RED) → `feat` server actions (GREEN)
3. `test` OpportuniteForm (RED) → `feat` formulaire + pages nouveau/modifier + gestion (GREEN)
4. `feat` modération enrichie (motif modal, éditer-et-publier) + nav
5. `chore` stories + validation `npm run validate`

PR unique vers `dev` · titre `GUIC-28 feat: CRUD opportunités admin + édition/publication directe` · pied `Closes GUIC-28` + `Closes GUIC-471`.
