import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Ensuring hero_mine_permit_reminder_config table and columns exist...')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_mine_permit_reminder_config (
      id SERIAL PRIMARY KEY,
      site_id INTEGER REFERENCES hero_sites(id) ON DELETE CASCADE,
      interval_days INTEGER NOT NULL DEFAULT 1,
      reminder_days INTEGER NOT NULL DEFAULT 30,
      recipient_employee_ids TEXT NOT NULL DEFAULT '[]',
      cc_employee_ids TEXT NOT NULL DEFAULT '[]',
      additional_cc_emails TEXT NOT NULL DEFAULT '',
      additional_recipients TEXT NOT NULL DEFAULT '',
      excluded_manager_ids TEXT NOT NULL DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_sent_at TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_by TEXT
    );
  `)

  const columnsToAdd = [
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES hero_sites(id) ON DELETE CASCADE;`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS interval_days INTEGER NOT NULL DEFAULT 1;`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS reminder_days INTEGER NOT NULL DEFAULT 30;`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS recipient_employee_ids TEXT NOT NULL DEFAULT '[]';`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS cc_employee_ids TEXT NOT NULL DEFAULT '[]';`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS additional_cc_emails TEXT NOT NULL DEFAULT '';`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS additional_recipients TEXT NOT NULL DEFAULT '';`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS excluded_manager_ids TEXT NOT NULL DEFAULT '[]';`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP;`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();`,
    sql`ALTER TABLE hero_mine_permit_reminder_config ADD COLUMN IF NOT EXISTS updated_by TEXT;`,
  ]

  for (const alterSql of columnsToAdd) {
    try {
      await db.execute(alterSql)
    } catch (e: any) {
      console.log('Notice on column alter:', e.message)
    }
  }

  // Check columns
  const result: any = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'hero_mine_permit_reminder_config' 
    ORDER BY ordinal_position;
  `)
  const rows = result.rows || result || []
  const cols = rows.map((r: any) => r.column_name)
  console.log('hero_mine_permit_reminder_config columns in DB:', cols.join(', '))

  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
