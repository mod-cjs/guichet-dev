# Spec — Gestion des ressources des centres + audit CDP des ressources sensibles

**Tickets :** GUIC-473 (Gestion ressources des centres · High) + GUIC-476 (Audit CDP accès ressources sensibles · High)
**Comble :** le trou « ressources skippées » de GUIC-30 (En cours, 8 SP) — volet `RessourceCentre`.
**Module :** m4-centres × m8-admin · **Livraison unique** (une branche, une PR, `Closes 473` + `Closes 476`)
**Décisions :** admin-only (création réservée admin) · audit ciblé sur documents personnels (CV/diplômes/certificats).

---

## 1. Contexte & état réel (piège de vocabulaire)

Deux entités « ressource » distinctes :
- **`Ressource`** = documents pédagogiques globaux → **CRUD admin déjà fait** (`admin/ressources`). Hors périmètre.
- **`RessourceCentre`** ([schema.prisma:1180](../../prisma/schema.prisma)) = actifs **réservables** d'un centre (Salle / Vehicule / Poste_info / Equipement / Atelier_recurrent). Modèle + loaders lecture + flux réservation existent, mais **AUCUN CRUD admin/staff** → c'est le trou « skippé ».

Centres : CRUD admin déjà fait ([admin/centres/actions.ts](../../src/app/admin/centres/actions.ts)) — modèle à répliquer.
Audit : infra complète (`recordAudit` / `auditPiiAccess` / table `AuditLog` / page `journal-audit`), **aucun téléchargement audité** aujourd'hui.

## 2. Objectifs (acceptance)

**GUIC-473 — CRUD RessourceCentre (admin-only)**
1. Depuis le panel admin, lister les ressources réservables d'un centre.
2. **Créer** une ressource pour un centre (type, nom, description, capacité, unité, durée créneau, justif requise).
3. **Éditer** une ressource existante.
4. **Activer/désactiver** (`estActive`) — retrait doux sans casser les réservations passées.
5. **Supprimer** — refusé si des réservations y sont rattachées (préserve l'historique) ; sinon hard-delete.
6. Traçabilité audit : `ressource_centre.create/update/delete`.

**GUIC-476 — Audit CDP des ressources sensibles**
7. Tout téléchargement d'un **document personnel sensible** (CV, diplôme, certificat) écrit une entrée d'audit (qui / quoi / quand), via `auditPiiAccess`.
8. L'entrée est visible dans le **journal d'audit** admin (libellé + ton + icône dédiés).

## 3. Modèle de données
**Aucune migration.** `RessourceCentre` et `AuditLog` existent déjà. `estActive` sert de retrait doux. `AuditAction` (type TS) est étendu, pas la base.

## 4. Couche audit
Étendre `AuditAction` ([audit.ts:1](../../src/lib/audit.ts)) :
```
| 'ressource_centre.create' | 'ressource_centre.update' | 'ressource_centre.delete'
| 'ressource_sensible.download'
```
Étendre `ACTION_META` ([journal-audit/page.tsx:14](../../src/app/admin/journal-audit/page.tsx)) avec libellés FR + ton + icône pour ces actions.

## 5. Server actions — `src/app/admin/centres/ressources-actions.ts` (nouveau)
Toutes gardées par `assertAdmin()` (mirroir de `centres/actions.ts`), Zod, `revalidatePath`.

| Action | Effet | Audit |
|---|---|---|
| `creerRessourceCentre(centreId, input)` | vérifie centre existe → `ressourceCentre.create` | `ressource_centre.create` |
| `modifierRessourceCentre(id, input)` | `ressourceCentre.update` | `ressource_centre.update` |
| `basculerActiveRessourceCentre(id, estActive)` | toggle `estActive` | `ressource_centre.update` |
| `supprimerRessourceCentre(id)` | refuse si `_count.reservations > 0` (`RESSOURCE_NON_VIDE`) sinon delete | `ressource_centre.delete` |

Input Zod : `type (nativeEnum TypeRessourceCentre)`, `nom (1..120)`, `description?`, `imageUrl?`, `capacite (int ≥1)`, `capaciteUnit?`, `dureeMinCreneauMin (int ≥15)`, `requiresJustif (bool)`, `estActive (bool)`.

## 6. Audit downloads — GUIC-476
Instrumenter les routes de fichiers personnels (owner = session courante — self-service, mais la CDP trace tout accès aux données perso ; future-proof pour un accès tiers) :
- [api/profil/cv/file/route.ts](../../src/app/api/profil/cv/file/route.ts)
- [api/profil/diplomes/[id]/file/route.ts](../../src/app/api/profil/diplomes/[id]/file/route.ts)
- [api/profil/certificats/[id]/file/route.ts](../../src/app/api/profil/certificats/[id]/file/route.ts)

Avant le stream (après auth OK) :
```ts
await auditPiiAccess('ressource_sensible.download', session.cjsUid, {
  targetCjsUid: session.cjsUid,          // propriétaire du document
  meta: { docType: 'cv' | 'diplome' | 'certificat', docId? },
})
```
Fail-soft (l'audit ne bloque jamais le téléchargement — `auditPiiAccess` ne throw pas). Photo de profil **exclue** (peu sensible, haute fréquence).

## 7. UI (`src/app/admin/centres/[id]/ressources/`)
- `page.tsx` (server, garde admin) → charge le centre + ses `RessourceCentre` (avec `_count.reservations`).
- `AdminCentreRessources.tsx` (client) → liste par type, badges actif/inactif, actions Éditer / Activer-Désactiver / Supprimer + CTA « Nouvelle ressource ».
- `RessourceCentreFormModal.tsx` (client) → modale création/édition (mirroir `CentreFormModal`), primitives `src/components/ui/` (Modal/Input/Select/Button), tokens `gj-*`, `<Icon>`.
- Lien « Ressources » par ligne dans [centres-admin-table.tsx](../../src/app/admin/centres/centres-admin-table.tsx) → `/admin/centres/[id]/ressources`.

## 8. Sécurité & règles
- Défense en profondeur : middleware `/admin` + re-check page + `assertAdmin()` par action.
- Admin-only (création réservée admin — aligné GUIC-473). Rôle conseiller-sous-validation = **hors périmètre** (ticket de suivi).
- Pas de SQL brut, tout via Prisma. Payload ≤ 50KB.

## 9. Tests (TDD strict RED→GREEN)
- **Server actions** (unit, prisma mické) : garde admin fail-closed ; create/update/toggle ; delete refusé si réservations ; audit appelé.
- **Audit download** (unit) : la route appelle `auditPiiAccess` avec le bon `docType`, et **stream quand même si l'audit throw** (fail-soft).
- **UI** : liste rend les ressources + badges, form crée/édite, CTA ; modal.
- Intégration DB réelle : create→update→delete d'une RessourceCentre + refus si réservation.

## 10. Hors périmètre
- Rôle conseiller-sous-validation (staff-session/RoleAgent enforcement).
- Flag `sensible` sur le catalogue `Ressource` global.
- Audit des accès aux `RessourceCentre` / photo de profil.

## 11. Découpage livraison (commits TDD)
1. `test` audit actions + download → `feat` extension `AuditAction` + `ACTION_META` + instrumentation routes (476)
2. `test` server actions RessourceCentre → `feat` `ressources-actions.ts` (473)
3. `test` UI → `feat` page + liste + modal + lien table (473)
4. `chore` validation `npm run validate`

PR unique vers `dev` · `GUIC-473 feat: gestion ressources des centres + audit CDP ressources sensibles` · `Closes GUIC-473` + `Closes GUIC-476`.
