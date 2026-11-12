import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Ensuring columns for Asset Management...')
  await db.execute(sql`ALTER TABLE hero_approvals ADD COLUMN IF NOT EXISTS asset_borrow_id integer;`)
  await db.execute(sql`ALTER TABLE hero_asset_borrows ADD COLUMN IF NOT EXISTS pdf_url text;`)
  await db.execute(sql`ALTER TABLE hero_asset_transfers ADD COLUMN IF NOT EXISTS pdf_url text;`)
  await db.execute(sql`ALTER TABLE hero_cer_requests ADD COLUMN IF NOT EXISTS bast_pdf_url text;`)
  await db.execute(sql`ALTER TABLE hero_cer_requests ADD COLUMN IF NOT EXISTS receiver_signature_url text;`)
  await db.execute(sql`ALTER TABLE hero_cer_items ADD COLUMN IF NOT EXISTS holder_employee_id integer;`)
  console.log('✓ All asset management columns successfully verified in database!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration error:', err)
  process.exit(1)
})
