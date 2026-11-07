-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "familyId" VARCHAR(64) NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "replacedAt" TIMESTAMP(3),
ADD COLUMN     "replacedByTokenHash" VARCHAR(128);

-- CreateIndex
CREATE INDEX "Session_userId_replacedAt_idx" ON "Session"("userId", "replacedAt");

-- CreateIndex
CREATE INDEX "Session_familyId_idx" ON "Session"("familyId");

-- CreateIndex
CREATE INDEX "Session_replacedByTokenHash_idx" ON "Session"("replacedByTokenHash");
