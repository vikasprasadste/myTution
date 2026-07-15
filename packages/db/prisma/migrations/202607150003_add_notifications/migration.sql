CREATE TABLE IF NOT EXISTS "DeviceRegistration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT,
  "role" "Role" NOT NULL,
  "platform" TEXT NOT NULL,
  "pushToken" TEXT NOT NULL,
  "deviceId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'expo',
  "status" TEXT NOT NULL DEFAULT 'active',
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT,
  "role" "Role" NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB,
  "channel" TEXT NOT NULL DEFAULT 'in_app',
  "provider" TEXT NOT NULL DEFAULT 'internal',
  "providerMessageId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeviceRegistration_pushToken_key" ON "DeviceRegistration"("pushToken");
CREATE INDEX IF NOT EXISTS "DeviceRegistration_userId_status_idx" ON "DeviceRegistration"("userId", "status");
CREATE INDEX IF NOT EXISTS "DeviceRegistration_profileId_status_idx" ON "DeviceRegistration"("profileId", "status");
CREATE INDEX IF NOT EXISTS "DeviceRegistration_role_status_idx" ON "DeviceRegistration"("role", "status");

CREATE INDEX IF NOT EXISTS "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_profileId_status_createdAt_idx" ON "Notification"("profileId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_scheduledAt_status_idx" ON "Notification"("scheduledAt", "status");
CREATE INDEX IF NOT EXISTS "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DeviceRegistration_userId_fkey'
  ) THEN
    ALTER TABLE "DeviceRegistration"
    ADD CONSTRAINT "DeviceRegistration_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DeviceRegistration_profileId_fkey'
  ) THEN
    ALTER TABLE "DeviceRegistration"
    ADD CONSTRAINT "DeviceRegistration_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey'
  ) THEN
    ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_profileId_fkey'
  ) THEN
    ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
