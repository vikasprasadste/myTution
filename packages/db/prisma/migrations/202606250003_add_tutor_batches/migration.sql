-- CreateEnum
CREATE TYPE "BatchRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('active', 'paused', 'completed');

-- CreateTable
CREATE TABLE "TutorProfile" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "subjects" TEXT NOT NULL,
  "boards" TEXT NOT NULL,
  "grades" TEXT NOT NULL,
  "languages" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "experienceYears" INTEGER NOT NULL,
  "rating" DOUBLE PRECISION NOT NULL,
  "hourlyRate" INTEGER NOT NULL,
  "gender" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "bio" TEXT NOT NULL,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorBatch" (
  "id" TEXT NOT NULL,
  "tutorProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "course" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "board" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "schedule" TEXT NOT NULL,
  "classroomLocation" TEXT,
  "onlineLink" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 12,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TutorBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchRequest" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "status" "BatchRequestStatus" NOT NULL DEFAULT 'pending',
  "message" TEXT,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BatchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchEnrollment" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "requestId" TEXT,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'active',
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BatchEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_profileId_key" ON "TutorProfile"("profileId");
CREATE INDEX "TutorProfile_location_gender_idx" ON "TutorProfile"("location", "gender");
CREATE INDEX "TutorProfile_rating_experienceYears_idx" ON "TutorProfile"("rating", "experienceYears");
CREATE INDEX "TutorBatch_subject_grade_board_mode_idx" ON "TutorBatch"("subject", "grade", "board", "mode");
CREATE INDEX "TutorBatch_startsAt_idx" ON "TutorBatch"("startsAt");
CREATE UNIQUE INDEX "BatchRequest_batchId_studentProfileId_key" ON "BatchRequest"("batchId", "studentProfileId");
CREATE INDEX "BatchRequest_studentProfileId_status_idx" ON "BatchRequest"("studentProfileId", "status");
CREATE INDEX "BatchRequest_batchId_status_idx" ON "BatchRequest"("batchId", "status");
CREATE UNIQUE INDEX "BatchEnrollment_requestId_key" ON "BatchEnrollment"("requestId");
CREATE UNIQUE INDEX "BatchEnrollment_batchId_studentProfileId_key" ON "BatchEnrollment"("batchId", "studentProfileId");
CREATE INDEX "BatchEnrollment_studentProfileId_status_idx" ON "BatchEnrollment"("studentProfileId", "status");

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TutorBatch" ADD CONSTRAINT "TutorBatch_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchRequest" ADD CONSTRAINT "BatchRequest_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TutorBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchRequest" ADD CONSTRAINT "BatchRequest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchEnrollment" ADD CONSTRAINT "BatchEnrollment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TutorBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchEnrollment" ADD CONSTRAINT "BatchEnrollment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchEnrollment" ADD CONSTRAINT "BatchEnrollment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BatchRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
