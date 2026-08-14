# Tâche active — GUIC-706 · Lancement séquentiel (feature flags)

> Branche : `feature/GUIC-706-feature-flags-lancement-sequentiel` (depuis `dev` @ `fa78e9e3`)
> Spec : `.agent_context/specs/GUIC-706-feature-flags.md` (12 sections)
> Ticket : https://consortiumjeunesse.atlassian.net/browse/GUIC-706

## But

Permettre à l'admin national d'ouvrir et de masquer chaque fonctionnalité **pour les
utilisateurs**, depuis un onglet dédié, sans redéploiement. 31 flags, 8 lots.

## Les trois règles qui gouvernent tout le code

1. **Le flag ferme les utilisateurs, jamais l'administration.** La console admin n'est
   jamais fermée ; `ADMIN_ROLES` est exempté du gate sur les routes utilisateur (avec
   bandeau de prévisualisation). Conseiller et recruteur **ne sont pas** exemptés.
2. **Invisibilité, pas indisponibilité.** Une route masquée renvoie un **404 indiscernable
   d'une route inexistante**. Jamais de « Bientôt disponible », jamais de `403`, jamais le
   nom du flag dans une réponse. Un module masqué produit **l'absence de la section**,
   jamais une section vide.
3. **Un flag ne ferme que la face consommateur** (`closes`). Le recruteur continue de
   publier et le conseiller de préparer pendant que le module est masqué aux bénéficiaires
   — c'est la chaîne de préparation que le lancement séquentiel doit servir.

## Ligne de base mesurée (2026-08-14, `dev` @ `fa78e9e3`)

```text
npx jest --no-coverage   →  648 suites · 5 211 tests · 100 % vert · 20 s
npx tsc --noEmit         →  0 erreur
npm run lint             →  0 erreur · 7 avertissements préexistants
```

À revérifier **après chaque lot** : tout écart aux 5 211 est imputable au lot en cours.

## Avancement

- [x] Lot 0 — ligne de base + mock global inerte
- [ ] Lot 1 — Prisma · catalogue · service (cache versionné)
- [ ] Lot 2 — API admin · RBAC dédiée · page · compteurs · export/import
- [ ] Lot 3 — middleware · layouts · 9 navs · sitemap
- [ ] Lot 4 — 12 actions utilisateur · API · 11 crons · 6 webhooks
- [ ] Lot 5 — invisibilité : 9 surfaces d'incidence
- [ ] Lot 6 — transitions : `drain`, engagements, checklist, note de service
- [ ] Lot 7 — absorption de `NOTIFICATIONS_ENABLED` · runbook

## Décisions produit encore à valider (n'empêchent pas les lots 0–2)

- Tableau des faces d'audience (spec §5.4)
- Découpage IA en 6 flags (spec §6.3)
- Répartition `sec` / `drain` (spec §7.1)

## Points de vigilance permanents

- `src/middleware.ts:42` sort **avant** le gate → sans correction, aucune route publique
  n'est filtrée.
- Les pages publiques ne sont dynamiques que parce que `(public)/layout.tsx` appelle
  `getSession()`. Retirer cet appel neutraliserait silencieusement tous les flags.
- `ADMIN_ROLES` contient `moderator` : l'**écriture** des flags passe par
  `src/lib/flags/rbac.ts`, jamais par `isAdminRole`.
- `AuditAction` est une union fermée (`src/lib/audit.ts:19`).
- Environnement de test : stack Docker + `/api/dev/login`. Comptes admin
  `ad100000-0000-4000-8000-000000000001`, conseiller `c05e111e-0000-4000-8000-000000000001`,
  recruteur `2c518498-b876-4b43-946e-54afccd077fd`, bénéficiaire par défaut.
  **Rebuild `--build` obligatoire après tout changement de code.**
