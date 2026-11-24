import { db } from '../db'
import { sql } from 'drizzle-orm'

async function run() {
  console.log('[MIGRATION] Adding sale flow columns to hero_asset_disposals...')
  
  await db.execute(sql`
    ALTER TABLE hero_asset_disposals
    ADD COLUMN IF NOT EXISTS total_estimated_sale_price DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS auction_documents TEXT,
    ADD COLUMN IF NOT EXISTS auction_submitted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS auction_submitted_by_id INTEGER,
    ADD COLUMN IF NOT EXISTS finance_documents TEXT,
    ADD COLUMN IF NOT EXISTS finance_submitted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS finance_submitted_by_id INTEGER;
  `)

  console.log('[MIGRATION] Successfully updated hero_asset_disposals schema.')
  process.exit(0)
}

run().catch((err) => {
  console.error('[MIGRATION] Failed:', err)
  process.exit(1)
})
