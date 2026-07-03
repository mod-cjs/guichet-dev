# Spec — M8 · Espace conseiller (Lot 8)

**Epic :** [GUIC-470](https://consortiumjeunesse.atlassian.net/browse/GUIC-470) · **Module :** m8-admin (back-office) · **Réf design :** `design-guichet-v4/agent-*.jsx` + `Lot 8 - Espace Conseiller.html`
**Statut spec :** validée (démarrage 2026-07-03) · **Persona démo :** Cheikh Ndiaye · conseiller emploi · CJS Tambacounda

---

## 1. Contexte & rôle

Le **conseiller** = personnel des centres / campus managers (source : sprint planning 29 juin 2026). Il **crée et manipule de la ressource sous validation de l'administrateur** : rédige des publications, gère certaines ressources de centre sur place, valide des réservations. L'administrateur garde le regard le plus élevé (validation, création réservée).

C'est un **espace back-office distinct** du bénéficiaire, identité visuelle **teal foncé** (`--gj-ink-teal #0A2820`), accent doré (`--gj-yellow`), actif = `--gj-teal`.

## 2. Décisions d'architecture (tranchées)

| Sujet | Décision | Justification |
|-------|----------|---------------|
| **Authentification** | **SSO CJS** (`getSession()` de `@/lib/auth`), **pas de login local** | Règle absolue CLAUDE.md ; le stopgap `centre-staff` (JWT MVP) porte le commentaire « à remplacer par SSO conseiller Sprint+1 » |
| **Autorisation / périmètre** | Membre de **`AgentCentre`** (`cjsUid` ↔ `centreId`, enum `RoleAgent`). Toutes les données sont **scopées au(x) centre(s)** de rattachement | Modèle déjà en base, `@@unique([cjsUid, centreId])` |
| **Rôle applicatif** | Accès si l'utilisateur a ≥1 ligne `AgentCentre` (le rôle `Utilisateur.role` n'est pas requis) | `AgentCentre` est la source de vérité conseiller↔centre |
| **Multi-centre** | Un conseiller peut être rattaché à plusieurs centres → sélection du centre actif (défaut : premier). MVP Phase 1 : premier centre | `findMany` sur AgentCentre |
| **Réservations** | Réutiliser le modèle **`Reservation`** (statut, decisionA, raisonRefusOuAnnul, index `[centreId, statut, dateReservee]`) | Déjà complet, aucun nouveau modèle |
| **Check-in QR** | Réutiliser l'existant **`CheckIn`** + scanner livré ([GUIC-387](https://consortiumjeunesse.atlassian.net/browse/GUIC-387)) | Ne pas recréer |
| **Agenda / RDV (US-5)** | **Dérivé de l'existant** — `Evenement`/`CentreEvent` (ateliers collectifs) + `Reservation` (créneaux) du jour, **aucun modèle `RendezVous` créé** | Décision produit 2026-07-03 : éviter une migration ; les RDV 1-à-1 formels seront modélisés plus tard si besoin |
| **`centre-staff`** | Cet espace SSO **remplace à terme** `/centre-staff` (JWT MVP). Migration progressive, pas de suppression en Phase 1 | Éviter la régression sur le scanner en prod |

## 3. Périmètre (mapping US → écrans)

Route racine : **`/conseiller`** (route group SSO-guardée).

