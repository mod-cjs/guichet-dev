-- GUIC-387 — Lot 7 Wave 6.2 : étend `check_ins` pour le scanner JWT staff.
-- Ajoute : conseiller_email, jwt_nonce (unique) + FK reservation_id.

ALTER TABLE `check_ins`
  ADD COLUMN `conseiller_email` VARCHAR(255) NULL AFTER `scanner_id`,
  ADD COLUMN `jwt_nonce` VARCHAR(64) NULL AFTER `conseiller_email`;

CREATE UNIQUE INDEX `check_ins_jwt_nonce_key` ON `check_ins`(`jwt_nonce`);

ALTER TABLE `check_ins`
  ADD CONSTRAINT `check_ins_reservation_id_fkey`
    FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
