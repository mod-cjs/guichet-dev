-- GUIC-183 (M3 v2 — 178b/4) — Jonctions M:N Skills et Tags.
-- Cf. spec §3.5. Cascade DELETE des deux côtés.

CREATE TABLE `opportunites_skills` (
  `opportunite_id` VARCHAR(36) NOT NULL,
  `skill_id`       VARCHAR(36) NOT NULL,
  `requise`        BOOLEAN     NOT NULL DEFAULT TRUE,

  PRIMARY KEY (`opportunite_id`, `skill_id`),
  INDEX `opportunites_skills_skill_id_idx` (`skill_id`),
  CONSTRAINT `opportunites_skills_opportunite_id_fkey`
    FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opportunites_skills_skill_id_fkey`
    FOREIGN KEY (`skill_id`)       REFERENCES `skills`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `opportunites_tags` (
  `opportunite_id` VARCHAR(36) NOT NULL,
  `tag_id`         VARCHAR(36) NOT NULL,

  PRIMARY KEY (`opportunite_id`, `tag_id`),
  INDEX `opportunites_tags_tag_id_idx` (`tag_id`),
  CONSTRAINT `opportunites_tags_opportunite_id_fkey`
    FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `opportunites_tags_tag_id_fkey`
    FOREIGN KEY (`tag_id`)         REFERENCES `tags`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
