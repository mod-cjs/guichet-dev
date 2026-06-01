-- GUIC-182 (M3 v2 — 178a/4) — Table de référence Skill.
-- Compétences (techniques, soft, linguistiques) référencées par les opportunités.
-- La jonction M:N OpportuniteSkill arrive en 178b avec la table Opportunite mère
-- (besoin d'une FK vers Opportunite qui n'existe pas encore en 178a).
-- Seed exécuté par prisma/seed/skills.ts (~38 entrées CJS).

CREATE TABLE `skills` (
    `id`         VARCHAR(36)  NOT NULL,
    `slug`       VARCHAR(80)  NOT NULL,
    `libelle`    VARCHAR(120) NOT NULL,
    `categorie`  VARCHAR(60)  NULL,
    `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `skills_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
