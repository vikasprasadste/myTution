CREATE TABLE "ConsentAssignment" (
  "id" TEXT NOT NULL,
  "consentDocumentId" TEXT NOT NULL,
  "consentKey" TEXT NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "assignerType" TEXT NOT NULL,
  "assignerRole" "Role",
  "assignerUserId" TEXT,
  "assignerProfileId" TEXT,
  "assigneeType" TEXT NOT NULL,
  "assigneeRole" "Role",
  "assigneeUserId" TEXT,
  "assigneeProfileId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "permissionSet" JSONB NOT NULL,
  "metadata" JSONB,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConsentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentAssignment_consentDocumentId_status_idx" ON "ConsentAssignment"("consentDocumentId", "status");
CREATE INDEX "ConsentAssignment_assignerType_assignerRole_assignerUserId_status_idx" ON "ConsentAssignment"("assignerType", "assignerRole", "assignerUserId", "status");
CREATE INDEX "ConsentAssignment_assigneeType_assigneeRole_assigneeUserId_status_idx" ON "ConsentAssignment"("assigneeType", "assigneeRole", "assigneeUserId", "status");
CREATE INDEX "ConsentAssignment_consentKey_consentVersion_status_idx" ON "ConsentAssignment"("consentKey", "consentVersion", "status");

ALTER TABLE "ConsentAssignment" ADD CONSTRAINT "ConsentAssignment_consentDocumentId_fkey" FOREIGN KEY ("consentDocumentId") REFERENCES "ConsentDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
