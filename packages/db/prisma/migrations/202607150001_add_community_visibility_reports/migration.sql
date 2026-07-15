-- Phase 8 community hardening: visibility scope, moderation reports, and reaction uniqueness.

ALTER TABLE "CommunityThread"
  ADD COLUMN IF NOT EXISTS "programId" TEXT,
  ADD COLUMN IF NOT EXISTS "batchId" TEXT,
  ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS "reportedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "moderatedStatus" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "moderatedReason" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CommunityThread_programId_fkey'
  ) THEN
    ALTER TABLE "CommunityThread"
      ADD CONSTRAINT "CommunityThread_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CommunityThread_batchId_fkey'
  ) THEN
    ALTER TABLE "CommunityThread"
      ADD CONSTRAINT "CommunityThread_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "TutorBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CommunityReport" (
  "id" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "reporterProfileId" TEXT,
  "threadId" TEXT,
  "commentId" TEXT,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReport_reporterUserId_fkey'
  ) THEN
    ALTER TABLE "CommunityReport"
      ADD CONSTRAINT "CommunityReport_reporterUserId_fkey"
      FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReport_reporterProfileId_fkey'
  ) THEN
    ALTER TABLE "CommunityReport"
      ADD CONSTRAINT "CommunityReport_reporterProfileId_fkey"
      FOREIGN KEY ("reporterProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReport_threadId_fkey'
  ) THEN
    ALTER TABLE "CommunityReport"
      ADD CONSTRAINT "CommunityReport_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "CommunityThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReport_commentId_fkey'
  ) THEN
    ALTER TABLE "CommunityReport"
      ADD CONSTRAINT "CommunityReport_commentId_fkey"
      FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CommunityThread_visibility_programId_batchId_idx" ON "CommunityThread"("visibility", "programId", "batchId");
CREATE INDEX IF NOT EXISTS "CommunityThread_moderatedStatus_reportedCount_idx" ON "CommunityThread"("moderatedStatus", "reportedCount");
CREATE INDEX IF NOT EXISTS "CommunityReport_threadId_status_idx" ON "CommunityReport"("threadId", "status");
CREATE INDEX IF NOT EXISTS "CommunityReport_commentId_status_idx" ON "CommunityReport"("commentId", "status");
CREATE INDEX IF NOT EXISTS "CommunityReport_status_createdAt_idx" ON "CommunityReport"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReaction_userId_type_threadId_key'
  ) THEN
    ALTER TABLE "CommunityReaction"
      ADD CONSTRAINT "CommunityReaction_userId_type_threadId_key" UNIQUE ("userId", "type", "threadId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReaction_userId_type_commentId_key'
  ) THEN
    ALTER TABLE "CommunityReaction"
      ADD CONSTRAINT "CommunityReaction_userId_type_commentId_key" UNIQUE ("userId", "type", "commentId");
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityReport_reporterUserId_threadId_reason_key"
  ON "CommunityReport"("reporterUserId", "threadId", "reason");

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityReport_reporterUserId_commentId_reason_key"
  ON "CommunityReport"("reporterUserId", "commentId", "reason");
