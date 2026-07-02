# CURRENT_TASK — GUIC-473 + GUIC-476 · Ressources des centres + audit CDP

**Branche :** `feature/GUIC-473-ressources-centre-audit` (depuis `dev`)
**Tickets :** GUIC-473 (En cours) + GUIC-476 (En cours) — livraison unique, `Closes` les deux. Comble le volet ressources de GUIC-30.
**Spec :** `.agent_context/specs/GUIC-473-ressources-centre-audit.md`

## Décisions
- Admin-only (création réservée admin). Rôle conseiller-sous-validation = ticket de suivi.
- Audit CDP ciblé sur documents personnels (CV / diplômes / certificats). Photo exclue.
- Pas de migration : `RessourceCentre` + `AuditLog` existent déjà ; `AuditAction` (type TS) étendu.

## Piège de vocabulaire (levé)
« ressource » = 2 entités. `Ressource` (documents globaux) a déjà son CRUD admin. Ce lot vise
`RessourceCentre` (actifs réservables d'un centre) qui n'avait AUCUN CRUD — le trou « skippé » de GUIC-30.

## Livré
- **GUIC-476** : `AuditAction` + `ACTION_META` étendus ; instrumentation `auditPiiAccess` (fail-soft)
  des routes `api/profil/cv/file`, `diplomes/[id]/file`, `certificats/[id]/file` → `ressource_sensible.download`.
- **GUIC-473** : server actions `src/app/admin/centres/ressources-actions.ts`
  (creer/modifier/basculerActive/supprimer — refus si réservations) + audit `ressource_centre.*`.
- **UI** : page `/admin/centres/[id]/ressources`, `AdminCentreRessources` (liste + actions),
  `RessourceCentreFormModal`, lien « Ressources » par ligne dans la table des centres.
  (+ primitive `Textarea` recréée à l'identique de la PR #207 pour merge propre.)

## Vérifié
- `tsc` 0 erreur · `eslint` 0 erreur (fichiers touchés).
- Unit/component : 259 suites / 1833 verts (0 régression). Nouveaux : audit download (4), actions RessourceCentre (8), liste (5).
- Intégration DB réelle : CRUD RessourceCentre **1/1** (create→update→delete).
- Smoke live (dev server) : `/admin/centres`, `/admin/centres/<id>/ressources`, `/admin/journal-audit` → 200.

## Reste
- [ ] Packaging PR vers `dev` (`Closes GUIC-473`, `Closes GUIC-476`).
- [ ] (Suivi) Rôle conseiller-sous-validation ; flag `sensible` catalogue global ; audit accès RessourceCentre.
