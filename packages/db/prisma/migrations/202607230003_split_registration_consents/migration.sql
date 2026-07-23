UPDATE "ConsentDocument"
SET "status" = 'inactive', "required" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'registration_terms';

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
) VALUES
(
  'consent_eula_v1',
  'end_user_license_agreement',
  '1.0',
  'End User License Agreement',
  'Agreement for using the myTution mobile application and services.',
  'pdf',
  '/api/v1/ams/files/access-control/consents/mytution-end-user-license-agreement-v1.pdf',
  'public',
  NULL,
  true,
  'active',
  '{"fields":{"profile.phone":["read"],"profile.role":["read"],"profile.firstName":["read","write"],"profile.lastName":["read","write"],"profile.dob":["read","write"],"profile.city":["read","write"],"profile.communicationAddress":["read","write"],"profile.alternatePhone":["read","write"],"profile.curriculumSelections":["read","write"],"profile.stream":["read","write"],"profile.specialization":["read","write"]},"communications":["otp","account","class","payment","progress"],"features":["registration","profile","program","batch","parentLink"]}'::jsonb,
  'seed'
),
(
  'consent_terms_v1',
  'terms_and_conditions',
  '1.0',
  'Terms and Conditions',
  'Terms for account creation, platform use, classes, programs, payments, and communication.',
  'pdf',
  '/api/v1/ams/files/access-control/consents/mytution-terms-and-conditions-v1.pdf',
  'public',
  NULL,
  true,
  'active',
  '{"fields":{"profile.phone":["read"],"profile.role":["read"],"profile.firstName":["read","write"],"profile.lastName":["read","write"],"profile.dob":["read","write"],"profile.city":["read","write"],"profile.communicationAddress":["read","write"],"profile.alternatePhone":["read","write"],"profile.curriculumSelections":["read","write"],"profile.stream":["read","write"],"profile.specialization":["read","write"]},"communications":["otp","account","class","payment","progress"],"features":["registration","profile","program","batch","parentLink"]}'::jsonb,
  'seed'
),
(
  'consent_privacy_v1',
  'privacy_policy',
  '1.0',
  'Privacy Policy',
  'Policy for handling profile, learning, communication, payment, and parent-link information.',
  'pdf',
  '/api/v1/ams/files/access-control/consents/mytution-privacy-policy-v1.pdf',
  'public',
  NULL,
  true,
  'active',
  '{"fields":{"profile.phone":["read"],"profile.role":["read"],"profile.firstName":["read","write"],"profile.lastName":["read","write"],"profile.dob":["read","write"],"profile.city":["read","write"],"profile.communicationAddress":["read","write"],"profile.alternatePhone":["read","write"],"profile.curriculumSelections":["read","write"],"profile.stream":["read","write"],"profile.specialization":["read","write"]},"communications":["otp","account","class","payment","progress"],"features":["registration","profile","program","batch","parentLink"]}'::jsonb,
  'seed'
)
ON CONFLICT ("key", "version") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "documentType" = EXCLUDED."documentType",
  "documentUrl" = EXCLUDED."documentUrl",
  "accessLevel" = EXCLUDED."accessLevel",
  "required" = EXCLUDED."required",
  "status" = EXCLUDED."status",
  "permissionSet" = EXCLUDED."permissionSet",
  "updatedAt" = CURRENT_TIMESTAMP;
