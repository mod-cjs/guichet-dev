# CURRENT_TASK — GUIC-474 · Cours/sessions au centre + présence par badge

**Branche :** `feature/GUIC-474-presence-badge` (depuis `dev`)
**Ticket :** GUIC-474 (En cours) — `Closes GUIC-474`. Complète le cluster C (writer du `present` que GUIC-472 lit).
**Spec :** `.agent_context/specs/GUIC-474-presence-badge.md`

## Décisions
- Étendre le scan badge existant (+ fallback admin manuel). Ajouter `Cours` à `TypeEvenement` (migration). Walk-ins autorisés (upsert).

## Constat
`StatutInscription.present` existait, lu par les analytics GUIC-472, mais AUCUN code ne l'écrivait. Le scan badge créait un `CheckIn` sans notion d'événement. Le form d'événement ne capturait pas `centreId`.

## Livré
- **Migration** `add_type_cours_evenement` (enum `TypeEvenement` + `Cours`), appliquée en base. `prisma generate`.
- **Audit** action `evenement.presence` (+ ACTION_META journal-audit).
- **Création événement** : `centreId` + `dateFin` sur le schema/form + type `Cours` ; centres threadés page → table → modale ; prefill édition (évite de nuller le centre).
- **Présence — primitives** :
  - Action admin `marquerPresenceEvenement(evenementId, cjsUid, present)` (upsert `present` / revert `inscrit`).
  - Endpoint badge `POST /api/v1/checkin/[token]/presence` (staff + garde centre, upsert walk-in).
- **UI** :
  - Page de scan : section « Cours/sessions au centre » (événements en cours) + bouton « Marquer présent » → endpoint présence.
  - Détail événement admin : `PresenceToggle` par participant (Présent ↔ Absent).

## Vérifié
- `tsc` 0 · `eslint` 0 (touchés). Unit/component : **261 suites / 1854 verts** (0 régression).
  Nouveaux : présence action+endpoint (9), form modal (3) ; tests événements existants mis à jour.
- Intégration DB réelle : Cours + présence upsert/revert **1/1**.
- Smoke live : `/admin/evenements` + détail → 200 ; endpoint présence sans staff → 401.

## Reste
- [ ] Packaging PR vers `dev` (`Closes GUIC-474`).
- [ ] (Suivi) Présence à la sortie / dwell ; scanner caméra in-app ; rôle conseiller SSO.
