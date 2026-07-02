-- GUIC-474 — Ajoute le type d'événement `Cours` (cours/sessions gratuites au centre).
ALTER TABLE `evenements`
  MODIFY `type` ENUM('Formation', 'Atelier', 'Forum', 'Webinar', 'Conference', 'Cours') NOT NULL;
