# CURRENT_TASK — GUIC-602 · US-7 Journalisation & monitoring

**Épic** : GUIC-595 · **Spec** : §4septies (validée lead 2026-07-20) · **Branche** : `feature/GUIC-602-monitoring` (stackée sur GUIC-601) · **JIRA** : En cours

## Décisions lead : seuil alerte = 3 derniers runs · page dédiée /admin/curation/monitoring · flag visuel.
## AUCUNE migration (données déjà collectées).

## Périmètre
- `src/lib/curation/monitoring/stats.ts` : statsParSource (nb rapportées, taux approbation/rejet, dernière vérif, erreurs récentes, alerte erreur_repetee/chute_zero sur 3 derniers runs) + resumeCuration (totaux + nb en alerte).
- UI : /admin/curation/monitoring (synthèse + tableau par source + bandeau alertes). Entrée sidebar.

## TDD : RED intégration MariaDB (stats correctes, détection alertes, source saine sans alerte) → GREEN.
