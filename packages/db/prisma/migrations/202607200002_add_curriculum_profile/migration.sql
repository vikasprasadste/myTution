ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "curriculumSelections" JSONB;

ALTER TABLE "UserManagement"
  ADD COLUMN IF NOT EXISTS "curriculumSelections" JSONB;

ALTER TABLE "TutorProfile"
  ADD COLUMN IF NOT EXISTS "outreachEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "outreachPlan" TEXT;

CREATE INDEX IF NOT EXISTS "Profile_curriculumSelections_gin_idx"
  ON "Profile" USING GIN ("curriculumSelections");

CREATE INDEX IF NOT EXISTS "UserManagement_curriculumSelections_gin_idx"
  ON "UserManagement" USING GIN ("curriculumSelections");

CREATE INDEX IF NOT EXISTS "TutorProfile_outreachEnabled_profileStatus_idx"
  ON "TutorProfile" ("outreachEnabled", "profileStatus");
