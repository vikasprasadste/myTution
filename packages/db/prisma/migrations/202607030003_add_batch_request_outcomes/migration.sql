ALTER TYPE "BatchRequestStatus" ADD VALUE IF NOT EXISTS 'deferred';
ALTER TYPE "BatchRequestStatus" ADD VALUE IF NOT EXISTS 'suggested';
ALTER TYPE "BatchRequestStatus" ADD VALUE IF NOT EXISTS 'dismissed';

ALTER TABLE "BatchRequest" ADD COLUMN IF NOT EXISTS "suggestedBatchId" TEXT;
ALTER TABLE "BatchRequest" ADD COLUMN IF NOT EXISTS "tutorResponse" TEXT;
