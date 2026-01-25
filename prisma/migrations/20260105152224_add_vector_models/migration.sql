-- CreateExtension
-- CREATE EXTENSION IF NOT EXISTS "vector";
-- Note: pgvector extension must be manually installed on PostgreSQL

-- AlterTable
-- ALTER TABLE "Message" ADD COLUMN     "embedding" vector(1536);
-- Commenting out vector columns until pgvector is installed

-- CreateTable
-- CREATE TABLE "Document" (
--     "id" TEXT NOT NULL,
--     "content" TEXT NOT NULL,
--     "metadata" JSONB,
--     "embedding" vector(1536) NOT NULL,
--     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--
--     CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
-- );
-- Commenting out Document table until pgvector is installed
