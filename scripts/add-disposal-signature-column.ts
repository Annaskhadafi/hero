import { db } from '../db'
import { sql } from 'drizzle-orm'

async function run() {
  console.log('Adding applicant_signature_url to hero_asset_disposals...')
  await db.execute(sql`
    ALTER TABLE hero_asset_disposals
    ADD COLUMN IF NOT EXISTS applicant_signature_url text;
  `)
  console.log('✓ Column applicant_signature_url added successfully')
  process.exit(0)
}

run().catch((err) => {
  console.error('Error migrating DB:', err)
  process.exit(1)
})
