/*
  Warnings:

  - You are about to drop the column `picture` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `User` table. All the data in the column will be lost.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "User_provider_providerId_idx";

-- DropIndex
DROP INDEX "User_provider_providerId_key";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPartial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "picture",
DROP COLUMN "provider",
DROP COLUMN "providerId",
ALTER COLUMN "password" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Message_flagged_idx" ON "Message"("flagged");
