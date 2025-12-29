/*
  Warnings:

  - The values [PREFERENCE] on the enum `MemoryType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MemoryType_new" AS ENUM ('USER_FACT', 'SUMMARY');
ALTER TABLE "Memory" ALTER COLUMN "type" TYPE "MemoryType_new" USING ("type"::text::"MemoryType_new");
ALTER TYPE "MemoryType" RENAME TO "MemoryType_old";
ALTER TYPE "MemoryType_new" RENAME TO "MemoryType";
DROP TYPE "MemoryType_old";
COMMIT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageMetric_pkey" PRIMARY KEY ("id")
);
