-- GUIC-395 — Ajoute le statut `AnnuleeParCentre` à l'enum `StatutReservation`.
-- Endpoint /api/centre-staff/[centreId]/reservations/[id]/cancel utilise désormais
-- ce statut propre au lieu du fallback `AnnuleeParJeune` + raison.

ALTER TABLE `reservations`
  MODIFY COLUMN `statut` ENUM(
    'EnAttente',
    'Acceptee',
    'Refusee',
    'AnnuleeParJeune',
    'AnnuleeParCentre',
    'Passee',
    'NonHonoree'
  ) NOT NULL DEFAULT 'Acceptee';
