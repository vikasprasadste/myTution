CREATE TABLE IF NOT EXISTS "AdminReview" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "reviewType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "assignedTo" TEXT,
  "decision" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "AdminReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminConfig" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'global',
  "value" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "updatedBy" TEXT,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminReview_entityType_entityId_reviewType_key" ON "AdminReview"("entityType", "entityId", "reviewType");
CREATE INDEX IF NOT EXISTS "AdminReview_status_reviewType_createdAt_idx" ON "AdminReview"("status", "reviewType", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminReview_entityType_entityId_idx" ON "AdminReview"("entityType", "entityId");

CREATE UNIQUE INDEX IF NOT EXISTS "AdminConfig_key_key" ON "AdminConfig"("key");
CREATE INDEX IF NOT EXISTS "AdminConfig_scope_status_idx" ON "AdminConfig"("scope", "status");
