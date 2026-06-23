-- Make activity_id nullable in hero_approvals for non-activity approval flows
-- (e.g., attendance permission, contract review, etc.)
ALTER TABLE "hero_approvals" ALTER COLUMN "activity_id" DROP NOT NULL;
