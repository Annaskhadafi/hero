ALTER TABLE "maestro_customer_locations"
  DROP CONSTRAINT IF EXISTS "maestro_customer_locations_location_id_fkey";
--> statement-breakpoint
ALTER TABLE "maestro_customer_locations"
  ADD CONSTRAINT "maestro_customer_locations_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "hero_sites"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "maestro_customer_user_locations"
  DROP CONSTRAINT IF EXISTS "maestro_customer_user_locations_location_id_fkey";
--> statement-breakpoint
ALTER TABLE "maestro_customer_user_locations"
  ADD CONSTRAINT "maestro_customer_user_locations_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "hero_sites"("id") ON DELETE CASCADE;
