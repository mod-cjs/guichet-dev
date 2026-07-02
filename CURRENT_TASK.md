# CURRENT_TASK — GUIC-132/133 Messagerie interne recruteur ↔ candidat

**Branche** : `feature/GUIC-132-messagerie-interne` (stackée sur `feature/GUIC-485-…`)
**Épic** : GUIC-9 / GUIC-32 · **Spec** : `.agent_context/specs/GUIC-132-messagerie-interne.md`

## Décisions
- Conversation **ancrée à une candidature** (consentement CDP), 2 côtés complets, pas de WS, notif in-app.

## Avancement
- [x] Branche + spec
- [x] Migration `add_messagerie_interne` (Conversation + Message) appliquée + trackée
- [x] Loaders `messagerie.ts` (inbox / conversation / countUnread)
- [x] Actions `contacterCandidat` / `envoyerMessage` / `marquerConversationLue` + Notification
- [x] TDD 8/8 (`messagerie-actions.test.ts`)
- [x] UI recruteur : inbox + thread (remplace ComingSoon) + bouton Contacter (fiche candidature)
- [x] UI jeune : inbox + thread (`jeune/(app)/messagerie`) + entrée BenefSidebar
- [x] tsc 0 · eslint clean · 8/8 tests · requêtes validées (tsc)
- [ ] PR → Jira Revue (GUIC-132/133)
