-- Add stripeId and stripePriceId fields to Plan table
ALTER TABLE "Plan" ADD COLUMN "stripeId" TEXT;
ALTER TABLE "Plan" ADD COLUMN "stripePriceId" TEXT;
