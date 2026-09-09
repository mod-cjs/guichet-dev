-- Data Hub — Fraîcheur du pipeline Data Hub.
--
-- Le résultat de chaque exécution nocturne (`scripts/etl/run-nightly.sh`) est POUSSÉ ici
-- par le runner ETL, via `scripts/datahub/publier-run.ts`. L'application ne va jamais lire
-- l'entrepôt PostgreSQL : GUIC-700 sépare délibérément les deux, elle ne partage aucun
-- réseau avec lui. Sans cette table, l'état des runs n'existait que dans un fichier de log
-- sur l'hôte ETL, invisible depuis l'administration.
CREATE TABLE `datahub_runs` (
    `id` VARCHAR(36) NOT NULL,
    `demarre_a` DATETIME(3) NOT NULL,
    `termine_a` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statut` VARCHAR(16) NOT NULL,
    `etape` VARCHAR(32) NOT NULL,
    `message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `datahub_runs_termine_a_idx`(`termine_a`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
