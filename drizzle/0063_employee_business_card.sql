ALTER TABLE "hero_employees"
  ADD COLUMN IF NOT EXISTS "business_card_public_enabled" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "hero_employees"
  ADD COLUMN IF NOT EXISTS "business_card_public_token" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hero_employees_business_card_public_token_uq"
  ON "hero_employees" USING btree ("business_card_public_token");