| US | Ticket | Écran / élément | Phase |
|----|--------|-----------------|-------|
| US-1 | [GUIC-493](https://consortiumjeunesse.atlassian.net/browse/GUIC-493) | Vue d'ensemble à la connexion : nom, date du jour, centre ; identité teal foncé | **1** |
| US-9 | [GUIC-501](https://consortiumjeunesse.atlassian.net/browse/GUIC-501) | Sidebar 8 sections, section active mise en évidence | **1** |
| US-2 | [GUIC-494](https://consortiumjeunesse.atlassian.net/browse/GUIC-494) | 4 KPI (Bénéf. actifs · Résa à valider [urgent] · RDV du jour · Candidatures du mois +variation), scopés centre, temps réel | **2** |
| US-3 | [GUIC-495](https://consortiumjeunesse.atlassian.net/browse/GUIC-495) | File des réservations à valider (type/demandeur/date/créneau + « Tout voir ») | **2** |
| US-5 | [GUIC-497](https://consortiumjeunesse.atlassian.net/browse/GUIC-497) | Timeline du jour (ateliers distingués des RDV) — **dérivée** Evenement+Reservation | **2** |
| US-4 | [GUIC-496](https://consortiumjeunesse.atlassian.net/browse/GUIC-496) | Accepter/Refuser en 1 clic → statut + notif SMS+app ; refus avec motif via écran détaillé | **3** |
| US-7 | [GUIC-499](https://consortiumjeunesse.atlassian.net/browse/GUIC-499) | Recherche bénéficiaire depuis l'en-tête (scopée centre) | **3** |
| US-8 | [GUIC-500](https://consortiumjeunesse.atlassian.net/browse/GUIC-500) | Notifications conseiller (cloche + badge) | **3** |
| US-6 | [GUIC-498](https://consortiumjeunesse.atlassian.net/browse/GUIC-498) | Accès check-in présence (scan QR) — réutilise l'existant | **4** |
| US-10 | [GUIC-502](https://consortiumjeunesse.atlassian.net/browse/GUIC-502) | Responsive mobile : KPI empilés, bottom-nav (Accueil · Résa · Scan · Messages · Plus) | **4** |

Sections connexes (hors dashboard, epic) : [GUIC-477](https://consortiumjeunesse.atlassian.net/browse/GUIC-477) publications, [GUIC-478](https://consortiumjeunesse.atlassian.net/browse/GUIC-478) ressources centre.

## 4. Navigation (US-9) — sidebar `--gj-ink-teal`

Brand « Espace conseiller » (doré) · chip user (avatar doré, nom, rôle, centre + pin). Sections :

1. **Tableau de bord** (`/conseiller`)
2. **Activité du centre** : Réservations (`/conseiller/reservations`, badge à valider) · Agenda & RDV (`/conseiller/agenda`) · Check-in présence (`/conseiller/checkin`) · Messagerie (`/conseiller/messagerie`, badge non-lus)
3. **Gestion** : Bénéficiaires (`/conseiller/beneficiaires`) · Publications (`/conseiller/publications`)
4. **Compte** : Paramètres (`/conseiller/parametres`)

Section active mise en évidence (fond `--gj-teal`). Mobile : bottom-nav 5 items, secondaire sous « Plus » (Phase 4).

## 5. Chrome (US-1) — TopBar

`AgentTopBar` : titre + sous-titre, champ « Rechercher un bénéficiaire… » (US-7), cloche notifications (US-8), bouton « Publier » (→ publications). En-tête dashboard : « Bonjour {prénom} », date du jour (fr), centre de rattachement.

## 6. Données & loaders (`src/lib/loaders/conseiller.ts`)

- `getConseillerContext(cjsUid)` → `{ prenom, nom, initials, centreId, centreNom, role, centresCount }` via `AgentCentre` (findMany) + `Centre` + `Utilisateur`. **Retourne `null` si aucune ligne AgentCentre** (→ layout redirige).
- Phase 2 : `getConseillerKpis(centreId)`, `getReservationsAValider(centreId)`, `getAgendaDuJour(centreId, date)` (dérivé).

Toutes les requêtes **filtrent par `centreId`**. Payload/pagination selon règles API (`ApiResponse<T>`, 20/page).

## 7. Sécurité

- Guard layout : `getSession()` → si absent, `redirect('/auth/connexion')` ; si `getConseillerContext` = null (pas conseiller), `redirect('/')` (ou 403).
- Aucune donnée hors centre du conseiller (défense en profondeur : filtrer côté requête, pas côté UI).
- Actions mutantes (US-4) : vérifier que la réservation appartient bien à un centre du conseiller avant `update`.

## 8. Découpage & TDD

TDD strict (RED puis GREEN par scope). Branche `feature/GUIC-<n>-espace-conseiller-<phase>` depuis `dev`.

- **Phase 1 (socle)** — US-1 + US-9 : loader contexte + guard SSO/AgentCentre + `ConseillerSidebar` + layout + page dashboard shell. Tests : guard (redirect non-conseiller), loader contexte (centre correct / null).
- **Phase 2** — US-2 + US-3 + US-5 (lecture).
- **Phase 3** — US-4 + US-7 + US-8 (interactions + notifs).
- **Phase 4** — US-6 + US-10 (terrain / mobile).

## 9. Réutilisation UI

`src/components/ui/` exclusivement, tokens `gj-*`, `<Icon name>` (jamais d'emoji/svg inline). Mirror des patterns `RecruteurSidebar` / `RecruteurLayout` / loader `recruteur.ts`.
