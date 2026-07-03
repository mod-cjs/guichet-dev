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

## Reste à faire (phases suivantes)

- **Phase 2** : US-2 (KPI temps réel), US-3 (file réservations), US-5 (agenda dérivé).
- **Phase 3** : US-4 (accepter/refuser + notif), US-7 (recherche bénéf.), US-8 (notifications).
- **Phase 4** : US-6 (check-in QR réutilisé), US-10 (responsive + bottom-nav).
