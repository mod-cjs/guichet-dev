-- CreateTable
CREATE TABLE `utilisateurs` (
    `cjs_uid` VARCHAR(36) NOT NULL,
    `telephone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `nom` VARCHAR(100) NOT NULL,
    `prenom` VARCHAR(100) NOT NULL,
    `region` ENUM('Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou') NULL,
    `genre` ENUM('M', 'F') NULL,
    `date_naissance` DATETIME(3) NULL,
    `statut` ENUM('actif', 'inactif', 'anonymise') NOT NULL DEFAULT 'actif',
    `drupal_uid` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `utilisateurs_telephone_key`(`telephone`),
    UNIQUE INDEX `utilisateurs_email_key`(`email`),
    UNIQUE INDEX `utilisateurs_drupal_uid_key`(`drupal_uid`),
    INDEX `utilisateurs_email_idx`(`email`),
    INDEX `utilisateurs_telephone_idx`(`telephone`),
    INDEX `utilisateurs_statut_idx`(`statut`),
    PRIMARY KEY (`cjs_uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profils_jeunes` (
    `id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `photo_url` VARCHAR(500) NULL,
    `biographie` TEXT NULL,
    `competences` JSON NULL,
    `domaines_interet` JSON NULL,
    `diplomes` JSON NULL,
    `niveau_etude` VARCHAR(50) NULL,
    `situation_emploi` VARCHAR(50) NULL,
    `completion_score` INTEGER NOT NULL DEFAULT 0,
    `profile_visibility` VARCHAR(20) NOT NULL DEFAULT 'public',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profils_jeunes_cjs_uid_key`(`cjs_uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experiences` (
    `id` VARCHAR(36) NOT NULL,
    `profil_id` VARCHAR(36) NOT NULL,
    `poste` VARCHAR(150) NOT NULL,
    `organisation` VARCHAR(150) NOT NULL,
    `date_debut` DATETIME(3) NOT NULL,
    `date_fin` DATETIME(3) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `experiences_profil_id_idx`(`profil_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organisations` (
    `id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `nom` VARCHAR(200) NOT NULL,
    `secteur` ENUM('Agriculture', 'Numerique', 'Entrepreneuriat', 'Citoyennete', 'Environnement', 'Sante', 'Education', 'Culture', 'Autre') NULL,
    `region` ENUM('Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou') NULL,
    `adresse` VARCHAR(300) NULL,
    `telephone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `site_web` VARCHAR(500) NULL,
    `logo_url` VARCHAR(500) NULL,
    `est_verifie` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `organisations_cjs_uid_idx`(`cjs_uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opportunites` (
    `id` VARCHAR(36) NOT NULL,
    `titre` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `type` ENUM('Emploi', 'Stage', 'Formation', 'Bourse', 'Volontariat', 'Appel_a_projets') NOT NULL,
    `domaine` ENUM('Agriculture', 'Numerique', 'Entrepreneuriat', 'Citoyennete', 'Environnement', 'Sante', 'Education', 'Culture', 'Autre') NOT NULL,
    `region` ENUM('Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou') NULL,
    `organisation` VARCHAR(200) NOT NULL,
    `organisation_id` VARCHAR(36) NULL,
    `remuneration` VARCHAR(100) NULL,
    `deadline` DATETIME(3) NULL,
    `lien_externe` VARCHAR(500) NULL,
    `statut` ENUM('brouillon', 'publiee', 'archivee', 'expiree') NOT NULL DEFAULT 'brouillon',
    `recruteur_uid` VARCHAR(36) NULL,
    `vues` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `opportunites_statut_deleted_at_idx`(`statut`, `deleted_at`),
    INDEX `opportunites_type_domaine_idx`(`type`, `domaine`),
    INDEX `opportunites_region_idx`(`region`),
    INDEX `opportunites_deadline_idx`(`deadline`),
    FULLTEXT INDEX `opportunites_titre_description_idx`(`titre`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidatures` (
    `id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `opportunite_id` VARCHAR(36) NOT NULL,
    `statut` ENUM('En_attente', 'Vue', 'Retenue', 'Refusee') NOT NULL DEFAULT 'En_attente',
    `lettre_motivation` TEXT NULL,
    `cv_url` VARCHAR(500) NULL,
    `soumise_a` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `candidatures_statut_idx`(`statut`),
    UNIQUE INDEX `candidatures_cjs_uid_opportunite_id_key`(`cjs_uid`, `opportunite_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `centres` (
    `id` VARCHAR(36) NOT NULL,
    `nom` VARCHAR(200) NOT NULL,
    `region` ENUM('Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou') NOT NULL,
    `adresse` VARCHAR(300) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `telephone` VARCHAR(20) NOT NULL,
    `responsable` VARCHAR(150) NOT NULL,
    `gc_id` INTEGER NULL,
    `est_actif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `centres_gc_id_key`(`gc_id`),
    INDEX `centres_region_idx`(`region`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agents_centres` (
    `id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `centre_id` VARCHAR(36) NOT NULL,
    `role` ENUM('conseiller', 'directeur', 'admin_centre') NOT NULL DEFAULT 'conseiller',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `agents_centres_cjs_uid_centre_id_key`(`cjs_uid`, `centre_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evenements` (
    `id` VARCHAR(36) NOT NULL,
    `titre` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `type` ENUM('Formation', 'Atelier', 'Forum', 'Webinar', 'Conference') NOT NULL,
    `statut` ENUM('a_venir', 'en_cours', 'termine', 'annule') NOT NULL DEFAULT 'a_venir',
    `date_debut` DATETIME(3) NOT NULL,
    `date_fin` DATETIME(3) NULL,
    `lieu` VARCHAR(200) NOT NULL,
    `centre_id` VARCHAR(36) NULL,
    `capacite_max` INTEGER NULL,
    `est_gratuit` BOOLEAN NOT NULL DEFAULT true,
    `rappel_envoye` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `evenements_date_debut_statut_idx`(`date_debut`, `statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscriptions_evenements` (
    `id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `evenement_id` VARCHAR(36) NOT NULL,
    `statut` ENUM('inscrit', 'liste_attente', 'annule', 'present') NOT NULL DEFAULT 'inscrit',
    `inscrit_a` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inscriptions_evenements_cjs_uid_evenement_id_key`(`cjs_uid`, `evenement_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ressources` (
    `id` VARCHAR(36) NOT NULL,
    `titre` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `type` ENUM('PDF', 'Video', 'Lien', 'Guide', 'Outil') NOT NULL,
    `theme` VARCHAR(100) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `est_public` BOOLEAN NOT NULL DEFAULT true,
    `vues` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ressources_type_theme_idx`(`type`, `theme`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ressources_favorites` (
    `cjs_uid` VARCHAR(36) NOT NULL,
    `ressource_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`cjs_uid`, `ressource_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interop_logs` (
    `id` VARCHAR(36) NOT NULL,
    `source` VARCHAR(50) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `event_id` VARCHAR(100) NOT NULL,
    `payload` JSON NOT NULL,
    `statut` VARCHAR(20) NOT NULL,
    `erreur` TEXT NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `interop_logs_source_event_type_idx`(`source`, `event_type`),
    INDEX `interop_logs_event_id_idx`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations_whatsapp` (
    `id` VARCHAR(36) NOT NULL,
    `telephone` VARCHAR(20) NOT NULL,
    `cjs_uid` VARCHAR(36) NULL,
    `contexte` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `conversations_whatsapp_telephone_key`(`telephone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages_whatsapp` (
    `id` VARCHAR(36) NOT NULL,
    `conversation_id` VARCHAR(36) NOT NULL,
    `wamid` VARCHAR(100) NOT NULL,
    `sens` VARCHAR(10) NOT NULL,
    `contenu` TEXT NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `messages_whatsapp_wamid_key`(`wamid`),
    INDEX `messages_whatsapp_conversation_id_idx`(`conversation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recommandations_ia` (
    `id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `opportunite_id` VARCHAR(36) NULL,
    `score` DOUBLE NOT NULL,
    `raison` TEXT NULL,
    `vue_par` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `recommandations_ia_cjs_uid_score_idx`(`cjs_uid`, `score` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificats_moodle` (
    `id` VARCHAR(36) NOT NULL,
    `profil_id` VARCHAR(36) NOT NULL,
    `moodle_cert_id` VARCHAR(100) NOT NULL,
    `formation` VARCHAR(255) NOT NULL,
    `obtenu_le` DATETIME(3) NOT NULL,
    `url_certificat` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `certificats_moodle_moodle_cert_id_key`(`moodle_cert_id`),
    INDEX `certificats_moodle_profil_id_idx`(`profil_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profils_jeunes` ADD CONSTRAINT `profils_jeunes_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experiences` ADD CONSTRAINT `experiences_profil_id_fkey` FOREIGN KEY (`profil_id`) REFERENCES `profils_jeunes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunites` ADD CONSTRAINT `opportunites_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidatures` ADD CONSTRAINT `candidatures_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidatures` ADD CONSTRAINT `candidatures_opportunite_id_fkey` FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agents_centres` ADD CONSTRAINT `agents_centres_centre_id_fkey` FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evenements` ADD CONSTRAINT `evenements_centre_id_fkey` FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscriptions_evenements` ADD CONSTRAINT `inscriptions_evenements_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscriptions_evenements` ADD CONSTRAINT `inscriptions_evenements_evenement_id_fkey` FOREIGN KEY (`evenement_id`) REFERENCES `evenements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ressources_favorites` ADD CONSTRAINT `ressources_favorites_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ressources_favorites` ADD CONSTRAINT `ressources_favorites_ressource_id_fkey` FOREIGN KEY (`ressource_id`) REFERENCES `ressources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations_whatsapp` ADD CONSTRAINT `conversations_whatsapp_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages_whatsapp` ADD CONSTRAINT `messages_whatsapp_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations_whatsapp`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recommandations_ia` ADD CONSTRAINT `recommandations_ia_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificats_moodle` ADD CONSTRAINT `certificats_moodle_profil_id_fkey` FOREIGN KEY (`profil_id`) REFERENCES `profils_jeunes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

