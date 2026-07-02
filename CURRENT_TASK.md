# CURRENT_TASK — GUIC-513 Paramètres + Profil entreprise éditable

**Branche** : `feature/GUIC-recruteur-parametres-profil` (sur #492)
**Épic** : GUIC-9 · **Spec** : `.agent_context/specs/GUIC-513-parametres-profil.md`

## Avancement
- [x] Migration `add_recruteur_notif_prefs` (2 bool sur Utilisateur) appliquée
- [x] Actions `modifierPreferencesNotif` + `modifierProfilEntreprise` (garde + ownership) — TDD 6/6
- [x] Gate notif (candidature + message) sur préférences
- [x] Page Paramètres (compte SSO + toggles + déconnexion) — remplace ComingSoon
- [x] Profil entreprise éditable (form) + en-tête admin lecture seule
- [x] tsc 0 · eslint clean
- [ ] PR → Jira Revue
