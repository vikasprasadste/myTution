CREATE TABLE IF NOT EXISTS "QuizAttempt" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "percent" INTEGER NOT NULL,
  "answers" JSONB NOT NULL,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuizAttempt_profileId_resourceId_createdAt_idx"
  ON "QuizAttempt"("profileId", "resourceId", "createdAt");

CREATE INDEX IF NOT EXISTS "QuizAttempt_resourceId_createdAt_idx"
  ON "QuizAttempt"("resourceId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuizAttempt_profileId_fkey'
  ) THEN
    ALTER TABLE "QuizAttempt"
      ADD CONSTRAINT "QuizAttempt_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuizAttempt_resourceId_fkey'
  ) THEN
    ALTER TABLE "QuizAttempt"
      ADD CONSTRAINT "QuizAttempt_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES "Resource"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
