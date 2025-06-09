-- Add usage-based billing fields to Plan table
ALTER TABLE "Plan" ADD COLUMN "usageBasedBilling" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN "usagePricePerUnit" FLOAT;
ALTER TABLE "Plan" ADD COLUMN "usageType" TEXT;
ALTER TABLE "Plan" ADD COLUMN "includedUsage" INTEGER;

-- Create UsageRecord table
CREATE TABLE "UsageRecord" (
  "id" SERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "subscriptionId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "usageType" TEXT NOT NULL,
  "description" TEXT,
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "billingPeriodStart" TIMESTAMP NOT NULL,
  "billingPeriodEnd" TIMESTAMP NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "invoiceId" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for UsageRecord
CREATE INDEX "UsageRecord_userId_idx" ON "UsageRecord"("userId");
CREATE INDEX "UsageRecord_subscriptionId_idx" ON "UsageRecord"("subscriptionId");
CREATE INDEX "UsageRecord_billingPeriod_idx" ON "UsageRecord"("billingPeriodStart", "billingPeriodEnd");
CREATE INDEX "UsageRecord_processed_idx" ON "UsageRecord"("processed");

-- Add foreign key for UsageRecord.subscriptionId
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key for UsageRecord.invoiceId
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add stripeCustomerId and stripeSubscriptionId to Subscription
ALTER TABLE "Subscription" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "stripeSubscriptionId" TEXT;

-- Add items, metadata to Invoice
ALTER TABLE "Invoice" ADD COLUMN "items" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Invoice" ADD COLUMN "metadata" JSONB;
ALTER TABLE "Invoice" ADD COLUMN "paymentIntentId" TEXT;
