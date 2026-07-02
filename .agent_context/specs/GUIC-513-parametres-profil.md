# GUIC-513 — Paramètres fonctionnels + Profil entreprise éditable (recruteur)

Épic **GUIC-9** · Module **m9-recruteur** · Issu de l'audit du 2026-07-02.

## Paramètres (remplace le stub ComingSoon)
- **Mon compte** : nom/email/téléphone/rôle lus de la session SSO (lecture seule).
- **Préférences de notification** : `Utilisateur.notifCandidatures` + `notifMessages`
  (migration `add_recruteur_notif_prefs`, défaut `true`). Toggles → `modifierPreferencesNotif`.
  **Gate** : `notifyRecruteurNouvelleCandidature` (notifCandidatures) + `envoyerMessage`
  (notifMessages) sautent la Notification si la préférence du destinataire est désactivée.
- Déconnexion.

## Profil entreprise (rendu éditable)
- `modifierProfilEntreprise` : garde `recruteur` + ownership (org liée à `cjsUid`).
  Éditable : description, secteur, région, adresse, téléphone, email, siteWeb, logoUrl.
  **Non modifiables** (strippés par Zod) : `nom`, `estVerifie` (admin, GUIC-510). Audit `partenaire.update`.
- Page : en-tête (logo/nom/vérif, lecture seule) + `ProfilEntrepriseForm` pré-rempli.

## Tests (TDD) — `recruteur-parametres-profil-actions.test.ts`
prefs : garde + update 2 bool. profil : garde, NO_ORGANISATION, champs éditables (jamais nom/estVerifie), email invalide→rejet.

## DoD
Migration appliquée · `npm run validate` vert · 2 onglets fonctionnels · PR → dev · Jira Revue.
