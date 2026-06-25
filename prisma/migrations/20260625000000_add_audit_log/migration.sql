-- Journal d'audit des actions sensibles (traçabilité CDP, loi 2008-12).
-- Table protégée (accès admin only) ; cjsUid acteur en clair pour résoudre l'identité.
CREATE TABLE `audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `actor_cjs_uid` VARCHAR(36) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `target_type` VARCHAR(40) NULL,
  `target_id` VARCHAR(64) NULL,
  `meta` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_created_at_idx`(`created_at`),
  INDEX `audit_logs_actor_cjs_uid_idx`(`actor_cjs_uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
