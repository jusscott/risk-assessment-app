-- CreateTable
CREATE TABLE "CustomRule" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "criteria" JSONB NOT NULL,
  "severity" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleResult" (
  "id" SERIAL NOT NULL,
  "analysisId" INTEGER NOT NULL,
  "ruleId" INTEGER NOT NULL,
  "matched" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RuleResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomRule_userId_idx" ON "CustomRule"("userId");

-- CreateIndex
CREATE INDEX "RuleResult_analysisId_idx" ON "RuleResult"("analysisId");
CREATE INDEX "RuleResult_ruleId_idx" ON "RuleResult"("ruleId");

-- AddForeignKey
ALTER TABLE "RuleResult" ADD CONSTRAINT "RuleResult_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleResult" ADD CONSTRAINT "RuleResult_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CustomRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
