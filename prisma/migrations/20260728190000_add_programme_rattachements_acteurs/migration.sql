-- GUIC-684 — Extension du rattachement aux ACTEURS : centres et organisations.
--
-- Facultatif ici, contrairement aux contenus : un centre est une infrastructure et
-- une organisation un partenaire — les deux existent indépendamment des programmes.
-- Même forme de jonction que pour les contenus (PK composite, cascade, principal).

-- CreateTable
CREATE TABLE `centres_programmes` (
    `centre_id` VARCHAR(36) NOT NULL,
    `programme_id` VARCHAR(36) NOT NULL,
    `principal` BOOLEAN NOT NULL DEFAULT false,

    INDEX `centres_programmes_programme_id_idx`(`programme_id`),
    PRIMARY KEY (`centre_id`, `programme_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organisations_programmes` (
    `organisation_id` VARCHAR(36) NOT NULL,
    `programme_id` VARCHAR(36) NOT NULL,
    `principal` BOOLEAN NOT NULL DEFAULT false,

    INDEX `organisations_programmes_programme_id_idx`(`programme_id`),
    PRIMARY KEY (`organisation_id`, `programme_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `centres_programmes` ADD CONSTRAINT `centres_programmes_centre_id_fkey` FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `centres_programmes` ADD CONSTRAINT `centres_programmes_programme_id_fkey` FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organisations_programmes` ADD CONSTRAINT `organisations_programmes_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organisations_programmes` ADD CONSTRAINT `organisations_programmes_programme_id_fkey` FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
