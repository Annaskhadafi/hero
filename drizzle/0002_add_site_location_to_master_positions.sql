ALTER TABLE "hero_master_positions"
ADD COLUMN IF NOT EXISTS "site_location" text DEFAULT '' NOT NULL;
