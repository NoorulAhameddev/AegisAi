/*
  Warnings:

  - You are about to alter the column `action` on the `AuditLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `name` on the `File` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `type` on the `File` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `userAgent` on the `Session` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `ipAddress` on the `Session` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(45)`.
  - Added the required column `updatedAt` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `File` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `Message` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `SystemSetting` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('SUMMARY_SHORT', 'SUMMARY_DETAILED', 'STRUCTURED_NOTES', 'BULLET_POINTS', 'KEY_CONCEPTS', 'GLOSSARY', 'EXAMPLES', 'ELI5', 'FLASHCARDS', 'QUIZ', 'QUESTIONS', 'EXAM_NOTES');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE 'MODERATOR';
ALTER TYPE "Role" ADD VALUE 'ANALYST';
ALTER TYPE "Role" ADD VALUE 'SUPPORT';

-- DropIndex
DROP INDEX "Chat_userId_idx";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "adminRole" VARCHAR(50),
ADD COLUMN     "integrityHash" VARCHAR(64),
ADD COLUMN     "ipAddress" VARCHAR(45),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "newState" JSONB,
ADD COLUMN     "previousState" JSONB,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "targetId" TEXT,
ADD COLUMN     "targetType" VARCHAR(100),
ADD COLUMN     "ticketId" VARCHAR(100),
ADD COLUMN     "userAgent" VARCHAR(500),
ALTER COLUMN "action" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "title" VARCHAR(255),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "encryptedPath" VARCHAR(500),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "size" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "type" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "role",
ADD COLUMN     "role" "MessageRole" NOT NULL;

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "userAgent" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "ipAddress" SET DATA TYPE VARCHAR(45);

-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UsageMetric" ADD COLUMN     "model" VARCHAR(50);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "NoteType" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "sourceId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_userId_type_idx" ON "Note"("userId", "type");

-- CreateIndex
CREATE INDEX "Note_projectId_idx" ON "Note"("projectId");

-- CreateIndex
CREATE INDEX "Note_tags_idx" ON "Note"("tags");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Chat_userId_createdAt_idx" ON "Chat"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Chat_projectId_idx" ON "Chat"("projectId");

-- CreateIndex
CREATE INDEX "File_userId_createdAt_idx" ON "File"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "File_projectId_idx" ON "File"("projectId");

-- CreateIndex
CREATE INDEX "File_tags_idx" ON "File"("tags");

-- CreateIndex
CREATE INDEX "Memory_userId_createdAt_idx" ON "Memory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_chatId_role_idx" ON "Message"("chatId", "role");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "UsageMetric_userId_createdAt_idx" ON "UsageMetric"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
