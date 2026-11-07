-- AlterTable
ALTER TABLE "fallback_queue" ADD COLUMN IF NOT EXISTS "opts" JSONB,
ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fallback_queue_status_created_at_idx" ON "fallback_queue"("status", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_fallback_queue_processed" ON "fallback_queue"("processed_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_fallback_queue_status" ON "fallback_queue"("queue_name", "status");
