import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  await db.execute(sql`
    ALTER TABLE hero_asset_transfers 
    ADD COLUMN IF NOT EXISTS received_photos TEXT NOT NULL DEFAULT '[]';
  `)
  console.log('✅ Column received_photos added to hero_asset_transfers successfully!')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
