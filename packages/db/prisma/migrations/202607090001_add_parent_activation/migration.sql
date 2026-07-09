CREATE TABLE IF NOT EXISTS "ParentActivationCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "parentProfileId" TEXT,
  "relationship" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "expiresAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentActivationCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParentStudentLink" (
  "id" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "parentProfileId" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParentActivationCode_code_key" ON "ParentActivationCode"("code");
CREATE INDEX IF NOT EXISTS "ParentActivationCode_studentProfileId_status_idx" ON "ParentActivationCode"("studentProfileId", "status");
CREATE INDEX IF NOT EXISTS "ParentActivationCode_code_status_idx" ON "ParentActivationCode"("code", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentStudentLink_studentProfileId_parentProfileId_key" ON "ParentStudentLink"("studentProfileId", "parentProfileId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_parentProfileId_status_idx" ON "ParentStudentLink"("parentProfileId", "status");

DO $$ BEGIN
  ALTER TABLE "ParentActivationCode" ADD CONSTRAINT "ParentActivationCode_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ParentActivationCode" ADD CONSTRAINT "ParentActivationCode_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ParentActivationCode" ADD CONSTRAINT "ParentActivationCode_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
