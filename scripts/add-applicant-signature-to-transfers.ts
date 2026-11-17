import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  await db.execute(sql`
    ALTER TABLE hero_asset_transfers 
    ADD COLUMN IF NOT EXISTS applicant_signature_url TEXT;
  `)
  console.log('✅ Column applicant_signature_url added to hero_asset_transfers successfully!')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
