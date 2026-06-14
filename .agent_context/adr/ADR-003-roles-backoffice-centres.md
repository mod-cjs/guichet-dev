# ADR-003 — Rôles backoffice centres : whitelist MVP, RBAC SSO Sprint+2

**Date** : 2026-06-14
**Statut** : Accepté (verrouille spec M4-centres-lot7.md §8 + Wave 6 W6 MVP)
**Décideurs** : PO + lead orchestrateur
**Liens** : ADR-001 (réutilisation `AgentCentre`/`RoleAgent`), GUIC-387, GUIC-395

---

## Contexte

Le Lot 7 W6 introduit un backoffice `/centre-staff/*` opéré par le personnel
physique des centres (conseillers, directeurs). Trois besoins concurrents
émergent :

1. **Sécurité** : un conseiller du CJS Dakar ne doit pas voir/agir sur les
   réservations du CJS Thiès. Cloisonnement strict par `centreId`.
2. **Granularité fonctionnelle** : le check-in QR est une action quotidienne
   de conseiller ; l'annulation post-validation engage le centre (responsabilité
   directeur) ; les analytics cross-centres relèvent du superviseur Guichet.
3. **Time-to-market** : Sprint MVP, l'infra SSO CJS (`cjs_auth/`) ne dispose
   pas encore d'un claim `roles[]` cartographié sur les rôles backoffice
   centres. La fédération RBAC est planifiée Sprint+2.

Le schéma Prisma porte déjà :
- `model AgentCentre(cjsUid, centreId, role)` (cf ADR-001)
- `enum RoleAgent { conseiller, directeur, admin_centre }`

Mais la **session staff actuelle** n'utilise pas encore ces données : c'est un
cookie JWT autonome signé par `STAFF_SESSION_SECRET`, populé via une whitelist
d'emails (`CONSEILLER_STAFF_EMAILS`).

## Décision

**Phase 1 (MVP — actuel) : whitelist email + cookie staff autonome.**

- Auth : POST `/api/staff/login` → vérification `isAllowedStaffEmail()` →
  cookie httpOnly `centre_staff_session` (HS256, 12h) contenant `{ email, centreId }`.
- Périmètre **mono-rôle** : tout email whitelisté est implicitement `conseiller`
  + `directeur` (peut check-in ET annuler). Pas de différenciation MVP.
- Cloisonnement : `centreId` figé dans le cookie à la connexion ; **toutes** les
  routes `/api/centre-staff/[centreId]/*` vérifient `staff.centreId === [centreId]`.

**Phase 2 (Sprint+1) : `AgentCentre` + `RoleAgent` ré-utilisés en lecture.**

- Le login staff lit `prisma.agentCentre.findFirst({ where: { email, … } })`
  pour récupérer `role`.
- Le cookie JWT embarque `{ email, centreId, role }`.
- Middlewares d'autorisation par route :

  | Route                                                | conseiller | directeur | admin_centre |
  |------------------------------------------------------|:----------:|:---------:|:------------:|
  | `GET /centre-staff/reservations`                     | ✓          | ✓         | ✓            |
  | `POST /api/v1/checkin/[token]`                       | ✓          | ✓         | ✓            |
  | `POST /api/centre-staff/[centreId]/reservations/[id]/cancel` | ✗  | ✓         | ✓            |
  | `POST /api/centre-staff/[centreId]/ressources` (CRUD)| ✗          | ✓         | ✓            |
  | `GET /centre-staff/analytics`                        | ✗          | ✗         | ✓            |
  | `GET /admin/analytics/centres` (cross-centres)       | ✗          | ✗         | ✗ (Admin Guichet SSO global) |

- Le **rôle global "Admin Guichet"** reste géré par le SSO CJS (claim `roles`
  contenant `guichet_admin`) — totalement indépendant du backoffice centre.

**Phase 3 (Sprint+2) : RBAC SSO fédéré.**

