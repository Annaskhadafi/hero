import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  await db.execute(sql`ALTER TABLE hero_five_r_reports ADD COLUMN IF NOT EXISTS reverted_from_level integer;`)
  console.log('✅ Column reverted_from_level verified on hero_five_r_reports')
}

main().then(() => process.exit(0)).catch(console.error)
