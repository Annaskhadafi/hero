import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  const silviResult: any = await db.execute(sql`
    SELECT id, name, job_title, email, direct_manager_id FROM hero_employees WHERE name ILIKE '%silvi%' OR name ILIKE '%furqon%'
  `)
  console.log('Search Silvi & Furqon:', silviResult.rows || silviResult)
}

main().then(() => process.exit(0)).catch(console.error)
