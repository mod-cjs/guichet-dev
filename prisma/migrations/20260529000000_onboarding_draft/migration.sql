-- CreateTable
CREATE TABLE `onboarding_drafts` (
    `cjs_uid` VARCHAR(36) NOT NULL,
    `objectifs` JSON NULL,
    `telephone` VARCHAR(20) NULL,
    `prenom` VARCHAR(100) NULL,
    `nom` VARCHAR(100) NULL,
    `date_naissance` DATETIME(3) NULL,
    `genre` VARCHAR(20) NULL,
    `region` VARCHAR(50) NULL,
    `commune` VARCHAR(100) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`cjs_uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
