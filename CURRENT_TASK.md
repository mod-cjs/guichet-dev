# CURRENT_TASK — GUIC-485 Détail candidature + lecture CV recruteur (US-3)

**Branche** : `feature/GUIC-485-detail-candidature-cv` (depuis dev)
**Épic** : GUIC-9 · **Complète** : GUIC-230 (endpoint CV recruteur, clôturé à tort)
**Spec** : `.agent_context/specs/GUIC-485-detail-candidature-cv.md`

## Périmètre (validé 2026-07-02)
- Pipeline candidatures filtrable par statut (`?statut=`) + carte « À examiner » → `?statut=En_attente`.
- Détail candidature `/recruteur/candidatures/[id]` : identité + **coordonnées (email/tél)** + lettre + offre + statut.
- **CV recruteur** : `GET /api/recruteur/candidatures/[id]/cv` (ownership org + audit CDP + proxyPrivateBlob).
- **Actions statut** : Vue / Retenue / Refusée (gardée + ownership + audit). Auto-Vue à l'ouverture.
- CDP : accès coordonnées + CV journalisés (`auditPiiAccess`).

## Avancement
- [x] Fetch + enrichissement GUIC-485 ; GUIC-230 rouvert + commenté ; branche créée
- [x] TDD RED→GREEN : `tests/unit/recruteur-candidature-actions.test.ts` (5/5)
- [x] AuditAction : `candidature.statut` / `candidature.cv.read` / `candidature.pii.view`
- [x] Loader `getRecruteurCandidatureDetail` + filtre statut sur la liste
- [x] Endpoint CV recruteur (ownership org + audit CDP)
- [x] Action `changerStatutCandidature` (GREEN)
- [x] Détail page + StatutActions + filtre liste + lien dashboard
- [x] tsc 0 · eslint clean
- [ ] PR → dev → Jira Revue
