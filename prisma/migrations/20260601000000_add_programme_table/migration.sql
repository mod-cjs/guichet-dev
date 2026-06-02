-- GUIC-182 (M3 v2 — 178a/4) — Table de référence Programme.
-- 4 programmes sectoriels CJS : Yaakaar, YEAH, YJC, EduPop.
-- BRM = outil interne, exclu (décision Lead 2026-05-29).
-- Seed exécuté par prisma/seed/programmes.ts.

CREATE TABLE `programmes` (
    `id`             VARCHAR(36)  NOT NULL,
    `slug`           VARCHAR(40)  NOT NULL,
    `nom`            VARCHAR(80)  NOT NULL,
    `description`    VARCHAR(255) NOT NULL,
    `gradient_token` VARCHAR(80)  NOT NULL,
    `actif`          BOOLEAN      NOT NULL DEFAULT true,
    `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`     DATETIME(3)  NOT NULL,

    UNIQUE INDEX `programmes_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
