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

## Résolutions (2026-07-03)

- **Réservations auto-validées** → politique par type (`src/lib/reservations/statut-initial.ts`) : salle/véhicule/atelier `EnAttente`, poste/équipement `Acceptee`. Appliquée dans `POST /api/reservations`. → la file conseiller se remplit réellement.
- **Définitions KPI arrêtées** (spec §6b) : bénéficiaires actifs = check-in glissant 90 j.

## US-7 — Recherche + Bénéficiaires ✅

- Loader `getCentreBeneficiaires(centreId, q?)` (annuaire scopé centre, recherche par nom) + helpers purs testés `ageFromBirthdate`, `benefStatut`.
- **`/conseiller/beneficiaires`** : tableau fidèle `AgentBenefList` (avatar+méta, commune, dernière visite, anneau de complétion, statut) + recherche `?q=`.
- Barre de recherche du topbar câblée → `/conseiller/beneficiaires?q=` (US-7 fonctionnel).

## Phase 4 — Terrain / mobile ✅

- **US-6** `/conseiller/checkin` : présence du jour (réutilise `CheckIn`) + accès au scan (caméra native → `/checkin/v1/<jeton>`). Loader `getCheckinsDuJour`.
- **US-10** `ConseillerBottomNav` (Accueil · Résa · Scan · Messages · Plus) mobile, sheet « Plus » (Agenda, Bénéficiaires, Publications, Notifications, Paramètres). Sidebar passée en desktop-only ; `pb` bottom-nav sur le contenu.

## Jira

Épic + US-1/2/3/4/5/7/8/9 passées à **En cours** (2026-07-03) + commentaire de suivi sur GUIC-470.

## Corrections des éléments non fonctionnels ✅ (2026-07-03)

1. **Fiche bénéficiaire** détaillée + lignes cliquables (`/conseiller/beneficiaires/[cjsUid]`).
2. **Proposer un créneau** (réservations) — action + modale, refuse avec créneau alternatif notifié.
3. **Voir le justificatif** — lien vers le fichier joint.
4. **Filtrer** (statut) + **Exporter** CSV (annuaire bénéficiaires).
5. **Centre d'aide** — page `/conseiller/aide` + lien sidebar.
6. **Sélecteur multi-centre** — cookie + `setActiveCentre`, sidebar + paramètres.
7. **Check-in SSO** — opérateur unifié staff **ou** conseiller sur `/checkin/v1/[token]`.
8. **Agenda multi-vues** — Jour / Semaine / Mois.

## Reste (hors périmètre — service externe requis)

- **US-4 SMS / WhatsApp proactif** : notif in-app livrée ; le SMS nécessite un fournisseur externe (Orange) ou un template Meta approuvé — non intégré (cf. spec §6a). Point d'insertion : `notifyReservation()`.
- **Publications** (GUIC-477) : ticket séparé.
- Réglages avancés paramètres (préférences notifs, disponibilités).
