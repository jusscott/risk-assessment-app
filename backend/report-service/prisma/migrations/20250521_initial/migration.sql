-- CreateTable
CREATE TABLE "Report" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "analysisId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "filePath" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "accessCode" TEXT NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
  "id" SERIAL NOT NULL,
  "reportId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportShare" (
  "id" SERIAL NOT NULL,
  "reportId" INTEGER NOT NULL,
  "email" TEXT NOT NULL,
  "accessCode" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Section_reportId_idx" ON "Section"("reportId");

-- CreateIndex
CREATE INDEX "ReportShare_reportId_idx" ON "ReportShare"("reportId");

-- CreateIndex
CREATE INDEX "ReportShare_accessCode_idx" ON "ReportShare"("accessCode");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
