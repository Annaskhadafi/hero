CREATE TABLE IF NOT EXISTS "maestro_customer_locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "location_id" integer NOT NULL REFERENCES "hero_sites"("id") ON DELETE CASCADE,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_customer_locations_customer_location_uq"
  ON "maestro_customer_locations" ("customer_id", "location_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_customer_user_locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "maestro_customer_users"("id") ON DELETE CASCADE,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "location_id" integer NOT NULL REFERENCES "hero_sites"("id") ON DELETE CASCADE,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_customer_user_locations_user_customer_location_uq"
  ON "maestro_customer_user_locations" ("user_id", "customer_id", "location_id");
