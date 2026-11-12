import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('Creating twibbon_templates table...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS twibbon_templates (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        caption_text TEXT,
        category TEXT NOT NULL DEFAULT 'Campaign',
        square_url TEXT,
        portrait_url TEXT,
        story_url TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        usage_count INTEGER NOT NULL DEFAULT 0,
        created_by_user_id TEXT,
        created_by_employee_id INTEGER,
        created_by_name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS twibbon_templates_status_idx ON twibbon_templates (status);
      CREATE INDEX IF NOT EXISTS twibbon_templates_created_at_idx ON twibbon_templates (created_at DESC);
    `)

    const res = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'twibbon_templates'
      ORDER BY ordinal_position;
    `)
    console.log('Verified columns on twibbon_templates:')
    for (const row of res.rows) {
      console.log(` - ${row.column_name} (${row.data_type})`)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Failed creating twibbon_templates:', err)
  process.exit(1)
})
