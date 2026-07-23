CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "ownerProfileId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'individual_tutor',
  "name" TEXT NOT NULL,
  "bucketNamespace" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_bucketNamespace_key" ON "Organization"("bucketNamespace");
CREATE INDEX "Organization_ownerUserId_status_idx" ON "Organization"("ownerUserId", "status");
CREATE INDEX "Organization_ownerProfileId_status_idx" ON "Organization"("ownerProfileId", "status");
CREATE INDEX "Organization_type_status_idx" ON "Organization"("type", "status");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Profile" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "UserManagement" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "TutorProfile" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "TutorProfile" ADD COLUMN "organizationType" TEXT NOT NULL DEFAULT 'individual_tutor';
ALTER TABLE "TutorProfile" ADD COLUMN "organizationName" TEXT;
ALTER TABLE "TutorBatch" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "BatchRequest" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "BatchEnrollment" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Resource" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Program" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "PaymentOrder" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ProgramPurchase" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "StudentProgramSelection" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ProgramProgress" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ResourceProgress" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ActivityProgress" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "QuizAttempt" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "QuizCheckpoint" ADD COLUMN "organizationId" TEXT;

CREATE INDEX "Profile_organizationId_role_idx" ON "Profile"("organizationId", "role");
CREATE INDEX "UserManagement_organizationId_role_idx" ON "UserManagement"("organizationId", "role");
CREATE INDEX "TutorProfile_organizationId_profileStatus_idx" ON "TutorProfile"("organizationId", "profileStatus");
CREATE INDEX "TutorBatch_organizationId_status_idx" ON "TutorBatch"("organizationId", "status");
CREATE INDEX "BatchRequest_organizationId_status_idx" ON "BatchRequest"("organizationId", "status");
CREATE INDEX "BatchEnrollment_organizationId_status_idx" ON "BatchEnrollment"("organizationId", "status");
CREATE INDEX "Resource_organizationId_type_idx" ON "Resource"("organizationId", "type");
CREATE INDEX "Program_organizationId_status_idx" ON "Program"("organizationId", "status");
CREATE INDEX "PaymentOrder_organizationId_status_idx" ON "PaymentOrder"("organizationId", "status");
CREATE INDEX "ProgramPurchase_organizationId_status_idx" ON "ProgramPurchase"("organizationId", "status");
CREATE INDEX "StudentProgramSelection_organizationId_status_idx" ON "StudentProgramSelection"("organizationId", "status");
CREATE INDEX "ProgramProgress_organizationId_idx" ON "ProgramProgress"("organizationId");
CREATE INDEX "ResourceProgress_organizationId_idx" ON "ResourceProgress"("organizationId");
CREATE INDEX "ActivityProgress_organizationId_idx" ON "ActivityProgress"("organizationId");
CREATE INDEX "QuizAttempt_organizationId_createdAt_idx" ON "QuizAttempt"("organizationId", "createdAt");
CREATE INDEX "QuizCheckpoint_organizationId_updatedAt_idx" ON "QuizCheckpoint"("organizationId", "updatedAt");

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserManagement" ADD CONSTRAINT "UserManagement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TutorBatch" ADD CONSTRAINT "TutorBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BatchRequest" ADD CONSTRAINT "BatchRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BatchEnrollment" ADD CONSTRAINT "BatchEnrollment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Program" ADD CONSTRAINT "Program_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramPurchase" ADD CONSTRAINT "ProgramPurchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentProgramSelection" ADD CONSTRAINT "StudentProgramSelection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramProgress" ADD CONSTRAINT "ProgramProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceProgress" ADD CONSTRAINT "ResourceProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityProgress" ADD CONSTRAINT "ActivityProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuizCheckpoint" ADD CONSTRAINT "QuizCheckpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
