-- Phase 2 — priorisation des signalements de danger Yaye.
-- Colonne de catégorie de danger + priorité de file, et index de tri (danger d'abord).
ALTER TABLE `escalades_yaye`
  ADD COLUMN `signal_danger` VARCHAR(40) NULL,
  ADD COLUMN `priorite` INT NOT NULL DEFAULT 0;

-- Remplace l'index de tri par un index incluant la priorité (statut, puis danger, puis ancienneté).
DROP INDEX `escalades_yaye_statut_created_at_idx` ON `escalades_yaye`;
CREATE INDEX `escalades_yaye_statut_priorite_created_at_idx` ON `escalades_yaye`(`statut`, `priorite`, `created_at`);
