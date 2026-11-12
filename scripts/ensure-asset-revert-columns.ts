import { db } from '../db'
import { sql } from 'drizzle-orm'

async function run() {
  console.log('Ensuring revert columns for asset management tables...')

  // hero_asset_borrows
  await db.execute(sql`
    ALTER TABLE hero_asset_borrows
    ADD COLUMN IF NOT EXISTS current_step_order integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS last_reverted_by_employee_id integer REFERENCES hero_employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_revert_step_order integer,
    ADD COLUMN IF NOT EXISTS last_revert_note text;
  `)
  console.log('✓ hero_asset_borrows updated')

  // hero_asset_transfers
  await db.execute(sql`
    ALTER TABLE hero_asset_transfers
    ADD COLUMN IF NOT EXISTS last_reverted_by_employee_id integer REFERENCES hero_employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_revert_step_order integer,
    ADD COLUMN IF NOT EXISTS last_revert_note text;
  `)
  console.log('✓ hero_asset_transfers updated')

  // hero_asset_disposals
  await db.execute(sql`
    ALTER TABLE hero_asset_disposals
    ADD COLUMN IF NOT EXISTS last_reverted_by_employee_id integer REFERENCES hero_employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_revert_step_order integer,
    ADD COLUMN IF NOT EXISTS last_revert_note text;
  `)
  console.log('✓ hero_asset_disposals updated')

  // hero_cer_requests
  await db.execute(sql`
    ALTER TABLE hero_cer_requests
    ADD COLUMN IF NOT EXISTS last_reverted_by_employee_id integer,
    ADD COLUMN IF NOT EXISTS last_revert_step_order integer,
    ADD COLUMN IF NOT EXISTS last_revert_note text;
  `)
  console.log('✓ hero_cer_requests verified')

  console.log('Database migration successfully finished!')
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration error:', err)
    process.exit(1)
  })
