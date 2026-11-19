import { db } from '../db'
import { sql } from 'drizzle-orm'

async function migrateAndClean() {
  console.log('1. Adding items column to hero_asset_disposals if not exists...')
  await db.execute(sql`
    ALTER TABLE hero_asset_disposals 
    ADD COLUMN IF NOT EXISTS items text NOT NULL DEFAULT '[]';
  `)
  console.log('✓ items column added/ensured.')

  console.log('2. Clearing existing history of asset disposals per request...')
  await db.execute(sql`DELETE FROM hero_approvals WHERE asset_disposal_id IS NOT NULL;`)
  await db.execute(sql`DELETE FROM hero_asset_disposals;`)
  console.log('✓ Existing history of asset disposals and approvals deleted successfully.')

  process.exit(0)
}

migrateAndClean().catch((err) => {
  console.error(err)
  process.exit(1)
})
