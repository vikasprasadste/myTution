-- Phase 9 payments: orders/intents, program purchases, batch-payment linkage, and tutor accounting.

ALTER TABLE "BatchRequest"
  ADD COLUMN IF NOT EXISTS "paymentOrderId" TEXT;

CREATE TABLE IF NOT EXISTS "PaymentOrder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "programId" TEXT,
  "batchId" TEXT,
  "batchRequestId" TEXT,
  "tutorProfileId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'requires_payment',
  "gatewayProvider" TEXT NOT NULL DEFAULT 'mock',
  "gatewayOrderId" TEXT NOT NULL,
  "gatewayPaymentId" TEXT,
  "methodType" TEXT,
  "paymentRail" TEXT,
  "metadata" JSONB,
  "refundStatus" TEXT NOT NULL DEFAULT 'none',
  "cancelReason" TEXT,
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProgramPurchase" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "accessStatus" TEXT NOT NULL DEFAULT 'locked',
  "purchasedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgramPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TutorAccountingEntry" (
  "id" TEXT NOT NULL,
  "tutorProfileId" TEXT NOT NULL,
  "paymentOrderId" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "grossAmount" INTEGER NOT NULL,
  "platformFee" INTEGER NOT NULL,
  "netAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payoutReference" TEXT,
  "sourceTag" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TutorAccountingEntry_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentOrder_userId_fkey') THEN
    ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentOrder_profileId_fkey') THEN
    ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentOrder_programId_fkey') THEN
    ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentOrder_batchId_fkey') THEN
    ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "TutorBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentOrder_tutorProfileId_fkey') THEN
    ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_tutorProfileId_fkey"
      FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BatchRequest_paymentOrderId_fkey') THEN
    ALTER TABLE "BatchRequest" ADD CONSTRAINT "BatchRequest_paymentOrderId_fkey"
      FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgramPurchase_orderId_fkey') THEN
    ALTER TABLE "ProgramPurchase" ADD CONSTRAINT "ProgramPurchase_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgramPurchase_programId_fkey') THEN
    ALTER TABLE "ProgramPurchase" ADD CONSTRAINT "ProgramPurchase_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgramPurchase_studentProfileId_fkey') THEN
    ALTER TABLE "ProgramPurchase" ADD CONSTRAINT "ProgramPurchase_studentProfileId_fkey"
      FOREIGN KEY ("studentProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TutorAccountingEntry_tutorProfileId_fkey') THEN
    ALTER TABLE "TutorAccountingEntry" ADD CONSTRAINT "TutorAccountingEntry_tutorProfileId_fkey"
      FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TutorAccountingEntry_paymentOrderId_fkey') THEN
    ALTER TABLE "TutorAccountingEntry" ADD CONSTRAINT "TutorAccountingEntry_paymentOrderId_fkey"
      FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_gatewayOrderId_key" ON "PaymentOrder"("gatewayOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "BatchRequest_paymentOrderId_key" ON "BatchRequest"("paymentOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProgramPurchase_orderId_key" ON "ProgramPurchase"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProgramPurchase_programId_studentProfileId_key" ON "ProgramPurchase"("programId", "studentProfileId");

CREATE INDEX IF NOT EXISTS "PaymentOrder_profileId_status_createdAt_idx" ON "PaymentOrder"("profileId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentOrder_targetType_targetId_idx" ON "PaymentOrder"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "PaymentOrder_tutorProfileId_status_idx" ON "PaymentOrder"("tutorProfileId", "status");
CREATE INDEX IF NOT EXISTS "ProgramPurchase_studentProfileId_status_idx" ON "ProgramPurchase"("studentProfileId", "status");
CREATE INDEX IF NOT EXISTS "TutorAccountingEntry_tutorProfileId_status_idx" ON "TutorAccountingEntry"("tutorProfileId", "status");
CREATE INDEX IF NOT EXISTS "TutorAccountingEntry_paymentOrderId_idx" ON "TutorAccountingEntry"("paymentOrderId");
