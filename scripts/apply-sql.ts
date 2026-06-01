import { db } from '../db/index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'

async function runSQL() {
  console.log('Running SQL from 0028_dashing_zemo.sql')
  const content = readFileSync('./drizzle/0028_dashing_zemo.sql', 'utf-8')
  
  // simple split by statement-breakpoint (Drizzle's default separator)
  const statements = content.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)
  
  for (const stmt of statements) {
    console.log('Executing:', stmt.substring(0, 60) + '...')
    try {
      await db.execute(sql.raw(stmt))
      console.log('Success')
    } catch (err: any) {
      console.error('Failed to execute statement:', err.message)
    }
  }
  
  console.log('Done.')
  process.exit(0)
}

runSQL().catch(err => {
  console.error(err)
  process.exit(1)
})
