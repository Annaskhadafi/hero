import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Adding location_detail column to hero_hse_osm_sessions...')
  await db.execute(sql`
    ALTER TABLE "hero_hse_osm_sessions"
    ADD COLUMN IF NOT EXISTS "location_detail" TEXT DEFAULT '';
  `)
  console.log('✅ Column location_detail added successfully!')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
