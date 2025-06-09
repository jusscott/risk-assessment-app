-- Add status column to Report table
ALTER TABLE "Report" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';

-- Add index for status column for better query performance
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- Add check constraint to ensure valid status values
ALTER TABLE "Report" ADD CONSTRAINT "Report_status_check" 
CHECK ("status" IN ('pending', 'processing', 'completed', 'failed'));
