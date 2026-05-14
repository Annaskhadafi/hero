import { config } from 'dotenv'
config({ path: '.env.local' })
config() // fallback to .env

import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Applying face recognition migration...')

  await db.execute(sql`
    ALTER TABLE hero_attendance_records ADD COLUMN IF NOT EXISTS confidence_score numeric(4,3);
  `)
  await db.execute(sql`
    ALTER TABLE hero_attendance_records ADD COLUMN IF NOT EXISTS device_type text;
  `)
  await db.execute(sql`
    ALTER TABLE hero_attendance_records ADD COLUMN IF NOT EXISTS client_request_id text;
  `)
  await db.execute(sql`
    ALTER TABLE hero_employees ADD COLUMN IF NOT EXISTS face_embedding jsonb;
  `)
  await db.execute(sql`
    ALTER TABLE hero_employees ADD COLUMN IF NOT EXISTS face_registered_at timestamp;
  `)

  // Add unique index on client_request_id if not exists
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS hero_attendance_records_client_request_id_uq
    ON hero_attendance_records (client_request_id)
    WHERE client_request_id IS NOT NULL;
  `)

  console.log('Migration applied successfully!')
  process.exit(0)
}

main().catch((e) => {
  console.error('Migration failed:', e.message)
  process.exit(1)
})
