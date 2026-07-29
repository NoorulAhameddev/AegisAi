-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "embedding" vector(1536);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "vector" vector(1536),
    "textEmbedding" vector(3072),
    "imageEmbedding" vector(1536),
    "metadata" JSONB,
    "contentHash" VARCHAR(64),
    "imageData" TEXT,
    "imageMimeType" TEXT,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    "chunkIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");
CREATE INDEX "Document_userId_sourceId_idx" ON "Document"("userId", "sourceId");
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");
CREATE UNIQUE INDEX "Document_userId_sourceId_chunkIndex_key" ON "Document"("userId", "sourceId", "chunkIndex");
