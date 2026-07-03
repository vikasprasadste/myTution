ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "feeType" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "feeAmount" INTEGER;

CREATE INDEX IF NOT EXISTS "Program_creatorProfileId_feeType_idx" ON "Program"("creatorProfileId", "feeType");
