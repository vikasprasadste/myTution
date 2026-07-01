-- CreateEnum
CREATE TYPE "CommunityThreadStatus" AS ENUM ('open', 'solved', 'archived');

-- CreateEnum
CREATE TYPE "CommunityReactionType" AS ENUM ('upvote', 'helpful', 'like');

-- CreateTable
CREATE TABLE "CommunityThread" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "ownerProfileId" TEXT,
    "role" "Role" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "subject" TEXT,
    "milestoneTitle" TEXT,
    "status" "CommunityThreadStatus" NOT NULL DEFAULT 'open',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "attachmentUrl" TEXT,
    "sourceTag" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "ownerProfileId" TEXT,
    "body" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "sourceTag" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "commentId" TEXT,
    "type" "CommunityReactionType" NOT NULL,
    "sourceTag" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommunityReaction_target_check" CHECK (
      (("threadId" IS NOT NULL AND "commentId" IS NULL) OR
       ("threadId" IS NULL AND "commentId" IS NOT NULL))
    )
);

-- CreateIndex
CREATE INDEX "CommunityThread_role_status_pinned_createdAt_idx" ON "CommunityThread"("role", "status", "pinned", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityThread_ownerUserId_createdAt_idx" ON "CommunityThread"("ownerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_threadId_createdAt_idx" ON "CommunityComment"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_ownerUserId_createdAt_idx" ON "CommunityComment"("ownerUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_userId_threadId_type_key" ON "CommunityReaction"("userId", "threadId", "type") WHERE "threadId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_userId_commentId_type_key" ON "CommunityReaction"("userId", "commentId", "type") WHERE "commentId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "CommunityReaction_threadId_type_idx" ON "CommunityReaction"("threadId", "type");

-- CreateIndex
CREATE INDEX "CommunityReaction_commentId_type_idx" ON "CommunityReaction"("commentId", "type");

-- CreateIndex
CREATE INDEX "CommunityReaction_userId_type_idx" ON "CommunityReaction"("userId", "type");

-- AddForeignKey
ALTER TABLE "CommunityThread" ADD CONSTRAINT "CommunityThread_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityThread" ADD CONSTRAINT "CommunityThread_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommunityThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommunityThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
