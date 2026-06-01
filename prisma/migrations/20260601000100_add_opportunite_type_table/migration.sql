-- GUIC-182 (M3 v2 — 178a/4) — Table de référence OpportuniteType.
-- 6 types : EMPLOI, STAGE, FORMATION, BOURSE, CONCOURS, APPEL_A_PROJETS.
-- Remplace progressivement l'enum TypeOpportunite (qui reste pendant la migration,
-- supprimé en 178d).
-- Seed exécuté par prisma/seed/opportunite-types.ts.

CREATE TABLE `opportunite_types` (
    `id`                    VARCHAR(36)  NOT NULL,
    `slug`                  VARCHAR(40)  NOT NULL,
    `libelle`               VARCHAR(80)  NOT NULL,
    `action_label`          VARCHAR(40)  NOT NULL,
    `requires_file_upload`  BOOLEAN      NOT NULL DEFAULT false,
    `file_label`            VARCHAR(80)  NULL,
    `decision_authority`    VARCHAR(100) NULL,
    `actif`                 BOOLEAN      NOT NULL DEFAULT true,
    `ordre`                 INT          NOT NULL DEFAULT 0,
    `created_at`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`            DATETIME(3)  NOT NULL,

    UNIQUE INDEX `opportunite_types_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
