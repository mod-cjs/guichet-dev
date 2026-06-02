-- GUIC-182 (M3 v2 — 178a/4) — Table de référence Tag.
-- Tags transversaux pour filtrer / mettre en avant les opportunités
-- (urgent, télétravail, diaspora, priorité-femmes, etc.).
-- La jonction M:N OpportuniteTag arrive en 178b avec la table Opportunite mère.
-- Seed exécuté par prisma/seed/tags.ts (7 entrées).

CREATE TABLE `tags` (
    `id`         VARCHAR(36)  NOT NULL,
    `slug`       VARCHAR(80)  NOT NULL,
    `libelle`    VARCHAR(120) NOT NULL,
    `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tags_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
