import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating hc_candidate_interviews table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_hc_candidate_interviews" (
      "id" serial PRIMARY KEY NOT NULL,
      "candidate_id" integer NOT NULL,
      "scheduled_at" timestamp NOT NULL,
      "duration_minutes" integer DEFAULT 60 NOT NULL,
      "interview_type" text NOT NULL,
      "location_url" text NOT NULL,
      "interviewer_name" text NOT NULL,
      "status" text DEFAULT 'Scheduled' NOT NULL,
      "notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  
  console.log("Creating hc_candidate_mcu table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_hc_candidate_mcu" (
      "id" serial PRIMARY KEY NOT NULL,
      "candidate_id" integer NOT NULL,
      "clinic_name" text NOT NULL,
      "clinic_email" text NOT NULL,
      "mcu_package" text NOT NULL,
      "scheduled_date" timestamp NOT NULL,
      "status" text DEFAULT 'Scheduled' NOT NULL,
      "notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  
  console.log("Adding foreign keys if possible...");
  try {
    await db.execute(sql`
      ALTER TABLE "hero_hc_candidate_interviews" 
      ADD CONSTRAINT "hero_hc_candidate_interviews_candidate_id_hero_hc_candidates_id_fk" 
      FOREIGN KEY ("candidate_id") REFERENCES "public"."hero_hc_candidates"("id") ON DELETE cascade ON UPDATE no action;
    `);
  } catch (e) {
    console.log("FK candidate_id for interviews already exists or failed:", e.message);
  }

  try {
    await db.execute(sql`
      ALTER TABLE "hero_hc_candidate_mcu" 
      ADD CONSTRAINT "hero_hc_candidate_mcu_candidate_id_hero_hc_candidates_id_fk" 
      FOREIGN KEY ("candidate_id") REFERENCES "public"."hero_hc_candidates"("id") ON DELETE cascade ON UPDATE no action;
    `);
  } catch (e) {
    console.log("FK candidate_id for mcu already exists or failed:", e.message);
  }

  console.log("Done!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
