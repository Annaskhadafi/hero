import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('--- ADDING auditor_signature_url TO hero_five_r_reports ---')
  await db.execute(sql`ALTER TABLE hero_five_r_reports ADD COLUMN IF NOT EXISTS auditor_signature_url text;`)
  console.log('✅ Column auditor_signature_url added successfully!')
}

main().then(() => process.exit(0)).catch(console.error)
