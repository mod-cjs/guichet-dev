-- GUIC-469 — rôle (cache SSO) sur Utilisateur + modèle Insertion (taux d'insertion)
-- NB : appliqué via `prisma migrate deploy` (pas `migrate dev` : la shadow DB échoue
-- sur une migration historique candidature_drafts — dette préexistante, errno 150).

-- AlterTable
ALTER TABLE `utilisateurs` ADD COLUMN `role` VARCHAR(40) NULL;

-- CreateIndex
CREATE INDEX `utilisateurs_role_idx` ON `utilisateurs`(`role`);

-- CreateTable
CREATE TABLE `insertions` (
    `id` VARCHAR(36) NOT NULL,
    `cjs_uid` VARCHAR(36) NOT NULL,
    `opportunite_id` VARCHAR(36) NULL,
    `centre_id` VARCHAR(36) NULL,
    `type` VARCHAR(50) NULL,
    `date_insertion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `insertions_cjs_uid_idx`(`cjs_uid`),
    INDEX `insertions_centre_id_idx`(`centre_id`),
    INDEX `insertions_date_insertion_idx`(`date_insertion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `insertions` ADD CONSTRAINT `insertions_cjs_uid_fkey` FOREIGN KEY (`cjs_uid`) REFERENCES `utilisateurs`(`cjs_uid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `insertions` ADD CONSTRAINT `insertions_centre_id_fkey` FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
