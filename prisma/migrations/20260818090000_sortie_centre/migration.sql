-- GUIC-689 (M4, lot 1) — Sortie de centre par scan.
--
-- Table SÉPARÉE de `check_ins`, et non un sens `Entree`/`Sortie` dans celle-ci.
-- Motif : neuf points de comptage lisent `check_ins`, que le flux Data Hub
-- décrit comme « la mesure de fréquentation réelle ». Y ajouter les sorties
-- doublerait ces comptages jusque dans l'export public, sans qu'aucun test
-- existant ne le signale.
--
-- Purement ADDITIVE : aucune colonne existante n'est touchée, `check_ins` reste
-- append-only et sa clé de réplication `effectue_a` conserve son sens.
--
-- `check_in_id` est UNIQUE et NULLABLE :
--   - unique  → une entrée ne peut avoir qu'une sortie (un jeton rejoué ne la
--               duplique pas) ;
--   - nullable → une sortie orpheline reste enregistrable. MySQL autorise
--               plusieurs NULL sous une contrainte unique, donc les orphelines
--               coexistent sans se gêner.
--
-- `ON DELETE SET NULL` sur l'entrée : supprimer un passage ne doit pas effacer
-- la trace de la sortie, seulement rompre l'appariement.
--
-- Collation EXPLICITE `utf8mb4_unicode_ci` : MariaDB 11.8 (dev/CI) et 10.11
-- (prod Plesk) n'ont pas la même par défaut. Sans elle, la table naîtrait en
-- `general_ci` en production et la clé étrangère vers `check_ins`
-- (`unicode_ci`) échouerait — errno 150, incident GUIC-562.
--
-- Écrite à la main : `prisma migrate dev` réinitialiserait la base partagée.
CREATE TABLE `sorties_centre` (
  `id`             VARCHAR(36)  NOT NULL,
  `check_in_id`    VARCHAR(36)  NULL,
  `cjs_uid`        VARCHAR(36)  NOT NULL,
  `centre_id`      VARCHAR(36)  NOT NULL,
  `via`            ENUM('QrCard','Manuel') NOT NULL,
  `scanner_id`     VARCHAR(36)  NULL,
  `jwt_nonce`      VARCHAR(64)  NULL,
  `effectue_a`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `duree_minutes`  INT          NULL,
  `meta`           JSON         NULL,

  UNIQUE INDEX `sorties_centre_check_in_id_key` (`check_in_id`),
  UNIQUE INDEX `sorties_centre_jwt_nonce_key` (`jwt_nonce`),
  INDEX `sorties_centre_centre_id_effectue_a_idx` (`centre_id`, `effectue_a`),
  INDEX `sorties_centre_cjs_uid_effectue_a_idx` (`cjs_uid`, `effectue_a`),
  INDEX `sorties_centre_effectue_a_id_idx` (`effectue_a`, `id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `sorties_centre`
  ADD CONSTRAINT `sorties_centre_check_in_id_fkey`
  FOREIGN KEY (`check_in_id`) REFERENCES `check_ins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sorties_centre`
  ADD CONSTRAINT `sorties_centre_cjs_uid_fkey`
  FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `sorties_centre`
  ADD CONSTRAINT `sorties_centre_centre_id_fkey`
  FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
