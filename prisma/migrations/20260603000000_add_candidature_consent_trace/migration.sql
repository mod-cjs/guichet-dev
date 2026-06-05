-- GUIC-218 (Wave 6 backend) — Traçabilité du consentement CGU sur Candidature.
-- Audit CDP : pour chaque candidature soumise, conserver la preuve du
-- consentement explicite (date, version des CGU, IP source) afin de
-- répondre à une demande d'accès / suppression / réclamation.
--
-- Ajout d'un index sur `opportunite_id` pour préparer la vue recruteur
-- (liste des candidatures par opportunité) — actuellement absent puisque
-- la FK seule ne suffit pas en MySQL/MariaDB pour optimiser les SELECT
-- côté table fille.

ALTER TABLE `candidatures`
  ADD COLUMN `consent_at`  DATETIME(3)  NULL,
  ADD COLUMN `cgu_version` VARCHAR(20)  NULL,
  ADD COLUMN `consent_ip`  VARCHAR(45)  NULL;

CREATE INDEX `candidatures_opportunite_id_idx` ON `candidatures`(`opportunite_id`);
