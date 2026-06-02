-- GUIC-183 (M3 v2 — 178b/4) — Extension table mère `opportunites` avec colonnes polymorphiques.
-- Toutes nullable durant la migration (data backfill en 178d). Les colonnes legacy
-- (`type`, `organisation`) sont conservées jusqu'en 178d pour ne pas casser les rows existantes.
-- Voir spec §3.3 et §10 étape 4.

-- 1. Enum NiveauEtudes (utilisé par Opportunite et plusieurs sous-types)
--    Géré par MariaDB via ENUM column ; pas de CREATE TYPE en MySQL.

-- 2. Ajout des colonnes polymorphiques
ALTER TABLE `opportunites`
  ADD COLUMN `type_id`              VARCHAR(36)  NULL AFTER `description`,
  ADD COLUMN `programme_id`         VARCHAR(36)  NULL AFTER `type_id`,
  ADD COLUMN `organisation_libelle` VARCHAR(200) NULL AFTER `programme_id`,
  ADD COLUMN `niveau_etude_min`
    ENUM('BFEM','BAC','BAC_PLUS_2','BAC_PLUS_3','BAC_PLUS_5','DOCTORAT') NULL
    AFTER `organisation_libelle`;

-- 3. Foreign keys vers les tables de référence (créées en 178a / GUIC-182)
ALTER TABLE `opportunites`
  ADD CONSTRAINT `opportunites_type_id_fkey`
    FOREIGN KEY (`type_id`)      REFERENCES `opportunite_types`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `opportunites_programme_id_fkey`
    FOREIGN KEY (`programme_id`) REFERENCES `programmes`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Indexes pour les nouvelles colonnes (filtres recherche : type+domaine, programme)
CREATE INDEX `opportunites_type_id_domaine_idx` ON `opportunites`(`type_id`, `domaine`);
CREATE INDEX `opportunites_programme_id_idx`    ON `opportunites`(`programme_id`);
