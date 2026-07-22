-- AlterTable
ALTER TABLE `notification_event_config` ADD COLUMN `delai_minutes` INTEGER NULL,
    ADD COLUMN `mode` ENUM('auto', 'validation', 'differe') NOT NULL DEFAULT 'auto';

-- CreateTable
CREATE TABLE `notification_envois` (
    `id` VARCHAR(36) NOT NULL,
    `event_key` VARCHAR(80) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `role` VARCHAR(40) NOT NULL,
    `canal` ENUM('in_app', 'whatsapp', 'sms', 'email') NOT NULL,
    `type` ENUM('Deadline', 'Candidature', 'Message', 'Yaye', 'System') NOT NULL,
    `titre` VARCHAR(255) NOT NULL,
    `contenu` TEXT NOT NULL,
    `lien` VARCHAR(500) NULL,
    `icon_name` VARCHAR(32) NULL,
    `statut` ENUM('en_attente_validation', 'planifiee', 'envoyee', 'rejetee', 'echec_retry', 'abandonnee') NOT NULL,
    `erreur` VARCHAR(500) NULL,
    `validee_par` VARCHAR(36) NULL,
    `due_at` DATETIME(3) NULL,
    `envoyee_a` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_envois_statut_created_at_idx`(`statut`, `created_at` DESC),
    INDEX `notification_envois_statut_due_at_idx`(`statut`, `due_at`),
    INDEX `notification_envois_event_id_idx`(`event_id`),
    INDEX `notification_envois_cjs_uid_idx`(`cjs_uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification_envois` ADD CONSTRAINT `notification_envois_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE CASCADE ON UPDATE CASCADE;
