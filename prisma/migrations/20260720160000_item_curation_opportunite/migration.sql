-- AlterTable
ALTER TABLE `items_curation` ADD COLUMN `opportunite_id` VARCHAR(36) COLLATE utf8mb4_unicode_ci NULL;

-- CreateIndex
CREATE INDEX `items_curation_opportunite_id_idx` ON `items_curation`(`opportunite_id`);

-- AddForeignKey
ALTER TABLE `items_curation` ADD CONSTRAINT `items_curation_opportunite_id_fkey` FOREIGN KEY (`opportunite_id`) REFERENCES `opportunites`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

