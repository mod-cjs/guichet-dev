# CURRENT_TASK — Yaye Lot 2 : Connexion réservation de ressources (GUIC-273)

**Branche** : `feature/GUIC-273-yaye-reserve-resource` (stack sur `feature/GUIC-259-yaye-knowledge-graph` — le Lot 1 n'est pas encore mergé sur `dev` et partage `tools.ts`/`agent.ts`)
**Ticket** : GUIC-273 « Réservation de ressources (salles et véhicules) », epic GUIC-258 « Gestion des centres »
**Spec** : `.agent_context/specs/yaye/11-fonctionnalites.md` §F4 · roadmap `09` Lot 2 · suivi `12`

## Périmètre acté (PO)
- **Le système de réservation EXISTE déjà** (m4-centres) : `POST /api/reservations` (validation Zod, transaction Serializable anti-double-booking, conflit créneau, capacité, justif), UI staff/jeune, cron batch, notifications.
- **Le Lot 2 = brancher Yaye dessus, SANS modifier le service existant** (consigne explicite : « utilise-le comme il est fait »).

## Fait
- `src/lib/ia/reservations-gateway.ts` — passerelle qui invoque l'endpoint **EXISTANT** en process en propageant le cookie de session. **Aucune logique métier dupliquée**, service inchangé. Hors contexte authentifié (WhatsApp) → 401 → fallback web.
- `src/lib/ia/tools.ts` :
  - `get_reservable_resources` (lecture seule) — salles/véhicules de la **région du bénéficiaire** + liens profonds `/centres/[slug]/ressources/[id]/reserver`.
  - `reserve_resource` — **2 temps** : `confirm=false` → récapitulatif (aucune écriture) ; `confirm=true` → écriture via la passerelle, après accord explicite. Fallback lien web si non authentifié.
  - Enregistrés dans `TOOLS`.
- `src/lib/ia/agent.ts` — system prompt : collecte séquentielle (date → créneau → nb personnes → motif ≥20 → récap → confirmation) + interdiction de réserver sans accord.
- `tests/unit/yaye-reserve-resource.test.ts` — 8 tests (récap, confirm, fallback web, erreurs métier, args incomplets, ressource introuvable). Suite Yaye : 134 verts.

## Volontairement HORS périmètre (exigerait de modifier le service existant)
- Véhicule `EnAttente` + restriction géo (`region bénéficiaire = zone centre`, sous-tâche GUIC-338) → aujourd'hui l'endpoint auto-valide tout en `Acceptee`.
- Idempotence dédiée + notifications réelles (SMS/email) — stubs côté service.
→ À porter dans `POST /api/reservations` quand le PO autorisera à toucher le service.

## Décision JIRA proposée (à valider)
- GUIC-336 (modèle données) et GUIC-337 (salle auto-validée) = **déjà faits** dans le code → passer « À valider/Fini ».
- GUIC-338 (véhicule géo+validation) = reste à faire **dans le service** (hors périmètre actuel).
- GUIC-339 (collecte séquentielle) = livré côté Yaye (web + prompt).
