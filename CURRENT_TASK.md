# CURRENT_TASK — Espace conseiller · Phase 1 (socle)

**Epic :** [GUIC-470](https://consortiumjeunesse.atlassian.net/browse/GUIC-470) · **Branche :** `feature/GUIC-493-espace-conseiller-socle` (depuis `dev`)
**Spec :** `.agent_context/specs/M8-espace-conseiller.md`

## Périmètre de cette branche

- **US-1** [GUIC-493](https://consortiumjeunesse.atlassian.net/browse/GUIC-493) — Vue d'ensemble à la connexion (nom, date, centre, identité teal foncé)
- **US-9** [GUIC-501](https://consortiumjeunesse.atlassian.net/browse/GUIC-501) — Navigation latérale (8 sections, actif mis en évidence)

## Livré

- `src/lib/loaders/conseiller.ts` — contexte SSO + `AgentCentre` (scopé centre) ; helpers purs `buildInitials` / `pickActiveCentre`.
- `src/lib/loaders/conseiller.test.ts` — tests unitaires (RED→GREEN).
- `src/components/layout/ConseillerSidebar/index.tsx` — sidebar `--gj-ink-teal`, 8 items, drawer mobile.
- `src/app/conseiller/layout.tsx` — guard SSO + AgentCentre + topbar.
- `src/app/conseiller/page.tsx` — dashboard shell (en-tête US-1 + emplacements KPI/réservations/agenda).

## Décisions

- Auth = **SSO** (pas de login local) ; autorisation = rattachement `AgentCentre`.
- Agenda (US-5) = **dérivé** de `Evenement`/`CentreEvent` + `Reservation` (aucun modèle `RendezVous`).
- `/conseiller` **remplacera** à terme `/centre-staff` (JWT MVP).

## Phase 2 — Dashboard lecture (fidèle v4) ✅

- Loaders réels scopés centre : `getConseillerKpis` (US-2), `getReservationsAValider` (US-3), `getAgendaDuJour` **dérivé** Réservation+Événement (US-5), `countReservationsAValider`. Helpers purs testés (`mapRessourceKind`, `buildAgendaItems`).
- Composants fidèles `agent-web.jsx` : `dashboard-kpis.tsx` (4 cartes, carte urgente ACTION), `reservations-a-valider.tsx`, `agenda-du-jour.tsx` (timeline, ateliers distingués).
- **US-4 (cœur)** : action serveur `deciderReservation` (accepter/refuser → statut + `decisionA` + Notification app ; contrôle périmètre centre). SMS = TODO (canal transactionnel à venir).
- Badges sidebar branchés (réservations à valider + messages non lus).

## Phase 3 — Réservations (écran complet) + Notifications ✅

- **`/conseiller/reservations`** (US-3/US-4) : onglets Toutes/À valider/Acceptées/Refusées (server-driven `?tab=`), lignes détaillées fidèles `ResaActionRow` (ressource, statut, demandeur, méta date/créneau/pers./justif, motif), validation accepter (message facultatif) / refuser (motif) en modale → `deciderReservation`.
- Loaders : `getReservationsCounts`, `getReservationsListe`, helper pur `mapStatutView` (testé). `ageRelatifLabel` réutilisé.
- **`/conseiller/notifications`** (US-8) : réutilise `loadNotifications` + `NotificationsClient` ; badge cloche (desktop + mobile) via `countUnreadNotifications`.

## Reste à faire (phases suivantes)

- **US-7 recherche bénéficiaire** : l'input topbar est visuel — à câbler sur l'écran Bénéficiaires (`/conseiller/beneficiaires`, à créer).
- **US-4 SMS** : notif app faite, SMS en attente d'un canal transactionnel.
- « Proposer un créneau » (slots) : nécessite la dispo des ressources — non implémenté (accepter/refuser couvrent la décision).
- **Phase 4** : US-6 (check-in QR réutilisé), US-10 (responsive + bottom-nav).
- Écrans secondaires : agenda complet, bénéficiaires, messagerie, publications, paramètres.
