/*
  Warnings:

  - You are about to drop the column `embedding` on the `Message` table. All the data in the column will be lost.
  - You are about to alter the column `picture` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.

*/
-- DropIndex
DROP INDEX "User_provider_providerId_key";

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "characterId" TEXT;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "embedding",
ADD COLUMN     "contentHash" VARCHAR(64);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "picture" SET DATA TYPE VARCHAR(500);

-- CreateTable
CREATE TABLE "CharacterPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "avatar" VARCHAR(500),
    "systemPrompt" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "model" VARCHAR(100) NOT NULL DEFAULT 'openai/gpt-4o-mini',
    "maxTokens" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" VARCHAR(100),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenUsageCounter" (
    "userId" TEXT NOT NULL,
    "hourStart" TIMESTAMP(3) NOT NULL,
    "dayStart" TIMESTAMP(3) NOT NULL,
    "monthStart" TIMESTAMP(3) NOT NULL,
    "hourlyTokens" INTEGER NOT NULL DEFAULT 0,
    "dailyTokens" INTEGER NOT NULL DEFAULT 0,
    "monthlyTokens" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenUsageCounter_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "fallback_queue" (
    "id" TEXT NOT NULL,
    "queue_name" VARCHAR(100) NOT NULL,
    "data" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "fallback_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterPreset_userId_isActive_idx" ON "CharacterPreset"("userId", "isActive");

-- CreateIndex
CREATE INDEX "CharacterPreset_isPublic_isActive_idx" ON "CharacterPreset"("isPublic", "isActive");

-- CreateIndex
CREATE INDEX "CharacterPreset_isSystem_isActive_idx" ON "CharacterPreset"("isSystem", "isActive");

-- CreateIndex
CREATE INDEX "CharacterPreset_category_idx" ON "CharacterPreset"("category");

-- CreateIndex
CREATE INDEX "CharacterPreset_tags_idx" ON "CharacterPreset"("tags");

-- CreateIndex
CREATE INDEX "CharacterPreset_usageCount_idx" ON "CharacterPreset"("usageCount");

-- CreateIndex
CREATE INDEX "fallback_queue_queue_name_status_created_at_idx" ON "fallback_queue"("queue_name", "status", "created_at");

-- CreateIndex
CREATE INDEX "fallback_queue_status_idx" ON "fallback_queue"("status");

-- CreateIndex
CREATE INDEX "Chat_characterId_idx" ON "Chat"("characterId");

-- CreateIndex
CREATE INDEX "Message_chatId_role_contentHash_idx" ON "Message"("chatId", "role", "contentHash");

-- CreateIndex
CREATE INDEX "Message_chatId_deletedAt_createdAt_idx" ON "Message"("chatId", "deletedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "CharacterPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterPreset" ADD CONSTRAINT "CharacterPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenUsageCounter" ADD CONSTRAINT "TokenUsageCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
