import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating inspection tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_inspections" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "site_name" varchar(255) NOT NULL,
      "customer_name" varchar(255) NOT NULL,
      "inspection_date" timestamp NOT NULL,
      "inspector_id" integer NOT NULL REFERENCES "hero_employees"("id") ON DELETE CASCADE,
      "shift" varchar(50) NOT NULL,
      "unit_name" varchar(255) NOT NULL,
      "notes" text,
      "status" varchar(50) DEFAULT 'draft' NOT NULL,
      "summary" text,
      "findings" text,
      "recommendations" text,
      "loading_score" double precision,
      "haul_road_score" double precision,
      "dumping_score" double precision,
      "total_score" double precision,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_inspection_checklists" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "inspection_id" uuid NOT NULL REFERENCES "hero_inspections"("id") ON DELETE CASCADE,
      "section" varchar(100) NOT NULL,
      "question" text NOT NULL,
      "answer" boolean NOT NULL,
      "score" integer NOT NULL,
      "remarks" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_inspection_photos" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "inspection_id" uuid NOT NULL REFERENCES "hero_inspections"("id") ON DELETE CASCADE,
      "section" varchar(100) NOT NULL,
      "image_url" varchar(1000) NOT NULL,
      "caption" text,
      "ai_caption" text,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  console.log("Inspection tables created successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error creating tables:", err);
  process.exit(1);
});
