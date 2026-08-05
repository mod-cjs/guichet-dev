-- GUIC-692 (PR-C) — historique CDP des relances admin.
CREATE TABLE `relances_candidature` (
  `id` VARCHAR(36) NOT NULL,
  `candidature_id` VARCHAR(36) NOT NULL,
  `par_admin_cjs_uid` VARCHAR(36) NOT NULL,
  `destinataire` ENUM('Recruteur','Candidat','Les_deux') NOT NULL,
  `canaux` JSON NOT NULL,
  `message` TEXT NULL,
  `envoyee_a` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `relances_candidature_candidature_id_idx` (`candidature_id`),
  CONSTRAINT `relances_candidature_candidature_id_fkey` FOREIGN KEY (`candidature_id`) REFERENCES `candidatures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
