-- GUIC-20 / GUIC-167 — Table des favoris d'opportunités.
-- Aligné sur le pattern `ressources_favorites` : clé composite, pas de uuid.

-- CreateTable
CREATE TABLE `opportunites_favorites` (
    `cjs_uid` VARCHAR(36) NOT NULL,
    `opportunite_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `opportunites_favorites_cjs_uid_idx`(`cjs_uid`),
    PRIMARY KEY (`cjs_uid`, `opportunite_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `opportunites_favorites` ADD CONSTRAINT `opportunites_favorites_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunites_favorites` ADD CONSTRAINT `opportunites_favorites_opportunite_id_fkey` FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
