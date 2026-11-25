import { db } from '../db'
import { sql } from 'drizzle-orm'

async function run() {
  console.log('[MIGRATION] Adding Berita Acara (BA) columns to hero_asset_disposals...')

  await db.execute(sql`
    ALTER TABLE hero_asset_disposals
    ADD COLUMN IF NOT EXISTS ba_documents TEXT,
    ADD COLUMN IF NOT EXISTS ba_submitted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS ba_submitted_by_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL;
  `)

  console.log('[MIGRATION] Successfully added ba_documents, ba_submitted_at, ba_submitted_by_id to hero_asset_disposals.')
  process.exit(0)
}

run().catch((err) => {
  console.error('[MIGRATION] Failed:', err)
  process.exit(1)
})
