-- GUIC-183 (M3 v2 — 178b post-audit) — 4 sous-types ajoutés.
-- Décisions PO 2026-06-01 (spec §19) : audit guichetjeunesse.sn a révélé
-- que le portail expose une catégorie "Financements" distincte, et que
-- mentorship/mobility/volunteering sont des programmes CJS actifs.
--
-- Sous-types ajoutés : OpportuniteFinancement, OpportuniteMentorat,
-- OpportuniteMobilite, OpportuniteVolontariat (4 nouvelles tables).
-- Aucune modification de la table mère `opportunites` (les relations 1:1
-- côté Opportunite sont déduites par Prisma à partir des FK).

CREATE TABLE `opportunites_financement` (
    `opportunite_id`            VARCHAR(36) NOT NULL,
    `montant_fcfa`              INT          NOT NULL,
    `type_financement`          ENUM('MICROCREDIT','SUBVENTION','DOTATION','PRET_HONNEUR','CAPITAL_AMORCAGE') NOT NULL,
    `taux_annuel`               DECIMAL(5,2) NULL,
    `garanties`                 TEXT         NULL,
    `duree_remboursement_mois`  INT          NULL,
    `organisme_financeur`       VARCHAR(150) NOT NULL,
    `is_continuous`             BOOLEAN      NOT NULL DEFAULT false,
    `date_limite_depot`         DATETIME(3)  NULL,

    PRIMARY KEY (`opportunite_id`),
    CONSTRAINT `opportunites_financement_opportunite_id_fkey`
      FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `opportunites_mentorat` (
    `opportunite_id`        VARCHAR(36)  NOT NULL,
    `duree_mois`            INT          NOT NULL,
    `modalite`              ENUM('INDIVIDUEL','GROUPE','COHORTE') NOT NULL,
    `thematique`            VARCHAR(150) NULL,
    `places_disponibles`    INT          NULL,
    `organisateur_libelle`  VARCHAR(150) NOT NULL,

    PRIMARY KEY (`opportunite_id`),
    CONSTRAINT `opportunites_mentorat_opportunite_id_fkey`
      FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `opportunites_mobilite` (
    `opportunite_id`        VARCHAR(36)  NOT NULL,
    `destination`           VARCHAR(120) NOT NULL,
    `type_mobilite`         ENUM('ETUDE','STAGE','PROFESSIONNELLE','RECHERCHE') NOT NULL,
    `duree_mois`            INT          NOT NULL,
    `pris_en_charge`        TEXT         NULL,
    `niveau_langue_requis`  VARCHAR(50)  NULL,
    `date_depart_prevue`    DATETIME(3)  NULL,

    PRIMARY KEY (`opportunite_id`),
    CONSTRAINT `opportunites_mobilite_opportunite_id_fkey`
      FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `opportunites_volontariat` (
    `opportunite_id`            VARCHAR(36)  NOT NULL,
    `duree_mois`                INT          NOT NULL,
    `type_volontariat`          ENUM('SERVICE_CIVIQUE','ENGAGEMENT','INTERNATIONAL','HUMANITAIRE') NOT NULL,
    `indemnite_mensuelle_fcfa`  INT          NULL,
    `domaine_mission`           VARCHAR(150) NOT NULL,
    `places_disponibles`        INT          NULL,

    PRIMARY KEY (`opportunite_id`),
    CONSTRAINT `opportunites_volontariat_opportunite_id_fkey`
      FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
