-- GUIC-689 — Retrait de candidature à l'initiative du candidat.
--
-- Ajout d'une valeur à l'ENUM `candidatures.statut`. Purement additif : aucune
-- ligne existante ne change, la valeur par défaut reste `En_attente`.
--
-- `Retiree` est volontairement DISTINCT de `Refusee` : l'un est une décision du
-- candidat, l'autre du recruteur. Les confondre fausserait les statistiques des
-- deux côtés (taux de refus recruteur, suivi de candidature côté jeune).
--
-- Écrite à la main : `prisma migrate dev` réinitialiserait la base partagée, et
-- `migrate diff` proposerait de supprimer le travail des branches parallèles.
ALTER TABLE `candidatures`
  MODIFY `statut` ENUM('En_attente','Vue','Retenue','Refusee','Retiree')
  NOT NULL DEFAULT 'En_attente';
