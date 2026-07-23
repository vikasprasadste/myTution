CREATE TABLE "ConsentDocument" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentUrl" TEXT NOT NULL,
  "accessLevel" TEXT NOT NULL DEFAULT 'public',
  "roleScope" "Role",
  "required" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'active',
  "permissionSet" JSONB NOT NULL,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConsentDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserConsentAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT,
  "role" "Role" NOT NULL,
  "consentDocumentId" TEXT NOT NULL,
  "consentKey" TEXT NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'accepted',
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "permissionSet" JSONB NOT NULL,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserConsentAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsentDocument_key_version_key" ON "ConsentDocument"("key", "version");
CREATE INDEX "ConsentDocument_key_status_idx" ON "ConsentDocument"("key", "status");
CREATE INDEX "ConsentDocument_roleScope_status_idx" ON "ConsentDocument"("roleScope", "status");

CREATE UNIQUE INDEX "UserConsentAcceptance_userId_role_consentDocumentId_key" ON "UserConsentAcceptance"("userId", "role", "consentDocumentId");
CREATE INDEX "UserConsentAcceptance_userId_role_status_idx" ON "UserConsentAcceptance"("userId", "role", "status");
CREATE INDEX "UserConsentAcceptance_profileId_status_idx" ON "UserConsentAcceptance"("profileId", "status");
CREATE INDEX "UserConsentAcceptance_consentKey_consentVersion_status_idx" ON "UserConsentAcceptance"("consentKey", "consentVersion", "status");

ALTER TABLE "UserConsentAcceptance" ADD CONSTRAINT "UserConsentAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserConsentAcceptance" ADD CONSTRAINT "UserConsentAcceptance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserConsentAcceptance" ADD CONSTRAINT "UserConsentAcceptance_consentDocumentId_fkey" FOREIGN KEY ("consentDocumentId") REFERENCES "ConsentDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ConsentDocument" (
  "id",
  "key",
  "version",
  "title",
  "description",
  "documentType",
  "documentUrl",
  "accessLevel",
  "roleScope",
  "required",
  "status",
  "permissionSet",
  "sourceTag"
) VALUES (
  'consent_registration_v1',
  'registration_terms',
  '1.0',
  'Registration consent',
  'Consent required to create a myTution account and use role-specific learning, teaching, and parent monitoring features.',
  'pdf',
  '/api/v1/ams/files/access-control/consents/mytution-registration-consent-v1.pdf',
  'public',
  NULL,
  true,
  'active',
  '{"fields":{"profile.phone":["read"],"profile.role":["read"],"profile.firstName":["read","write"],"profile.lastName":["read","write"],"profile.dob":["read","write"],"profile.city":["read","write"],"profile.communicationAddress":["read","write"],"profile.alternatePhone":["read","write"],"profile.curriculumSelections":["read","write"],"profile.stream":["read","write"],"profile.specialization":["read","write"]},"communications":["otp","account","class","payment","progress"],"features":["registration","profile","program","batch","parentLink"]}'::jsonb,
  'seed'
) ON CONFLICT ("key", "version") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "documentType" = EXCLUDED."documentType",
  "documentUrl" = EXCLUDED."documentUrl",
  "accessLevel" = EXCLUDED."accessLevel",
  "required" = EXCLUDED."required",
  "status" = EXCLUDED."status",
  "permissionSet" = EXCLUDED."permissionSet",
  "updatedAt" = CURRENT_TIMESTAMP;
