-- GUIC-183 (M3 v2 — 178b/4) — 6 tables sous-types CTI 1:1.
-- Cf. spec §3.4. Cascade DELETE depuis la table mère `opportunites`.
-- Pas de CHECK SQL XOR (non portable MariaDB) : invariant garanti via OpportuniteService.

-- 1. EMPLOI
CREATE TABLE `opportunites_emploi` (
  `opportunite_id`         VARCHAR(36)                                              NOT NULL,
  `type_contrat`           ENUM('CDI','CDD','FREELANCE','ALTERNANCE','STAGE_ALTERNE') NOT NULL,
  `duree_contrat_mois`     INT                                                       NULL,
  `experience_requise`     VARCHAR(100)                                              NULL,
  `teletravail`            BOOLEAN                                                   NOT NULL DEFAULT FALSE,
  `niveau_etude_min`
    ENUM('BFEM','BAC','BAC_PLUS_2','BAC_PLUS_3','BAC_PLUS_5','DOCTORAT')             NULL,

  PRIMARY KEY (`opportunite_id`),
  CONSTRAINT `opportunites_emploi_opportunite_id_fkey`
    FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. STAGE
CREATE TABLE `opportunites_stage` (
  `opportunite_id`            VARCHAR(36)  NOT NULL,
  `duree_mois`                INT          NOT NULL,
  `conventionne_ecole`        BOOLEAN      NOT NULL DEFAULT FALSE,
  `indemnise`                 BOOLEAN      NOT NULL DEFAULT FALSE,
  `indemnite_mensuelle_fcfa`  INT          NULL,
  `niveau_etude_min`
    ENUM('BFEM','BAC','BAC_PLUS_2','BAC_PLUS_3','BAC_PLUS_5','DOCTORAT') NULL,
  `date_debut_prevue`         DATETIME(3)  NULL,

  PRIMARY KEY (`opportunite_id`),
  CONSTRAINT `opportunites_stage_opportunite_id_fkey`
    FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. FORMATION
CREATE TABLE `opportunites_formation` (
  `opportunite_id`            VARCHAR(36)                              NOT NULL,
  `duree_heures`              INT                                      NOT NULL,
  `modalite`                  ENUM('PRESENTIEL','DISTANCE','HYBRIDE')  NOT NULL,
  `certifiante`               BOOLEAN                                  NOT NULL DEFAULT FALSE,
  `organisme_certificateur`   VARCHAR(150)                             NULL,
  `prerequis`                 TEXT                                     NULL,
  `gratuite`                  BOOLEAN                                  NOT NULL DEFAULT TRUE,
  `frais_inscription_fcfa`    INT                                      NULL,

  PRIMARY KEY (`opportunite_id`),
  CONSTRAINT `opportunites_formation_opportunite_id_fkey`
    FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. BOURSE
CREATE TABLE `opportunites_bourse` (
  `opportunite_id`        VARCHAR(36)  NOT NULL,
  `montant_total_fcfa`    INT          NOT NULL,
  `duree_mois`            INT          NULL,
  `niveau_etude_requis`
    ENUM('BFEM','BAC','BAC_PLUS_2','BAC_PLUS_3','BAC_PLUS_5','DOCTORAT') NULL,
  `pays_destination`      VARCHAR(80)  NULL,
  `organisme_financeur`   VARCHAR(150) NOT NULL,
  `couple_obligatoire`    BOOLEAN      NOT NULL DEFAULT FALSE,

  PRIMARY KEY (`opportunite_id`),
  CONSTRAINT `opportunites_bourse_opportunite_id_fkey`
    FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. CONCOURS
CREATE TABLE `opportunites_concours` (
  `opportunite_id`            VARCHAR(36)  NOT NULL,
  `organisme_organisateur`    VARCHAR(150) NOT NULL,
  `date_epreuves`             DATETIME(3)  NULL,
  `lieu_epreuves`             VARCHAR(200) NULL,
  `preuves_demandees`         TEXT         NULL,
  `places_disponibles`        INT          NULL,

  PRIMARY KEY (`opportunite_id`),
  CONSTRAINT `opportunites_concours_opportunite_id_fkey`
    FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. APPEL À PROJETS
CREATE TABLE `opportunites_appel_a_projets` (
  `opportunite_id`         VARCHAR(36)  NOT NULL,
  `budget_max_fcfa`        INT          NULL,
  `duree_projet_mois`      INT          NULL,
  `thematique`             VARCHAR(150) NULL,
  `dossier_requis`         TEXT         NOT NULL,
  `criteres_eligibilite`   TEXT         NOT NULL,

  PRIMARY KEY (`opportunite_id`),
  CONSTRAINT `opportunites_appel_a_projets_opportunite_id_fkey`
    FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
