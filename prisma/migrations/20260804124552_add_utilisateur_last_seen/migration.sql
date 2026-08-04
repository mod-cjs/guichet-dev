-- GUIC-701 — dernière visite (supervision admin).
ALTER TABLE `utilisateurs` ADD COLUMN `last_seen_at` DATETIME(3) NULL AFTER `drupal_uid`;
