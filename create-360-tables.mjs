import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "hero_service360_customers" (
        "id" serial PRIMARY KEY NOT NULL,
        "customer_name" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "hero_service360_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "category" text NOT NULL,
        "site_id" integer,
        "name" text NOT NULL,
        "price" numeric(15, 2) DEFAULT '0' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "hero_service360_quotations" (
        "id" serial PRIMARY KEY NOT NULL,
        "quotation_number" text NOT NULL,
        "customer_id" integer NOT NULL,
        "quotation_date" date NOT NULL,
        "tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
        "tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
        "sub_total" numeric(15, 2) DEFAULT '0' NOT NULL,
        "total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
        "status" text DEFAULT 'Draft' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "hero_service360_quotations_quotation_number_unique" UNIQUE("quotation_number")
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "hero_service360_quotation_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "quotation_id" integer NOT NULL,
        "item_id" integer NOT NULL,
        "quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
        "price" numeric(15, 2) DEFAULT '0' NOT NULL,
        "subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await client.query(`
      DO $$ BEGIN
       ALTER TABLE "hero_service360_items" ADD CONSTRAINT "hero_service360_items_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
       ALTER TABLE "hero_service360_quotations" ADD CONSTRAINT "hero_service360_quotations_customer_id_hero_service360_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."hero_service360_customers"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
       ALTER TABLE "hero_service360_quotation_items" ADD CONSTRAINT "hero_service360_quotation_items_quotation_id_hero_service360_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."hero_service360_quotations"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
       ALTER TABLE "hero_service360_quotation_items" ADD CONSTRAINT "hero_service360_quotation_items_item_id_hero_service360_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."hero_service360_items"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query('COMMIT');
    console.log("360 Service tables created successfully.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error creating tables:", e);
  } finally {
    client.release();
    pool.end();
  }
}

createTables();
