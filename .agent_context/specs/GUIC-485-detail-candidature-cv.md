# GUIC-485 — Détail candidature + lecture CV recruteur (US-3)

Épic **GUIC-9** · Complète **GUIC-230** (endpoint CV recruteur, clôturé à tort) · Module **m9-recruteur**

## Objectif
Permettre au recruteur d'examiner les candidatures reçues : pipeline filtrable, détail
candidat (identité, coordonnées, lettre, CV sécurisé), et transitions de statut.

## Constat GUIC-230
L'endpoint livré (`GET /api/candidatures/[id]/cv`, GUIC-415) vérifie l'ownership **côté
jeune** (`cjsUid = session`). L'endpoint **recruteur** n'existe pas → créé ici.

## Ownership recruteur (réutilisé)
Une candidature « appartient » au recruteur si son `opportunite` matche
`offreWhere` = `{ deletedAt: null, OR: [{ recruteurUid: cjsUid }, { organisationId }] }`.

## Modèle (aucune migration)
- `Candidature` : `statut` (`En_attente|Vue|Retenue|Refusee`), `lettreMotivation`, `cvUrl`,
  `soumiseA`, `updatedAt`, `cjsUid` (candidat), `utilisateur` (prenom/nom/email/telephone).

## Livrables
### 1. AuditAction (`src/lib/audit.ts`)
`candidature.statut` · `candidature.cv.read` · `candidature.pii.view`.

### 2. Loader (`src/lib/loaders/recruteur.ts`)
- `getRecruteurCandidatures(cjsUid, orgId, statut?)` — filtre statut optionnel.
- `getRecruteurCandidatureDetail(cjsUid, orgId, id)` → detail ou `null` (ownership via offreWhere) :
  `{ id, statut, lettreMotivation, hasCv, soumiseA, updatedAt, candidat:{ cjsUid, prenom, nom, email, telephone }, offre:{ id, titre } }`.

### 3. Endpoint CV (`src/app/api/recruteur/candidatures/[id]/cv/route.ts`)
`GET` : session + rôle `recruteur` → rate-limit (30/min) → candidature via ownership org →
`auditPiiAccess('candidature.cv.read', cjsUid, { targetCjsUid: candidat })` → `proxyPrivateBlob(cvUrl)`.
404 si introuvable/non-ownée/pas de CV. 401 si non authentifié. 403 si non-recruteur.

### 4. Action statut (`src/app/recruteur/candidatures/actions.ts`)
`changerStatutCandidature(id, statut: 'Vue'|'Retenue'|'Refusee')` :
`assertRecruteur` → Zod (statut ∈ 3) → `updateMany({ where: { id, opportunite: offreWhere }, data:{ statut } })`
→ `count===0` ⇒ `NOT_FOUND` → `recordAudit('candidature.statut')` → revalidate.

### 5. UI
- Détail `/recruteur/candidatures/[id]` (server) : garde + loader (404) + **auto-Vue** si `En_attente`
  (updateMany direct + `auditPiiAccess('candidature.pii.view')`) + `StatutActions` (client).
- `StatutActions.tsx` : boutons Vue/Retenue/Refusée (transition), lien CV (ouvre l'endpoint).
- Liste : filtres statut (`?statut=`), lignes cliquables → détail.
- Dashboard : carte + section « À examiner » → `/recruteur/candidatures?statut=En_attente`.

## Tests (TDD) — `tests/unit/recruteur-candidature-actions.test.ts`
non-recruteur→FORBIDDEN · statut invalide→rejet · ownership (where.opportunite.OR) · count 0→NOT_FOUND ·
valide→updateMany+audit.

## DoD
`npm run validate` vert · endpoint + action + détail + filtre + audit CDP · PR → dev · Jira Revue.
