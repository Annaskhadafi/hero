import { db } from '../db/index'
import { sql } from 'drizzle-orm'

async function drop() {
  console.log('Dropping tables...')
  await db.execute(sql`DROP TABLE IF EXISTS hero_hiradc_entries CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS hero_hiradc_registers CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS hero_hiradc_imports CASCADE;`)
  console.log('Done dropping.')
  process.exit(0)
}

drop().catch(err => { console.error(err); process.exit(1); })
