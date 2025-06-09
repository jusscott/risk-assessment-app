-- Add active field to Plan table
ALTER TABLE "Plan" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
