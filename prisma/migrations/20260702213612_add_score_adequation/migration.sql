-- GUIC-487 (US-5) — score d'adéquation candidat/offre (IA Groq).
ALTER TABLE `candidatures`
    ADD COLUMN `score_adequation` INTEGER NULL,
    ADD COLUMN `score_raison` TEXT NULL,
    ADD COLUMN `score_calcule_le` DATETIME(3) NULL;
