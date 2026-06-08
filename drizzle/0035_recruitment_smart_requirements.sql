ALTER TABLE "hero_hc_recruitments"
ADD COLUMN IF NOT EXISTS "scoring_criteria" jsonb;

ALTER TABLE "hero_hc_recruitments"
ADD COLUMN IF NOT EXISTS "knockout_criteria" jsonb;

ALTER TABLE "hero_hc_candidates"
ADD COLUMN IF NOT EXISTS "ai_details" jsonb;
