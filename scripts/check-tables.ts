import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  const result = await db.execute(sql`
    SELECT tablename FROM pg_catalog.pg_tables 
    WHERE schemaname = 'public' 
    AND tablename LIKE '%checklist%'
  `)
  console.log('Checklist tables in DB:', result.rows)
  process.exit(0)
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
