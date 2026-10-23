/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider,providerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PricingTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('VIEWER', 'COMMENTER', 'EDITOR', 'ADMIN', 'OWNER');

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareToken" VARCHAR(255);

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "monthlyTokenLimit" INTEGER,
ADD COLUMN     "picture" TEXT,
ADD COLUMN     "plan" "PricingTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "provider" VARCHAR(50),
ADD COLUMN     "providerId" VARCHAR(255),
ADD COLUMN     "stripeCustomerId" VARCHAR(255),
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "FileVersion" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeLog" TEXT,
    "isCurrentVersion" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSummary" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "summaryIndex" INTEGER NOT NULL DEFAULT 1,
    "startMessageId" TEXT NOT NULL,
    "endMessageId" TEXT NOT NULL,
    "startTimestamp" TIMESTAMP(3) NOT NULL,
    "endTimestamp" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "tokensSaved" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPresence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'online',
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CacheEntry" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgedAt" TIMESTAMP(3),

    CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerlessFunction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "runtime" VARCHAR(50) NOT NULL,
    "environmentVariables" TEXT,
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "memory" INTEGER NOT NULL DEFAULT 128,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerlessFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionExecution" (
    "id" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "memoryUsed" INTEGER NOT NULL DEFAULT 0,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunctionExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdgeFunction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "code" TEXT NOT NULL,
    "regions" TEXT[] DEFAULT ARRAY['global']::TEXT[],
    "environmentVariables" TEXT,
    "routes" TEXT[] DEFAULT ARRAY['/api/function']::TEXT[],
    "cacheControl" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EdgeFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdgeDeployment" (
    "id" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "region" VARCHAR(50) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "url" VARCHAR(500) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EdgeDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "revisedPrompt" TEXT,
    "imageUrl" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "filePath" TEXT NOT NULL,
    "metadata" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ImageFile_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "rolloutPercentage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PricingTier" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "stripeSessionId" VARCHAR(255),
    "stripePriceId" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(50) NOT NULL,
    "stripePaymentId" VARCHAR(255),
    "invoiceId" VARCHAR(255),
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatPermission" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL DEFAULT 'VIEWER',
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatActivity" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatInvitation" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeEmail" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "ChatInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileVersion_fileId_versionNumber_idx" ON "FileVersion"("fileId", "versionNumber");

