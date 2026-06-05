-- GUIC-247 — M11 · Centre de notifications applicatif (in-app).
-- Table `notifications` + enum `type_notification` (5 valeurs).

CREATE TABLE `notifications` (
  `id` VARCHAR(36) NOT NULL,
  `cjs_uid` VARCHAR(36) NOT NULL,
  `type` ENUM('Deadline','Candidature','Message','Yaye','System') NOT NULL,
  `titre` VARCHAR(255) NOT NULL,
  `contenu` TEXT NOT NULL,
  `icon_name` VARCHAR(32) NULL,
  `lien` VARCHAR(500) NULL,
  `meta_pill` VARCHAR(64) NULL,
  `lu_a` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `notifications_cjs_uid_created_at_idx` (`cjs_uid`, `created_at` DESC),
  INDEX `notifications_cjs_uid_lu_a_idx` (`cjs_uid`, `lu_a`),

  CONSTRAINT `notifications_cjs_uid_fkey`
    FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
