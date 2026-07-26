/*
  Warnings:

  - You are about to drop the column `crisisConsentAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `crisisConsentVersion` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `crisisNotifyOnClearSignal` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "crisisConsentAt",
DROP COLUMN "crisisConsentVersion",
DROP COLUMN "crisisNotifyOnClearSignal";
