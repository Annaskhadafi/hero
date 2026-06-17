import { db } from '@/db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('[push-sio] Creating hero_sio_certifications table...')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_sio_certifications" (
      "id" serial PRIMARY KEY,
      "employee_id" integer NOT NULL REFERENCES "hero_employees"("id") ON DELETE CASCADE,
      "cert_type" text NOT NULL,
      "cert_number" text,
      "cert_name" text NOT NULL,
      "issuing_body" text,
      "cert_date" date,
      "expiry_date" date,
      "status" text NOT NULL,
      "notes" text,
      "last_sync_from" text NOT NULL DEFAULT 'manual',
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    );
  `)
  console.log('[push-sio] Table created.')

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "hero_sio_certifications_employee_cert_uq"
    ON "hero_sio_certifications" ("employee_id", "cert_type", "cert_name");
  `)
  console.log('[push-sio] Unique index created.')

  console.log('[push-sio] Done.')
}

main().catch((err) => {
  console.error('[push-sio] Error:', err)
  process.exit(1)
})
