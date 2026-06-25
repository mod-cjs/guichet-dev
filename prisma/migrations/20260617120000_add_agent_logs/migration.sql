-- M12 IA — Traçabilité agent Yaye (GUIC-259)
-- CreateTable
CREATE TABLE `agent_logs` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NULL,
    `role` VARCHAR(40) NULL,
    `centre_id` VARCHAR(36) NULL,
    `canal` ENUM('web', 'whatsapp') NOT NULL,
    `ts_ms` BIGINT NOT NULL,
    `type_evenement` ENUM('session_ouverte', 'message_recu', 'intention_detectee', 'graph_interroge', 'api_appelee', 'reponse_generee', 'badge_genere', 'reservation_soumise', 'emprunt_initie', 'retour_enregistre', 'contenu_transmis', 'format_canal', 'escalade_conseiller', 'erreur') NOT NULL,
    `tool_called` VARCHAR(60) NULL,
    `payload` JSON NULL,
    `cypher_query` TEXT NULL,
    `nodes_returned` JSON NULL,
    `format_canal` VARCHAR(40) NULL,
    `duree_ms` INTEGER NULL,
    `statut` ENUM('succes', 'echec', 'partiel') NOT NULL DEFAULT 'succes',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `agent_logs_session_id_created_at_idx`(`session_id`, `created_at`),
    INDEX `agent_logs_cjs_uid_created_at_idx`(`cjs_uid`, `created_at` DESC),
    INDEX `agent_logs_type_evenement_created_at_idx`(`type_evenement`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
