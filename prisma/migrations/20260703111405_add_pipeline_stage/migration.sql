-- GUIC-515 — étape pipeline recruteur (kanban) + favori.
ALTER TABLE `candidatures`
    ADD COLUMN `pipeline_stage` ENUM('Recue', 'Preselection', 'Entretien', 'Decision') NOT NULL DEFAULT 'Recue',
    ADD COLUMN `favori_recruteur` BOOLEAN NOT NULL DEFAULT false;

-- Backfill cohérent depuis le statut jeune.
UPDATE `candidatures` SET `pipeline_stage` = CASE
    WHEN `statut` = 'En_attente' THEN 'Recue'
    WHEN `statut` = 'Vue' THEN 'Preselection'
    ELSE 'Decision' END;

-- Les candidatures ayant un entretien planifié vont en colonne Entretien.
UPDATE `candidatures` c SET c.`pipeline_stage` = 'Entretien'
    WHERE EXISTS (SELECT 1 FROM `entretiens` e WHERE e.`candidature_id` = c.`id` AND e.`statut` = 'Planifie');
