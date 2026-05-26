-- Migration: add drupal_nid to opportunites, evenements, ressources
-- GUIC-17 — idempotence ETL migration Drupal

ALTER TABLE `opportunites`
  ADD COLUMN `drupal_nid` INT NULL,
  ADD UNIQUE INDEX `opportunites_drupal_nid_key` (`drupal_nid`);

ALTER TABLE `evenements`
  ADD COLUMN `drupal_nid` INT NULL,
  ADD UNIQUE INDEX `evenements_drupal_nid_key` (`drupal_nid`);

ALTER TABLE `ressources`
  ADD COLUMN `drupal_nid` INT NULL,
  ADD UNIQUE INDEX `ressources_drupal_nid_key` (`drupal_nid`);
