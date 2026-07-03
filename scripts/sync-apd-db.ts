import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Running DDL for APD...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_apd_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "request_number" text NOT NULL UNIQUE,
      "employee_id" integer NOT NULL,
      "site_id" integer NOT NULL,
      "request_date" timestamp DEFAULT now() NOT NULL,
      "status" text DEFAULT 'pending' NOT NULL,
      "notes" text DEFAULT '' NOT NULL,
      "signature_url" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_apd_request_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "request_id" integer NOT NULL REFERENCES "hero_apd_requests"("id") ON DELETE CASCADE,
      "item_type" text NOT NULL,
      "request_type" text NOT NULL,
      "photo_url" text,
      "quantity" integer DEFAULT 1 NOT NULL,
      "notes" text DEFAULT '' NOT NULL
    );
  `);

  await db.execute(sql`
    ALTER TABLE "hero_approvals" ADD COLUMN IF NOT EXISTS "apd_request_id" integer REFERENCES "hero_apd_requests"("id") ON DELETE CASCADE;
  `);

  console.log("Done!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