- Suppression complète de `CONSEILLER_STAFF_EMAILS` + `STAFF_SESSION_SECRET`.
- Le cookie SSO `cjs_session` porte les claims `centres[]` et `roles[]`.
- Plus de cookie dédié staff → unification UX (connexion unique CJS).
- Migration progressive : le cookie staff reste accepté pendant 2 sprints
  (compat) puis supprimé.

## Alternatives évaluées

| Option | Pour | Contre | Retenu ? |
|---|---|---|---|
| **Keycloak** | RBAC mature, console admin | Infra à provisionner, surcoût 1 instance, courbe d'apprentissage équipe | Non — overkill MVP |
| **Auth0 / Clerk SaaS** | Setup rapide, UI prête | Coût mensuel (~$240/mois 1000 MAU), souveraineté données (CDP Sénégal exige hébergement local) | Non — incompatible CDP |
| **Étendre SSO CJS dès MVP** | Pas de dette, chemin final direct | Bloque W6 sur planning équipe `cjs_auth` (Sprint+2 confirmé) | Non — chemin critique |
| **Whitelist email + cookie autonome** | 0 dépendance externe, livrable MVP en 2j, réversible | Pas de granularité de rôle, gestion manuelle des emails | **Oui — Phase 1** |
| **Header HTTP `X-Staff-Email` (BasicAuth proxy nginx)** | Aucun code applicatif | Pas de session, pas de logout, pas d'audit | Non — non-conforme audit CDP |

## Conséquences

### Positives

- **Livrabilité MVP** : aucun blocker SSO, Wave 6 démarre immédiatement.
- **Cloisonnement strict** : `centreId` dans cookie + double-check route =
  défense en profondeur (un cookie volé inter-centres reste invalide).
- **Réversibilité** : la Phase 3 supprime du code, n'en ajoute pas (suppression
  de `staff-session.ts` + `staff/login` quand SSO étendu).
- **Auditabilité** : `staff.email` loggé sur chaque action sensible
  (check-in, cancel) → traçabilité conforme CDP.

### Négatives / Dette assumée

- **Pas de RBAC fin MVP** : un conseiller peut techniquement annuler une
  réservation. Mitigation Sprint+1 par check `role` côté route + UI.
- **Gestion manuelle de la whitelist** : un opérateur Guichet doit éditer
  `CONSEILLER_STAFF_EMAILS` à chaque arrivée/départ. Acceptable < 10 centres
  pilote, intenable > 50 centres → **gating obligatoire** sur la Phase 3.
- **Pas de logout idle** : 12h de session, pas de SSO-logout-channel. Mitigation
  Phase 3 (next-auth gère le SLO).
- **Secret partagé** : `STAFF_SESSION_SECRET` rotation manuelle. Documenter dans
  runbook `docs/ops/secrets-rotation.md`.

### Risques résiduels

- Si `STAFF_SESSION_SECRET` fuite : tous les cookies staff actifs deviennent
  forgeables. Mitigation : monitoring accès `/centre-staff/login`,
  rate-limit IP, alerte Slack sur > 10 logins/min depuis un même /24.
- Si la whitelist contient une typo (email mal saisi) : le staff ne peut pas
  se connecter mais aucun risque de fuite — fail-closed correct.

## Métriques de succès Phase 1

- Zéro incident d'inter-centres (tentative + succès).
- Temps moyen check-in QR < 3s end-to-end.
- < 5 demandes/semaine de support pour "je ne peux pas me connecter".

## Migration check-list Phase 2 → 3

1. `cjs_auth` livre claim `roles[]` + `centres[]` (Sprint+2 W2).
2. Adapter `getStaffSession()` pour lire en priorité le cookie SSO.
3. Mode dual-cookie 1 sprint (compat).
4. Suppression `staff-session.ts` + route `/centre-staff/login`.
5. Communication centres pilote 2 semaines avant cut-off.

## Liens

- Spec : `.agent_context/specs/M4-centres-lot7.md` (§8)
- ADR-001 : réutilisation `AgentCentre` / `RoleAgent`
- ADR-002 : QR JWT rotatif (interaction avec auth staff)
- Tickets : GUIC-387 (login staff), GUIC-395 (cancel staff)
