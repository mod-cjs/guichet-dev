# CURRENT_TASK — GUIC-472 · Découplage analytics événements ↔ fréquentation centres

**Branche :** `feature/GUIC-472-decouplage-analytics` (depuis `dev`)
**Ticket :** GUIC-472 (En cours) — `Closes GUIC-472`. GUIC-474 (badge-présence) = suivi, hors périmètre.
**Spec :** `.agent_context/specs/GUIC-472-decouplage-analytics.md`

## Décisions
- GUIC-472 seul. Page analytics événements dédiée + export séparé + nav distincte. Admin-only. **Pas de migration.**

## Constat clé
Les modèles/loaders étaient DÉJÀ séparés (`CheckIn`/`Reservation` vs `InscriptionEvenement`, aucune requête
jointe). Le mélange était présentation : pas de destination analytics dédiée aux événements. Le découplage
livré = deux destinations + deux exports + deux entrées de nav distinctes.

## Livré
- **Loader** `src/lib/loaders/evenements-analytics.ts` — agrège événements/inscriptions (total, par type/statut,
  taux présence = present/confirmés, participants uniques, remplissage, top centres, tendance). Ne lit JAMAIS `CheckIn`.
- **Page** `/admin/analytics/evenements` + client (KPI, répartitions, filtres période/centre, bouton export).
- **Export CSV** `/api/admin/analytics/evenements/export` (jeu distinct ; garde admin + rate-limit + CSV-injection guard) → action audit `export.evenements`.
- **Nav** : « Analytics centres » → **« Fréquentation centres »** (clarification check-ins) + nouvelle entrée **« Analytics événements »**.

## Vérifié
- `tsc` 0 · `eslint` 0 (touchés). Unit/component : **262 suites / 1855 verts** (0 régression).
  Nouveaux : loader (4), export (3), client (3), sidebar (renommage + nouvelle entrée).
- Smoke live : `/admin/analytics/evenements` → 200 ; export → 200 (text/csv + filename).

## Reste
- [ ] Packaging PR vers `dev` (`Closes GUIC-472`).
- [ ] (Suivi) GUIC-474 : type cours/session + présence par badge (écrit `InscriptionEvenement.present`).
