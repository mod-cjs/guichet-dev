-- GUIC-382 V2 — table CandidatureDraft : brouillons de candidature persistés
-- côté serveur pour reprise multi-device.

CREATE TABLE IF NOT EXISTS `candidature_drafts` (
  `cjs_uid` VARCHAR(36) NOT NULL,
  `opportunite_id` VARCHAR(36) NOT NULL,
  `lettre` TEXT NULL,
  `cv_url` VARCHAR(500) NULL,
  `consent` BOOLEAN NOT NULL DEFAULT FALSE,
  `cv_mode` VARCHAR(20) NOT NULL DEFAULT 'upload',
  `updated_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`cjs_uid`, `opportunite_id`),
  INDEX `candidature_drafts_cjs_uid_idx` (`cjs_uid`),
  INDEX `candidature_drafts_updated_at_idx` (`updated_at`),

  CONSTRAINT `candidature_drafts_cjs_uid_fkey`
    FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE CASCADE,
  CONSTRAINT `candidature_drafts_opportunite_id_fkey`
    FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
