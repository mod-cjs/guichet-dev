# Spec — Découpler analytics événements ↔ fréquentation des centres

**Ticket :** GUIC-472 (Découpler fréquentation des centres et événements · High)
**Module :** m5-agenda × m8-admin · **Périmètre :** GUIC-472 seul (GUIC-474 badge-présence = suivi).
**Décision :** page analytics événements dédiée + export séparé + nav distincte. Admin-only. **Pas de migration.**

---

## 1. Contexte & état réel

Les données sont **déjà séparées** au niveau modèle et loader :
- Fréquentation = `CheckIn` (+ `Reservation`) → `getCentresAnalytics` ([centres-analytics.ts](../../src/lib/loaders/centres-analytics.ts)) → page `/admin/analytics/centres` + export `/api/admin/analytics/centres/export`.
- Événements = `InscriptionEvenement` (statut `inscrit`/`liste_attente`/`annule`/`present`) → stats locales dans [admin/evenements](../../src/app/admin/evenements) uniquement.
- **Aucune requête ne joint les deux** (seule FK commune : `Centre`).

Le « mélange » (cœur du ticket) est **présentation** : pas de destination analytics dédiée aux événements (les stats ne vivent que sur la page de gestion), et le dashboard co-localise « Ateliers tenus » avec les tuiles centres. Chaque jeu doit être **exportable séparément**.

## 2. Objectifs (acceptance)
1. Une **page analytics événements dédiée** `/admin/analytics/evenements`, distincte de la fréquentation centres.
2. Indicateurs événements : total, par type, par statut, inscriptions, **taux de présence** (present / confirmés), participants uniques, taux de remplissage, top centres, tendance mensuelle. **Aucune donnée de check-in.**
3. **Export CSV événements** séparé `/api/admin/analytics/evenements/export` (jeu distinct de l'export centres).
4. **Nav distincte** : « Fréquentation centres » (clarifie l'existant) + « Analytics événements » (nouveau) dans la sidebar admin.
5. Filtres cohérents avec la page centres (période `from`/`to`, `centreId`).

## 3. Modèle de données
**Aucune migration.** Réutilise `Evenement` (dateDebut/type/statut/centreId/capaciteMax) et `InscriptionEvenement` (statut/cjsUid). Enums existants : `TypeEvenement`, `StatutEvenement`, `StatutInscription`.

## 4. Loader — `src/lib/loaders/evenements-analytics.ts` (nouveau)
`getEvenementsAnalytics(filters: { from: Date; to: Date; centreIds?: string[] })` — fenêtre sur `Evenement.dateDebut`.
- `evenement.findMany` (cap 5000) select `type/statut/capaciteMax/centreId/dateDebut/centre.nom/_count.inscriptions` → agrégation JS : total, parType, parStatut, capaciteTotale, topCentres, parMois, totalInscriptions.
- `inscriptionEvenement.groupBy(['statut'])` where `evenement` dans la fenêtre → présents / confirmés / `tauxPresence`.
- `inscriptionEvenement.groupBy(['cjsUid'])` (même where) → `participantsUniques` (length).
- `tauxRemplissage = confirmés / capaciteTotale`.
Type de retour `EvenementsAnalytics` exporté. **Ne lit aucun CheckIn/Reservation.**

## 5. Page + client
- `src/app/admin/analytics/evenements/page.tsx` (server, garde admin, parse from/to/centreId comme la page centres, charge loader + liste centres actifs).
- `src/app/admin/analytics/evenements/evenements-analytics-client.tsx` (client) : filtres période + centre, bouton export, tuiles KPI (événements / inscriptions / taux présence / participants uniques), répartitions par type & statut (barres simples), top centres, tendance mensuelle. Primitives `src/components/ui/`, tokens `gj-*`, `<Icon>`.

## 6. Export — `src/app/api/admin/analytics/evenements/export/route.ts` (nouveau)
Mirroir de l'export centres (garde admin, rate-limit 5/min/cjsUid, cap 10000, `escapeCsvCell` réutilisé/dupliqué localement, CSV-injection guard).
Colonnes : `Date;Titre;Type;Statut;Centre;Inscrits;Présents;Capacité`. Fichier `evenements-analytics-<from>-<to>.csv`.

## 7. Nav — `AdminSidebar`
- Renommer l'entrée existante « Analytics centres » → **« Fréquentation centres »** (même href `/admin/analytics/centres`) pour clarifier qu'il s'agit de la fréquentation (check-ins).
- Ajouter **« Analytics événements »** → `/admin/analytics/evenements` (section Pilotage).

## 8. Dashboard
La tuile « Ateliers tenus » du tableau de bord reste (KPI d'aperçu), mais la séparation réelle est portée par les 2 destinations analytics distinctes + 2 exports. (Pas de refonte du dashboard dans ce lot.)

## 9. Sécurité & règles
Garde admin (middleware + page + route). Export rate-limité + CSV-injection guard. Pas de SQL brut. Tracking fail-soft optionnel via `trackCentreEvent` non requis pour les événements (on peut logguer un `recordAudit('export.evenements')` — optionnel, hors périmètre strict).

## 10. Tests (TDD RED→GREEN)
- **Loader** (unit, prisma mické) : agrège total/parType/parStatut, calcule tauxPresence (present/confirmés) et participantsUniques ; **ne requête jamais checkIn/reservation** (mock ne les expose pas → appel échouerait si utilisé).
- **Export** (unit) : garde admin (403 non-admin), en-tête CSV correct, escapeCsvCell neutralise `=`.
- **Client** (RTL) : rend les tuiles KPI + le bouton export ; répartitions affichées.
- **Sidebar** : entrée « Analytics événements » présente + « Fréquentation centres » (renommage).

## 11. Hors périmètre
- GUIC-474 (type cours/session + présence par badge — écrit `InscriptionEvenement.present`).
- Refonte du dashboard. Fusion des exports.

## 12. Découpage (commits TDD)
1. `test` loader → `feat` `evenements-analytics.ts`
2. `test` export → `feat` route export événements
3. `test` client + sidebar → `feat` page + client + nav (renommage centres + ajout événements)
4. `chore` validation

PR unique vers `dev` · `GUIC-472 feat: découplage analytics événements / fréquentation centres` · `Closes GUIC-472`.
