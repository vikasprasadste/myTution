CREATE INDEX IF NOT EXISTS "User_status_createdAt_idx" ON "User"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "TutorProfile_verificationStatus_profileStatus_updatedAt_idx"
ON "TutorProfile"("verificationStatus", "profileStatus", "updatedAt");

CREATE INDEX IF NOT EXISTS "TutorBatch_status_startsAt_idx"
ON "TutorBatch"("status", "startsAt");

CREATE INDEX IF NOT EXISTS "Program_role_status_visibility_idx"
ON "Program"("role", "status", "visibility");

CREATE INDEX IF NOT EXISTS "Program_status_visibility_idx"
ON "Program"("status", "visibility");

CREATE INDEX IF NOT EXISTS "PaymentOrder_status_createdAt_idx"
ON "PaymentOrder"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_createdAt_idx"
ON "AuditLog"("entityType", "entityId", "createdAt");
