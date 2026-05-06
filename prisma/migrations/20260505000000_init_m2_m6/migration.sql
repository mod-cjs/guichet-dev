-- CreateTable
CREATE TABLE `profil_jeune` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cjsUid` VARCHAR(36) NOT NULL,
    `drupalUid` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `dateNaissance` DATETIME(3) NULL,
    `genre` ENUM('HOMME', 'FEMME', 'AUTRE', 'NON_PRECISE') NULL,
    `niveauEtude` ENUM('SANS_DIPLOME', 'CEPE', 'BFEM', 'BAC', 'BAC_PLUS_2', 'BAC_PLUS_3', 'BAC_PLUS_5', 'DOCTORAT') NULL,
    `situationPro` ENUM('ETUDIANT', 'SANS_EMPLOI', 'EN_RECHERCHE', 'EMPLOYE', 'INDEPENDANT', 'ENTREPRENEUR') NULL,
    `region` VARCHAR(50) NULL,
    `commune` VARCHAR(100) NULL,
    `quartier` VARCHAR(100) NULL,
    `photoUrl` VARCHAR(500) NULL,
    `bio` TEXT NULL,
    `disponibilite` ENUM('IMMEDIAT', 'UN_MOIS', 'TROIS_MOIS', 'NON_DISPONIBLE') NULL,
    `onboardingComplete` BOOLEAN NOT NULL DEFAULT false,
    `langues` VARCHAR(200) NULL,

    UNIQUE INDEX `profil_jeune_cjsUid_key`(`cjsUid`),
    UNIQUE INDEX `profil_jeune_drupalUid_key`(`drupalUid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(100) NOT NULL,
    `source` VARCHAR(50) NOT NULL DEFAULT 'guichet',

    UNIQUE INDEX `competence_nom_key`(`nom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profil_competence` (
    `profilId` INTEGER NOT NULL,
    `competenceId` INTEGER NOT NULL,

    PRIMARY KEY (`profilId`, `competenceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opportunite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `drupalNid` INTEGER NULL,
    `slug` VARCHAR(300) NOT NULL,
    `titre` VARCHAR(300) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `type` ENUM('EMPLOI', 'STAGE', 'VOLONTARIAT', 'FORMATION', 'BOURSE', 'APPEL_PROJET') NOT NULL,
    `domaine` VARCHAR(100) NOT NULL,
    `region` VARCHAR(50) NULL,
    `localisation` VARCHAR(200) NULL,
    `dateDebut` DATETIME(3) NULL,
    `dateFin` DATETIME(3) NULL,
    `dateExpiration` DATETIME(3) NULL,
    `nbPostes` INTEGER NULL,
    `niveauEtude` ENUM('SANS_DIPLOME', 'CEPE', 'BFEM', 'BAC', 'BAC_PLUS_2', 'BAC_PLUS_3', 'BAC_PLUS_5', 'DOCTORAT') NULL,
    `remote` BOOLEAN NOT NULL DEFAULT false,
    `publiePar` VARCHAR(36) NOT NULL,
    `statut` ENUM('BROUILLON', 'PUBLIE', 'ARCHIVE', 'REFUSE') NOT NULL DEFAULT 'BROUILLON',
    `vues` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `opportunite_drupalNid_key`(`drupalNid`),
    UNIQUE INDEX `opportunite_slug_key`(`slug`),
    INDEX `opportunite_type_idx`(`type`),
    INDEX `opportunite_domaine_idx`(`domaine`),
    INDEX `opportunite_region_idx`(`region`),
    INDEX `opportunite_statut_idx`(`statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opportunite_competence` (
    `opportuniteId` INTEGER NOT NULL,
    `competenceId` INTEGER NOT NULL,

    PRIMARY KEY (`opportuniteId`, `competenceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidature` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profilId` INTEGER NOT NULL,
    `opportuniteId` INTEGER NOT NULL,
    `statut` ENUM('SOUMISE', 'EN_COURS', 'RETENUE', 'REJETEE', 'ANNULEE') NOT NULL DEFAULT 'SOUMISE',
    `lettreMotiv` TEXT NULL,
    `cvUrl` VARCHAR(500) NULL,
    `notesAdmin` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `candidature_profilId_opportuniteId_key`(`profilId`, `opportuniteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favori_opportunite` (
    `profilId` INTEGER NOT NULL,
    `opportuniteId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`profilId`, `opportuniteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `centre` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gcId` VARCHAR(100) NULL,
    `nom` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(300) NOT NULL,
    `region` VARCHAR(50) NOT NULL,
    `commune` VARCHAR(100) NOT NULL,
    `adresse` VARCHAR(300) NULL,
    `telephone` VARCHAR(20) NULL,
    `email` VARCHAR(200) NULL,
    `siteWeb` VARCHAR(300) NULL,
    `description` TEXT NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `photoUrl` VARCHAR(500) NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `syncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `centre_gcId_key`(`gcId`),
    UNIQUE INDEX `centre_slug_key`(`slug`),
    INDEX `centre_region_idx`(`region`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ressource_centre` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gcId` VARCHAR(100) NULL,
    `centreId` INTEGER NOT NULL,
    `type` ENUM('ESPACE_COWORKING', 'SALLE_FORMATION', 'STUDIO_AUDIO', 'STUDIO_VIDEO', 'EQUIPEMENT_INFORMATIQUE', 'EQUIPEMENT_AUDIOVISUEL', 'AUTRE') NOT NULL,
    `nom` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `capacite` INTEGER NULL,
    `disponible` BOOLEAN NOT NULL DEFAULT true,
    `reservable` BOOLEAN NOT NULL DEFAULT false,
    `tarif` DECIMAL(10, 2) NULL,
    `photoUrl` VARCHAR(500) NULL,
    `syncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ressource_centre_gcId_key`(`gcId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profilId` INTEGER NOT NULL,
    `centreId` INTEGER NOT NULL,
    `ressourceCentreId` INTEGER NULL,
    `dateDebut` DATETIME(3) NOT NULL,
    `dateFin` DATETIME(3) NOT NULL,
    `statut` ENUM('EN_ATTENTE', 'CONFIRMEE', 'ANNULEE', 'TERMINEE') NOT NULL DEFAULT 'EN_ATTENTE',
    `motif` TEXT NULL,
    `notesAdmin` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evenement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `drupalNid` INTEGER NULL,
    `slug` VARCHAR(300) NOT NULL,
    `titre` VARCHAR(300) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `type` ENUM('FORMATION', 'FORUM', 'CONFERENCE', 'ATELIER', 'WEBINAIRE', 'SALON', 'AUTRE') NOT NULL,
    `dateDebut` DATETIME(3) NOT NULL,
    `dateFin` DATETIME(3) NOT NULL,
    `lieu` VARCHAR(300) NULL,
    `region` VARCHAR(50) NULL,
    `enligne` BOOLEAN NOT NULL DEFAULT false,
    `lienVisio` VARCHAR(500) NULL,
    `capacite` INTEGER NULL,
    `gratuit` BOOLEAN NOT NULL DEFAULT true,
    `tarif` DECIMAL(10, 2) NULL,
    `photoUrl` VARCHAR(500) NULL,
    `organisateur` VARCHAR(36) NOT NULL,
    `statut` ENUM('BROUILLON', 'PUBLIE', 'ARCHIVE', 'REFUSE') NOT NULL DEFAULT 'BROUILLON',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `evenement_drupalNid_key`(`drupalNid`),
    UNIQUE INDEX `evenement_slug_key`(`slug`),
    INDEX `evenement_dateDebut_idx`(`dateDebut`),
    INDEX `evenement_region_idx`(`region`),
    INDEX `evenement_statut_idx`(`statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscription_evenement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profilId` INTEGER NOT NULL,
    `evenementId` INTEGER NOT NULL,
    `statut` ENUM('CONFIRMEE', 'LISTE_ATTENTE', 'ANNULEE') NOT NULL DEFAULT 'CONFIRMEE',
    `rappelEnvoye` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inscription_evenement_profilId_evenementId_key`(`profilId`, `evenementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ressource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `drupalNid` INTEGER NULL,
    `slug` VARCHAR(300) NOT NULL,
    `titre` VARCHAR(300) NOT NULL,
    `description` TEXT NULL,
    `theme` VARCHAR(100) NOT NULL,
    `format` ENUM('PDF', 'VIDEO', 'AUDIO', 'ARTICLE', 'INFOGRAPHIE', 'COURS_EN_LIGNE', 'OUTIL') NOT NULL,
    `url` VARCHAR(500) NULL,
    `fichierUrl` VARCHAR(500) NULL,
    `langue` VARCHAR(5) NOT NULL DEFAULT 'fr',
    `dureeMin` INTEGER NULL,
    `auteur` VARCHAR(200) NULL,
    `statut` ENUM('BROUILLON', 'PUBLIE', 'ARCHIVE', 'REFUSE') NOT NULL DEFAULT 'BROUILLON',
    `vues` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ressource_drupalNid_key`(`drupalNid`),
    UNIQUE INDEX `ressource_slug_key`(`slug`),
    INDEX `ressource_theme_idx`(`theme`),
    INDEX `ressource_format_idx`(`format`),
    INDEX `ressource_statut_idx`(`statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favori_ressource` (
    `profilId` INTEGER NOT NULL,
    `ressourceId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`profilId`, `ressourceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alerte_metier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profilId` INTEGER NOT NULL,
    `type` ENUM('OPPORTUNITE', 'EVENEMENT', 'RESSOURCE') NOT NULL,
    `criteres` TEXT NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `acteurUid` VARCHAR(36) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entite` VARCHAR(50) NOT NULL,
    `entiteId` INTEGER NULL,
    `payload` TEXT NULL,
    `ip` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_acteurUid_idx`(`acteurUid`),
    INDEX `audit_log_entite_entiteId_idx`(`entite`, `entiteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profil_competence` ADD CONSTRAINT `profil_competence_profilId_fkey` FOREIGN KEY (`profilId`) REFERENCES `profil_jeune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profil_competence` ADD CONSTRAINT `profil_competence_competenceId_fkey` FOREIGN KEY (`competenceId`) REFERENCES `competence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunite_competence` ADD CONSTRAINT `opportunite_competence_opportuniteId_fkey` FOREIGN KEY (`opportuniteId`) REFERENCES `opportunite`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunite_competence` ADD CONSTRAINT `opportunite_competence_competenceId_fkey` FOREIGN KEY (`competenceId`) REFERENCES `competence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidature` ADD CONSTRAINT `candidature_profilId_fkey` FOREIGN KEY (`profilId`) REFERENCES `profil_jeune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidature` ADD CONSTRAINT `candidature_opportuniteId_fkey` FOREIGN KEY (`opportuniteId`) REFERENCES `opportunite`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favori_opportunite` ADD CONSTRAINT `favori_opportunite_profilId_fkey` FOREIGN KEY (`profilId`) REFERENCES `profil_jeune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favori_opportunite` ADD CONSTRAINT `favori_opportunite_opportuniteId_fkey` FOREIGN KEY (`opportuniteId`) REFERENCES `opportunite`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ressource_centre` ADD CONSTRAINT `ressource_centre_centreId_fkey` FOREIGN KEY (`centreId`) REFERENCES `centre`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_profilId_fkey` FOREIGN KEY (`profilId`) REFERENCES `profil_jeune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_centreId_fkey` FOREIGN KEY (`centreId`) REFERENCES `centre`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_ressourceCentreId_fkey` FOREIGN KEY (`ressourceCentreId`) REFERENCES `ressource_centre`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscription_evenement` ADD CONSTRAINT `inscription_evenement_profilId_fkey` FOREIGN KEY (`profilId`) REFERENCES `profil_jeune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscription_evenement` ADD CONSTRAINT `inscription_evenement_evenementId_fkey` FOREIGN KEY (`evenementId`) REFERENCES `evenement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favori_ressource` ADD CONSTRAINT `favori_ressource_profilId_fkey` FOREIGN KEY (`profilId`) REFERENCES `profil_jeune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favori_ressource` ADD CONSTRAINT `favori_ressource_ressourceId_fkey` FOREIGN KEY (`ressourceId`) REFERENCES `ressource`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerte_metier` ADD CONSTRAINT `alerte_metier_profilId_fkey` FOREIGN KEY (`profilId`) REFERENCES `profil_jeune`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

