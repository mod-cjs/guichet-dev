-- CreateTable
CREATE TABLE `llm_config` (
    `id` VARCHAR(36) NOT NULL DEFAULT 'default',
    `agent_model` VARCHAR(120) NOT NULL,
    `judge_model` VARCHAR(120) NOT NULL,
    `adequation_model` VARCHAR(120) NOT NULL,
    `updated_by` VARCHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
