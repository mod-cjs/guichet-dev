-- CreateTable
CREATE TABLE `sources_veille` (
    `id` VARCHAR(36) NOT NULL,
    `nom` VARCHAR(120) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `methode` ENUM('auto', 'jsonld', 'rss', 'api', 'html_selecteurs', 'article_regex') NOT NULL DEFAULT 'auto',
    `frequence` ENUM('horaire', 'six_heures', 'quotidienne', 'hebdomadaire') NOT NULL DEFAULT 'quotidienne',
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `config_extraction` JSON NULL,
    `type_defaut` ENUM('Emploi', 'Stage', 'Formation', 'Bourse', 'Volontariat', 'Appel_a_projets') NULL,
    `prochaine_verif_le` DATETIME(3) NULL,
    `derniere_verif_le` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `sources_veille_url_key`(`url`),
    INDEX `sources_veille_actif_prochaine_verif_le_idx`(`actif`, `prochaine_verif_le`),
    INDEX `sources_veille_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

