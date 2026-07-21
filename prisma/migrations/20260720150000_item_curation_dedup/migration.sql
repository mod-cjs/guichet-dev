-- AlterTable
ALTER TABLE `items_curation` ADD COLUMN `doublon_de_id` VARCHAR(36) COLLATE utf8mb4_unicode_ci NULL,
    ADD COLUMN `empreinte_contenu` VARCHAR(64) COLLATE utf8mb4_unicode_ci NULL;

-- CreateIndex
CREATE INDEX `items_curation_empreinte_contenu_idx` ON `items_curation`(`empreinte_contenu`);

-- AddForeignKey
ALTER TABLE `items_curation` ADD CONSTRAINT `items_curation_doublon_de_id_fkey` FOREIGN KEY (`doublon_de_id`) REFERENCES `items_curation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

