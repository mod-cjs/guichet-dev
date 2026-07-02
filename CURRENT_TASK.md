# CURRENT_TASK — GUIC-28 + GUIC-471 · CRUD Opportunités admin + édition/publication directe

**Branche :** `feature/GUIC-28-admin-crud-opportunites` (depuis `dev`)
**Tickets :** GUIC-28 (En cours) · GUIC-471 (lié « Relates ») — livraison unique, `Closes` les deux.
**Spec :** `.agent_context/specs/GUIC-28-admin-crud-opportunites.md`

## Décisions
- Livraison unique (une branche/PR). Migration légère. Admin-only (rôle conseiller hors périmètre).
- Réutilisation de `OpportuniteService` (create/update) — **non réécrit**, seulement câblé.
- Suppression = **soft-delete** (`deletedAt`), jamais de hard-delete depuis l'UI.

## Réalité post-`git pull` (51 commits rattrapés)
Le rejet-avec-motif de la file de modération existait déjà (GUIC-462, motif en audit seulement) +
route d'aperçu admin `[id]/apercu`. Net-new livré ici :
1. **Trace de modération sur l'offre** (colonnes `motifRejet`/`moderePar`/`modereLe`) — GUIC-471.
2. **CRUD complet** (create/edit/archive/soft-delete) — GUIC-28.
3. **Édition-depuis-la-file** (« Éditer et publier ») — GUIC-471.

## Livré
- **Migration** `20260702120000_opportunite_moderation_trace` (appliquée en base locale) + `prisma generate`.
- **Audit** : actions `opportunite.create/update/delete/publish` (src/lib/audit.ts).
- **Server actions** (src/app/admin/opportunites/actions.ts) :
  `creer/modifier/archiver/supprimer/publier` + `approuver/rejeter` tracés sur l'offre.
- **UI** : primitive `Textarea` (+story), `OpportuniteForm` (10 sous-types), pages `nouveau` /
  `[id]/modifier` / `gestion` (+client), « Éditer et publier » sur la file, entrée sidebar « Opportunités ».

## Vérifié
- `tsc --noEmit` : **0 erreur** (projet entier). `eslint src` : 0 erreur (warnings pré-existants only).
- Unit/component : **259 suites / 1841 tests verts** (aucune régression).
- Intégration DB réelle : modération-trace **7/7**, CRUD end-to-end **2/2**.
- ⚠️ 3 suites d'intégration hors périmètre rouges (onboarding / whatsapp-webhook / user-detail-guard) =
  échecs **pré-existants** liés à l'env local (secrets HMAC/WhatsApp, validation onboarding). Non liés.

## Reste à faire
- [ ] Packaging : commits TDD (RED tests → GREEN impl) + PR vers `dev` (`Closes GUIC-28`, `Closes GUIC-471`).
- [ ] (Env) Les tests d'intégration exigent `DATABASE_URL` exporté (docker mariadb 3307) — non chargé par jest.
