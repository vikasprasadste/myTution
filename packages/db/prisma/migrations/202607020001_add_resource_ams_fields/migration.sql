ALTER TABLE "Resource" ADD COLUMN "assetSlug" TEXT;
ALTER TABLE "Resource" ADD COLUMN "storageType" TEXT NOT NULL DEFAULT 'db';
ALTER TABLE "Resource" ADD COLUMN "contentJson" JSONB;
ALTER TABLE "Resource" ADD COLUMN "thumbnailPath" TEXT;
ALTER TABLE "Resource" ADD COLUMN "bannerPath" TEXT;
ALTER TABLE "Resource" ADD COLUMN "vttPath" TEXT;
ALTER TABLE "Resource" ADD COLUMN "metadataPath" TEXT;
ALTER TABLE "Resource" ADD COLUMN "sourceUrl" TEXT;

CREATE UNIQUE INDEX "Resource_assetSlug_key" ON "Resource"("assetSlug");
