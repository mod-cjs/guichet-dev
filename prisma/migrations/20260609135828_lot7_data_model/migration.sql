-- GUIC-350 Lot 7 Centres CJS — foundations data model
-- Spec : .agent_context/specs/M4-centres-lot7.md
-- ADR-001 : réutilisation AgentCentre + RoleAgent (pas de CentreStaff)
--
-- Migration additive (aucun DROP, aucune destruction de données existantes).
-- Idempotente via IF NOT EXISTS sur les CREATE / ADD COLUMN.

-- ─────────────────────────────────────────────
-- 1. Extension du modèle `centres` existant
-- ─────────────────────────────────────────────
-- IMPORTANT : `services JSON NOT NULL` sans DEFAULT échoue sur table non vide.
-- Pattern 3 étapes : ADD NULL → BACKFILL → MODIFY NOT NULL.

ALTER TABLE `centres`
  ADD COLUMN `slug`              VARCHAR(120) NULL,
  ADD COLUMN `description`       TEXT NULL,
  ADD COLUMN `image_url`         VARCHAR(500) NULL,
  ADD COLUMN `email`             VARCHAR(255) NULL,
  ADD COLUMN `ville`             VARCHAR(120) NULL,
  ADD COLUMN `services`          JSON NULL,
  ADD COLUMN `conseillers_count` INT NOT NULL DEFAULT 0;

-- Backfill : tableau vide JSON pour toutes les lignes existantes.
UPDATE `centres` SET `services` = JSON_ARRAY() WHERE `services` IS NULL;

-- Promotion NOT NULL une fois toutes les lignes peuplées.
ALTER TABLE `centres` MODIFY COLUMN `services` JSON NOT NULL;

-- Unique sur slug (nullable, plusieurs NULL acceptés en MySQL/MariaDB).
CREATE UNIQUE INDEX `centres_slug_key` ON `centres`(`slug`);

-- ─────────────────────────────────────────────
-- 2. Extension du modèle `profils_jeunes` existant
-- ─────────────────────────────────────────────

ALTER TABLE `profils_jeunes`
  ADD COLUMN `centre_principal_id` VARCHAR(36) NULL;

CREATE INDEX `profils_jeunes_centre_principal_id_idx` ON `profils_jeunes`(`centre_principal_id`);

ALTER TABLE `profils_jeunes`
  ADD CONSTRAINT `profils_jeunes_centre_principal_id_fkey`
  FOREIGN KEY (`centre_principal_id`) REFERENCES `centres`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────
-- 3. CentreHoraire — horaires d'ouverture par centre × jour
-- ─────────────────────────────────────────────

CREATE TABLE `centre_horaires` (
  `centre_id` VARCHAR(36) NOT NULL,
  `jour` ENUM('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche') NOT NULL,
  `ouvert` BOOLEAN NOT NULL DEFAULT TRUE,
  `ouvre_a` VARCHAR(5) NULL,
  `ferme_a` VARCHAR(5) NULL,
  PRIMARY KEY (`centre_id`, `jour`),
  CONSTRAINT `centre_horaires_centre_id_fkey`
    FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 4. RessourceCentre — salles, véhicules, postes info, etc.
-- ─────────────────────────────────────────────

CREATE TABLE `ressources_centre` (
  `id` VARCHAR(36) NOT NULL,
  `centre_id` VARCHAR(36) NOT NULL,
  `type` ENUM('Salle','Vehicule','Poste_info','Equipement','Atelier_recurrent') NOT NULL,
  `nom` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `capacite` INT NOT NULL DEFAULT 1,
  `capacite_unit` VARCHAR(30) NULL,
  `duree_min_creneau_min` INT NOT NULL DEFAULT 60,
  `requires_justif` BOOLEAN NOT NULL DEFAULT FALSE,
  `est_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ressources_centre_centre_id_type_est_active_idx` (`centre_id`, `type`, `est_active`),
  CONSTRAINT `ressources_centre_centre_id_fkey`
    FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 5. Reservation — réservation jeune × ressource
-- ─────────────────────────────────────────────

CREATE TABLE `reservations` (
  `id` VARCHAR(36) NOT NULL,
  `cjs_uid` VARCHAR(36) NOT NULL,
  `centre_id` VARCHAR(36) NOT NULL,
  `ressource_id` VARCHAR(36) NOT NULL,
  `date_reservee` DATETIME(3) NOT NULL,
  `creneau_debut` VARCHAR(5) NOT NULL,
  `creneau_fin` VARCHAR(5) NOT NULL,
  `nombre_personnes` INT NOT NULL DEFAULT 1,
  `motif` TEXT NOT NULL,
  `justif_file_url` VARCHAR(500) NULL,
  `statut` ENUM('EnAttente','Acceptee','Refusee','AnnuleeParJeune','Passee','NonHonoree')
    NOT NULL DEFAULT 'Acceptee',
  `raison_refus_ou_annul` TEXT NULL,
  `no_show` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `decision_a` DATETIME(3) NULL,
  `annulee_a` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `reservations_cjs_uid_created_at_idx` (`cjs_uid`, `created_at` DESC),
  INDEX `reservations_centre_id_statut_date_reservee_idx` (`centre_id`, `statut`, `date_reservee`),
  INDEX `reservations_ressource_id_date_reservee_statut_idx` (`ressource_id`, `date_reservee`, `statut`),
  INDEX `reservations_statut_date_reservee_idx` (`statut`, `date_reservee`),
  CONSTRAINT `reservations_cjs_uid_fkey`
    FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `reservations_centre_id_fkey`
    FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `reservations_ressource_id_fkey`
    FOREIGN KEY (`ressource_id`) REFERENCES `ressources_centre`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 6. CheckIn — KPI fréquentation principal
-- ─────────────────────────────────────────────

CREATE TABLE `check_ins` (
  `id` VARCHAR(36) NOT NULL,
  `cjs_uid` VARCHAR(36) NOT NULL,
  `centre_id` VARCHAR(36) NOT NULL,
  `reservation_id` VARCHAR(36) NULL,
  `via` ENUM('QrCard','Manuel') NOT NULL,
  `scanner_id` VARCHAR(36) NULL,
  `effectue_a` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `dwell_minutes` INT NULL,
  `meta` JSON NULL,
  PRIMARY KEY (`id`),
  INDEX `check_ins_centre_id_effectue_a_idx` (`centre_id`, `effectue_a`),
  INDEX `check_ins_cjs_uid_effectue_a_idx` (`cjs_uid`, `effectue_a`),
  CONSTRAINT `check_ins_cjs_uid_fkey`
    FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `check_ins_centre_id_fkey`
    FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 7. CentreEvent — table KPI événementiel INSERT-only, retention 6 mois
-- ─────────────────────────────────────────────

CREATE TABLE `centre_events` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `centre_id` VARCHAR(36) NULL,
  `cjs_uid` VARCHAR(36) NULL,
  `type` VARCHAR(60) NOT NULL,
  `metadata` JSON NULL,
  `ts` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `centre_events_type_ts_idx` (`type`, `ts`),
  INDEX `centre_events_centre_id_type_ts_idx` (`centre_id`, `type`, `ts`),
  CONSTRAINT `centre_events_centre_id_fkey`
    FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
