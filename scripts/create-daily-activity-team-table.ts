import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('👥 Creating hero_daily_activity_session_team_members table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_daily_activity_session_team_members (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES hero_daily_activity_sessions(id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS hero_daily_activity_session_team_members_session_emp_uq
        ON hero_daily_activity_session_team_members (session_id, employee_id);

      CREATE INDEX IF NOT EXISTS hero_daily_activity_session_team_members_emp_idx
        ON hero_daily_activity_session_team_members (employee_id);
    `)
    console.log('  ✓ hero_daily_activity_session_team_members table verified.')
  } catch (err) {
    console.error('Error creating table:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
