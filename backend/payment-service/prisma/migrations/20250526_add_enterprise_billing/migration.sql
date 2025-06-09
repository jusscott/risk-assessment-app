-- CreateTable
CREATE TABLE "Organization" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "billingEmail" VARCHAR(255) NOT NULL,
  "billingAddress" TEXT,
  "taxId" VARCHAR(100),
  "status" VARCHAR(50) NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "costCenter" VARCHAR(100),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  PRIMARY KEY ("id"),
  CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnterprisePlan" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "planId" INTEGER NOT NULL,
  "seats" INTEGER NOT NULL,
  "customPrice" DECIMAL(10,2),
  "volumeDiscount" DECIMAL(5,2),
  "billingCycle" VARCHAR(50) NOT NULL DEFAULT 'monthly',
  "nextBillingDate" TIMESTAMP(3) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  PRIMARY KEY ("id"),
  CONSTRAINT "EnterprisePlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EnterprisePlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnterpriseSubscription" (
  "id" SERIAL NOT NULL,
  "enterprisePlanId" INTEGER NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  "departmentId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  PRIMARY KEY ("id"),
  CONSTRAINT "EnterpriseSubscription_enterprisePlanId_fkey" FOREIGN KEY ("enterprisePlanId") REFERENCES "EnterprisePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EnterpriseSubscription_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnterpriseUsageQuota" (
  "id" SERIAL NOT NULL,
  "enterprisePlanId" INTEGER NOT NULL,
  "usageType" VARCHAR(100) NOT NULL,
  "pooled" BOOLEAN NOT NULL DEFAULT true,
  "totalQuota" INTEGER NOT NULL,
  "perSeatQuota" INTEGER,
  "unitPrice" DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  PRIMARY KEY ("id"),
  CONSTRAINT "EnterpriseUsageQuota_enterprisePlanId_fkey" FOREIGN KEY ("enterprisePlanId") REFERENCES "EnterprisePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnterpriseUsageSummary" (
  "id" SERIAL NOT NULL,
  "enterprisePlanId" INTEGER NOT NULL,
  "departmentId" INTEGER,
  "usageType" VARCHAR(100) NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "totalUsage" INTEGER NOT NULL DEFAULT 0,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  PRIMARY KEY ("id"),
  CONSTRAINT "EnterpriseUsageSummary_enterprisePlanId_fkey" FOREIGN KEY ("enterprisePlanId") REFERENCES "EnterprisePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EnterpriseUsageSummary_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnterpriseInvoice" (
  "id" SERIAL NOT NULL,
  "organizationId" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "billingPeriodStart" TIMESTAMP(3) NOT NULL,
  "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
  "items" JSONB NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  PRIMARY KEY ("id"),
  CONSTRAINT "EnterpriseInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add relation to UsageRecord
ALTER TABLE "UsageRecord" ADD COLUMN "departmentId" INTEGER;
ALTER TABLE "UsageRecord" ADD COLUMN "enterpriseSubscriptionId" INTEGER;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_enterpriseSubscriptionId_fkey" FOREIGN KEY ("enterpriseSubscriptionId") REFERENCES "EnterpriseSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add isEnterprise flag to Subscription
ALTER TABLE "Subscription" ADD COLUMN "isEnterprise" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes
CREATE INDEX "idx_organization_status" ON "Organization"("status");
CREATE INDEX "idx_department_organizationId" ON "Department"("organizationId");
CREATE INDEX "idx_enterprise_plan_organizationId" ON "EnterprisePlan"("organizationId");
CREATE INDEX "idx_enterprise_plan_status" ON "EnterprisePlan"("status");
CREATE INDEX "idx_enterprise_subscription_enterprisePlanId" ON "EnterpriseSubscription"("enterprisePlanId");
CREATE INDEX "idx_enterprise_subscription_userId" ON "EnterpriseSubscription"("userId");
CREATE INDEX "idx_enterprise_subscription_departmentId" ON "EnterpriseSubscription"("departmentId");
CREATE INDEX "idx_enterprise_usage_quota_enterprisePlanId" ON "EnterpriseUsageQuota"("enterprisePlanId");
CREATE INDEX "idx_enterprise_usage_summary_enterprisePlanId" ON "EnterpriseUsageSummary"("enterprisePlanId");
CREATE INDEX "idx_enterprise_usage_summary_departmentId" ON "EnterpriseUsageSummary"("departmentId");
CREATE INDEX "idx_enterprise_invoice_organizationId" ON "EnterpriseInvoice"("organizationId");
CREATE INDEX "idx_enterprise_invoice_status" ON "EnterpriseInvoice"("status");
CREATE INDEX "idx_usage_record_departmentId" ON "UsageRecord"("departmentId");
CREATE INDEX "idx_usage_record_enterpriseSubscriptionId" ON "UsageRecord"("enterpriseSubscriptionId");