-- CreateIndex
CREATE INDEX "FileVersion_createdAt_idx" ON "FileVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileVersion_fileId_versionNumber_key" ON "FileVersion"("fileId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSummary_chatId_key" ON "ConversationSummary"("chatId");

-- CreateIndex
CREATE INDEX "ConversationSummary_chatId_idx" ON "ConversationSummary"("chatId");

-- CreateIndex
CREATE INDEX "ConversationSummary_createdAt_idx" ON "ConversationSummary"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSummary_chatId_summaryIndex_key" ON "ConversationSummary"("chatId", "summaryIndex");

-- CreateIndex
CREATE INDEX "UserPresence_chatId_status_idx" ON "UserPresence"("chatId", "status");

-- CreateIndex
CREATE INDEX "UserPresence_userId_status_idx" ON "UserPresence"("userId", "status");

-- CreateIndex
CREATE INDEX "UserPresence_lastSeen_idx" ON "UserPresence"("lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "UserPresence_userId_chatId_key" ON "UserPresence"("userId", "chatId");

-- CreateIndex
CREATE UNIQUE INDEX "CacheEntry_cacheKey_key" ON "CacheEntry"("cacheKey");

-- CreateIndex
CREATE INDEX "CacheEntry_userId_createdAt_idx" ON "CacheEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CacheEntry_resourceId_idx" ON "CacheEntry"("resourceId");

-- CreateIndex
CREATE INDEX "ServerlessFunction_userId_createdAt_idx" ON "ServerlessFunction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ServerlessFunction_status_idx" ON "ServerlessFunction"("status");

-- CreateIndex
CREATE INDEX "FunctionExecution_functionId_idx" ON "FunctionExecution"("functionId");

-- CreateIndex
CREATE INDEX "FunctionExecution_executedAt_idx" ON "FunctionExecution"("executedAt");

-- CreateIndex
CREATE INDEX "FunctionExecution_status_idx" ON "FunctionExecution"("status");

-- CreateIndex
CREATE INDEX "EdgeFunction_userId_idx" ON "EdgeFunction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EdgeFunction_userId_slug_key" ON "EdgeFunction"("userId", "slug");

-- CreateIndex
CREATE INDEX "EdgeDeployment_functionId_idx" ON "EdgeDeployment"("functionId");

-- CreateIndex
CREATE INDEX "EdgeDeployment_region_idx" ON "EdgeDeployment"("region");

-- CreateIndex
CREATE UNIQUE INDEX "EdgeDeployment_functionId_region_key" ON "EdgeDeployment"("functionId", "region");

-- CreateIndex
CREATE INDEX "GeneratedImage_userId_generatedAt_idx" ON "GeneratedImage"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "GeneratedImage_deletedAt_idx" ON "GeneratedImage"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImageFile_fileId_key" ON "ImageFile"("fileId");

-- CreateIndex
CREATE INDEX "ImageFile_userId_uploadedAt_idx" ON "ImageFile"("userId", "uploadedAt");

-- CreateIndex
CREATE INDEX "ImageFile_hash_idx" ON "ImageFile"("hash");

-- CreateIndex
CREATE INDEX "ImageFile_deletedAt_idx" ON "ImageFile"("deletedAt");



-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- CreateIndex
CREATE INDEX "FeatureFlag_name_idx" ON "FeatureFlag"("name");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Subscription_plan_idx" ON "Subscription"("plan");

-- CreateIndex
CREATE INDEX "Subscription_startDate_endDate_idx" ON "Subscription"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentId_key" ON "Payment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "ChatPermission_chatId_idx" ON "ChatPermission"("chatId");

-- CreateIndex
CREATE INDEX "ChatPermission_userId_idx" ON "ChatPermission"("userId");

-- CreateIndex
CREATE INDEX "ChatPermission_role_idx" ON "ChatPermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ChatPermission_chatId_userId_key" ON "ChatPermission"("chatId", "userId");

-- CreateIndex
CREATE INDEX "ChatActivity_chatId_createdAt_idx" ON "ChatActivity"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatActivity_userId_idx" ON "ChatActivity"("userId");

-- CreateIndex
CREATE INDEX "ChatInvitation_chatId_idx" ON "ChatInvitation"("chatId");

-- CreateIndex
CREATE INDEX "ChatInvitation_inviteeEmail_status_idx" ON "ChatInvitation"("inviteeEmail", "status");

-- CreateIndex
CREATE INDEX "ChatInvitation_status_idx" ON "ChatInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChatInvitation_chatId_inviteeEmail_key" ON "ChatInvitation"("chatId", "inviteeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_shareToken_key" ON "Chat"("shareToken");

-- CreateIndex
CREATE INDEX "Chat_deletedAt_idx" ON "Chat"("deletedAt");

-- CreateIndex
CREATE INDEX "Chat_isShared_idx" ON "Chat"("isShared");

-- CreateIndex
CREATE INDEX "Chat_shareToken_idx" ON "Chat"("shareToken");

-- CreateIndex
CREATE INDEX "File_deletedAt_idx" ON "File"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "File_userId_name_key" ON "File"("userId", "name");

-- CreateIndex
CREATE INDEX "Message_deletedAt_idx" ON "Message"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_plan_idx" ON "User"("plan");

-- CreateIndex
CREATE INDEX "User_subscriptionEndsAt_idx" ON "User"("subscriptionEndsAt");

-- CreateIndex
CREATE INDEX "User_provider_providerId_idx" ON "User"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileVersion" ADD CONSTRAINT "FileVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionExecution" ADD CONSTRAINT "FunctionExecution_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "ServerlessFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EdgeDeployment" ADD CONSTRAINT "EdgeDeployment_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "EdgeFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageFile" ADD CONSTRAINT "ImageFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPermission" ADD CONSTRAINT "ChatPermission_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatActivity" ADD CONSTRAINT "ChatActivity_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatInvitation" ADD CONSTRAINT "ChatInvitation_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
