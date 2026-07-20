CREATE TABLE IF NOT EXISTS "QuizCheckpoint" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "submitted" JSONB NOT NULL,
  "currentIndex" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QuizCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuizCheckpoint_profileId_resourceId_key" ON "QuizCheckpoint"("profileId", "resourceId");
CREATE INDEX IF NOT EXISTS "QuizCheckpoint_resourceId_updatedAt_idx" ON "QuizCheckpoint"("resourceId", "updatedAt");

ALTER TABLE "QuizCheckpoint"
  ADD CONSTRAINT "QuizCheckpoint_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuizCheckpoint"
  ADD CONSTRAINT "QuizCheckpoint_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
