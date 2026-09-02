# Tâche active — GUIC-717 · Dictionnaire du Data Hub dans l'administration

> Branche : `feature/GUIC-717-datahub-dictionnaire` (depuis `dev` @ `19b6f20c`)
> Spec : `.agent_context/specs/GUIC-717-datahub-dictionnaire.md`
> ⚠ Numéro de ticket **provisoire** — le connecteur JIRA n'était pas authentifié.
> La user story à créer est en bas de la spec.

## But

Donner une surface humaine au Data Hub. `/admin/data-hub` rendait le tableau de bord
statistique ; le contrat d'export lui-même n'était lisible que dans du JSON ou via
`dbt docs`, qui suppose Docker et un accès à l'entrepôt.

## État

Livré et vérifié en réel dans le conteneur Docker reconstruit. `npm run test` vert
(4956 + 919), `tsc` propre, `lint` sans erreur, `npm run build` exit 0.

## Reste à faire

1. Confirmer ou corriger le numéro de ticket, puis renommer branche et commits.
2. Créer la user story dans JIRA (texte en bas de la spec).
3. Supprimer la ligne `datahub_runs` factice publiée en local pour tester le script.
