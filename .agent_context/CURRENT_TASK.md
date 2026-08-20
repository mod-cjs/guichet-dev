# Tâche active — GUIC-712 · Bandeau cookies (consentement CDP)

> Branche : `feature/GUIC-712-bandeau-cookies` (depuis `dev` @ `70bb72ae`)
> Spec : `.agent_context/specs/GUIC-712-bandeau-cookies.md`
> Ticket : https://consortiumjeunesse.atlassian.net/browse/GUIC-712

## But

Rendre vrai l'Article 7 de la politique de confidentialité, qui promet en production un
bandeau de consentement qui n'existe pas. L'utilisateur doit pouvoir accepter ou refuser
les cookies non essentiels, depuis les quatre espaces, et revenir sur son choix.

## Les trois règles qui gouvernent ce code

1. **Ne jamais proposer un choix qui n'en est pas un.** Les cookies essentiels sont
   rendus en état verrouillé, pas en case à cocher — et le décodeur force
   `essentiels: true` même si le cookie est forgé à la main.
2. **Refuser coûte exactement un clic, comme accepter.** Deux boutons de même poids.
   Aucune case pré-cochée. Pas de croix de fermeture : fermer sans choisir ne vaut pas
   acceptation, donc on ne peut pas fermer sans choisir.
3. **La garde est technique, pas documentaire.** Aucun traceur ne peut se charger sans
   consentement, et un test casse si l'un apparaît dans `src/` sans passer par la garde.

## État des lieux

Deux cookies posés, tous deux httpOnly et strictement nécessaires : `cjs_session`,
`centre_staff_session`. **Aucun traceur tiers.** Les 18 usages de `localStorage` sont
fonctionnels (a11y, thème admin, brouillons). Le bandeau ne livre donc pas un choix fictif :
il livre le mécanisme et la garde, la catégorie « mesure d'audience » restant inerte tant
qu'aucun outil n'est configuré.

## Découpage TDD

| Lot | RED | GREEN | État |
|---|---|---|---|
| 1 | `consent-domaine.test.ts` | `src/lib/consent/*` | en cours |
| 2 | `consent-bandeau.test.tsx` | `CookieConsent`, `PreferencesCookies` | à faire |
| 3 | `consent-garde-traceurs.test.ts` | `MesureAudience` + non-régression | à faire |
| 4 | `consent-page-cookies.test.tsx` | `/legal/cookies` + Article 7 | à faire |

## En attente de réponse PO

L'Article 7 déclare des « cookies de mesure d'audience — 13 mois » alors qu'aucun outil
n'est installé. Selon qu'une mesure est prévue ou non, le texte est anticipatif ou
sur-déclarant. Le code est écrit pour que les deux restent possibles ; seul le texte
dépend de la réponse. Voir §8 de la spec.
