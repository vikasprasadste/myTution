ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "creatorProfileId" TEXT;
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'private';
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "creatorProfileId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Program_creatorProfileId_fkey'
  ) THEN
    ALTER TABLE "Program"
      ADD CONSTRAINT "Program_creatorProfileId_fkey"
      FOREIGN KEY ("creatorProfileId") REFERENCES "Profile"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Resource_creatorProfileId_fkey'
  ) THEN
    ALTER TABLE "Resource"
      ADD CONSTRAINT "Resource_creatorProfileId_fkey"
      FOREIGN KEY ("creatorProfileId") REFERENCES "Profile"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Program_creatorProfileId_status_idx" ON "Program"("creatorProfileId", "status");
CREATE INDEX IF NOT EXISTS "Resource_creatorProfileId_type_idx" ON "Resource"("creatorProfileId", "type");
