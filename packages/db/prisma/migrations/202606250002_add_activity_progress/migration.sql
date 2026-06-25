-- Move activity completion from global content definitions to per-profile learner progress.
CREATE TABLE "ActivityProgress" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'in_progress',
    "completedAt" TIMESTAMP(3),
    "sourceTag" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityProgress_profileId_activityId_key" ON "ActivityProgress"("profileId", "activityId");
CREATE INDEX "ActivityProgress_profileId_status_idx" ON "ActivityProgress"("profileId", "status");

ALTER TABLE "ActivityProgress" ADD CONSTRAINT "ActivityProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityProgress" ADD CONSTRAINT "ActivityProgress_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "MilestoneActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MilestoneActivity" DROP COLUMN "status";
