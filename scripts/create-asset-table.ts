import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating hero_central_service_assets table...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_central_service_assets" (
      "id" serial PRIMARY KEY NOT NULL,
      "work_section" text DEFAULT '' NOT NULL,
      "section" text DEFAULT '' NOT NULL,
      "location" text DEFAULT '' NOT NULL,
      "description" text DEFAULT '' NOT NULL,
      "asset_number" text,
      "serial_number" text,
      "purchase_date" timestamp,
      "delivery_to_site_date" timestamp,
      "last_calibration_date" timestamp,
      "calibration_cycle_months" integer,
      "calibration_due_date" timestamp,
      "certificate_date" timestamp,
      "certificate_cycle_months" integer,
      "certificate_due_date" timestamp,
      "condition" text DEFAULT '' NOT NULL,
      "qty" integer DEFAULT 1 NOT NULL,
      "remarks" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS "cs_asset_number_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "hero_central_service_assets" ADD COLUMN IF NOT EXISTS "work_section" text DEFAULT '' NOT NULL;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_central_service_asset_attachments" (
      "id" serial PRIMARY KEY NOT NULL,
      "asset_id" integer NOT NULL REFERENCES "hero_central_service_assets"("id") ON DELETE CASCADE,
      "file_name" text DEFAULT '' NOT NULL,
      "file_url" text NOT NULL,
      "mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
      "file_size" integer,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "cs_asset_attachment_asset_idx"
    ON "hero_central_service_asset_attachments" ("asset_id");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_central_service_asset_histories" (
      "id" serial PRIMARY KEY NOT NULL,
      "asset_id" integer NOT NULL REFERENCES "hero_central_service_assets"("id") ON DELETE CASCADE,
      "action" text DEFAULT 'update' NOT NULL,
      "field_name" text DEFAULT '' NOT NULL,
      "field_label" text DEFAULT '' NOT NULL,
      "previous_value" text,
      "new_value" text,
      "change_remark" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "cs_asset_history_asset_idx"
    ON "hero_central_service_asset_histories" ("asset_id");
  `);

  console.log("Table hero_central_service_assets created successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error creating table:", err);
  process.exit(1);
});
