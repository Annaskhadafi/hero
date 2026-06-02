import { db } from '../db'
import { sql } from 'drizzle-orm'

async function createTable() {
  console.log('Creating table hero_safety_inductions...')
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_safety_inductions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "full_name" varchar(255) NOT NULL,
      "company_origin" varchar(255) NOT NULL,
      "phone_number" varchar(50) NOT NULL,
      "purpose" text NOT NULL,
      "signature_url" varchar(2048),
      "agreed_at" timestamp DEFAULT now() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `)
  console.log('Table created successfully.')
}

createTable().catch(console.error).finally(() => process.exit(0))
