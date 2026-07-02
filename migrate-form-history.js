import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_service360_form_history" (
        "id" serial PRIMARY KEY NOT NULL,
        "customer_id" integer NOT NULL,
        "field" text NOT NULL,
        "value" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "hero_service360_form_history" ADD CONSTRAINT "hero_service360_form_history_customer_id_hero_service360_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."hero_service360_customers"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "hero_service360_form_history_unique_idx" ON "hero_service360_form_history" USING btree ("customer_id","field","value");
    `);

    console.log("Migration successful");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
