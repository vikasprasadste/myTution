CREATE TABLE "StudentProgramSelection" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentProgramSelection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentProgramSelection_profileId_programId_key" ON "StudentProgramSelection"("profileId", "programId");

CREATE INDEX "StudentProgramSelection_profileId_status_idx" ON "StudentProgramSelection"("profileId", "status");

CREATE INDEX "StudentProgramSelection_programId_status_idx" ON "StudentProgramSelection"("programId", "status");

ALTER TABLE "StudentProgramSelection" ADD CONSTRAINT "StudentProgramSelection_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentProgramSelection" ADD CONSTRAINT "StudentProgramSelection_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
