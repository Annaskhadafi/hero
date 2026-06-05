const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client(process.env.DATABASE_URL);

async function run() {
  await client.connect();
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS "hero_hc_online_test_groups" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "slug" text NOT NULL UNIQUE,
      "description" text DEFAULT '' NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "hero_hc_online_test_group_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "group_id" integer NOT NULL,
      "test_id" integer NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      CONSTRAINT "hero_hc_online_test_group_items_group_id_hero_hc_online_test_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "hero_hc_online_test_groups"("id") ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "hero_hc_online_test_group_items_test_id_hero_hc_online_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "hero_hc_online_tests"("id") ON DELETE cascade ON UPDATE no action
    );
  `);

  console.log('Tables created successfully');
  await client.end();
}

run().catch(console.error);
