ALTER TABLE "Resource"
ADD COLUMN "assetProvider" TEXT NOT NULL DEFAULT 'repo',
ADD COLUMN "accessLevel" TEXT NOT NULL DEFAULT 'program',
ADD COLUMN "assetVersion" TEXT NOT NULL DEFAULT 'v1';

CREATE INDEX "Resource_accessLevel_type_idx" ON "Resource"("accessLevel", "type");
