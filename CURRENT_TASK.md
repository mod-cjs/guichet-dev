# CURRENT_TASK — GUIC-488 Notifications recruteur (US-6)

**Branche** : `feature/GUIC-488-notifications-recruteur` (depuis dev)
**Épic** : GUIC-9 · **Spec** : `.agent_context/specs/GUIC-488-notifications-recruteur.md`

## Décision
Réutilise l'infra notif existante (`Notification`, `loadNotifications`, `NotificationsClient`).
« Rappel d'entretien » différé (pas de modèle Entretien). Messages déjà notifiés (messagerie).

## Avancement
- [x] Fetch GUIC-488 + branche
- [x] TDD 5/5 : `notif-recruteur-candidature.test.ts`
- [x] Helper `notifyRecruteurNouvelleCandidature` (recruteurUid → fallback org.cjsUid)
- [x] Wire dans `POST /api/candidatures` (after())
- [x] Page `/recruteur/notifications` (NotificationsClient réutilisé)
- [x] Cloche + badge non-lus dans le TopBar recruteur
- [x] tsc 0 · eslint clean
- [ ] PR → Jira Revue
