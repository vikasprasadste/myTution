CREATE TYPE "ConversationType" AS ENUM ('direct_student_educator', 'direct_student_student', 'batch_group', 'batch_announcement');

CREATE TYPE "MessageStatus" AS ENUM ('sent', 'deleted', 'hidden');

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" "ConversationType" NOT NULL,
    "batchId" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sourceTag" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canWrite" BOOLEAN NOT NULL DEFAULT true,
    "lastReadAt" TIMESTAMP(3),
    "mutedAt" TIMESTAMP(3),
    "sourceTag" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "organizationId" TEXT,
    "senderUserId" TEXT NOT NULL,
    "senderProfileId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'sent',
    "sourceTag" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageReceipt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "sourceTag" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "organizationId" TEXT,
    "kind" TEXT NOT NULL,
    "fileName" TEXT,
    "assetPath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sourceTag" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationParticipant_conversationId_profileId_key" ON "ConversationParticipant"("conversationId", "profileId");
CREATE UNIQUE INDEX "MessageReceipt_messageId_participantId_key" ON "MessageReceipt"("messageId", "participantId");

CREATE INDEX "Conversation_organizationId_type_status_idx" ON "Conversation"("organizationId", "type", "status");
CREATE INDEX "Conversation_batchId_type_status_idx" ON "Conversation"("batchId", "type", "status");
CREATE INDEX "Conversation_status_updatedAt_idx" ON "Conversation"("status", "updatedAt");
CREATE INDEX "ConversationParticipant_profileId_canRead_idx" ON "ConversationParticipant"("profileId", "canRead");
CREATE INDEX "ConversationParticipant_userId_canRead_idx" ON "ConversationParticipant"("userId", "canRead");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderProfileId_createdAt_idx" ON "Message"("senderProfileId", "createdAt");
CREATE INDEX "Message_organizationId_createdAt_idx" ON "Message"("organizationId", "createdAt");
CREATE INDEX "MessageReceipt_profileId_readAt_idx" ON "MessageReceipt"("profileId", "readAt");
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");
CREATE INDEX "MessageAttachment_organizationId_createdAt_idx" ON "MessageAttachment"("organizationId", "createdAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TutorBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderProfileId_fkey" FOREIGN KEY ("senderProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ConversationParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
