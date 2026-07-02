# GUIC-488 — Notifications recruteur (US-6)

Épic **GUIC-9** · Module **m9-recruteur**

## AC
- Cloche avec compteur de non-lus dans le chrome recruteur.
- Inclut : **nouvelle candidature**, **message d'un jeune** (déjà fait via messagerie), rappel d'entretien.

## Décision
- **Réutilise** l'infra notif existante (`Notification` model, `loadNotifications`,
  `countUnreadNotifications`, `NotificationsClient`) — cjsUid-based, agnostique du rôle.
- **Rappel d'entretien** = **différé** (aucun modèle Entretien).

## Livrables
1. Helper `notifyRecruteurNouvelleCandidature(opportuniteId, candidatNom)`
   (`src/lib/notifications/recruteur.ts`) : résout le recruteur destinataire
   (`Opportunite.recruteurUid` sinon `org.cjsUid`) → crée une `Notification` in-app
   type `Candidature`, lien `/recruteur/candidatures?statut=En_attente`. Fail-soft.
2. **Wire** dans `POST /api/candidatures` (bloc `after()`, post-réponse, non-bloquant).
3. Page `/recruteur/notifications` : `loadNotifications(cjsUid)` + `NotificationsClient`.
4. **Cloche** dans le TopBar recruteur (layout) : lien + badge non-lus (`countUnreadNotifications`).

Les notifications **Message** sont déjà créées par la messagerie (GUIC-132).

## Tests (TDD) — `tests/unit/notif-recruteur-candidature.test.ts`
dest = recruteurUid prioritaire · fallback org.cjsUid · opp introuvable → no-op · aucun dest → no-op.

## DoD
`npm run validate` vert · cloche + page + notif candidature · PR → dev · Jira Revue.
