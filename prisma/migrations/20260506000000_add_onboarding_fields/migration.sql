-- AlterTable
ALTER TABLE `utilisateurs`
  ADD COLUMN `commune` VARCHAR(100) NULL,
  ADD COLUMN `onboarding_complete` BOOLEAN NOT NULL DEFAULT false;
