ALTER TABLE "TutorProfile"
ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
ADD COLUMN "profileStatus" TEXT NOT NULL DEFAULT 'active';

ALTER TABLE "TutorBatch"
ADD COLUMN "programId" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'available',
ADD COLUMN "feeType" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN "feeAmount" INTEGER;

ALTER TABLE "TutorBatch"
ADD CONSTRAINT "TutorBatch_programId_fkey"
FOREIGN KEY ("programId") REFERENCES "Program"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TutorBatch_tutorProfileId_status_idx" ON "TutorBatch"("tutorProfileId", "status");
CREATE INDEX "TutorBatch_programId_status_idx" ON "TutorBatch"("programId", "status");
