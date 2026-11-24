/**
 * Migration script: Create expo_business_cards table
 * Run: npx tsx scripts/create-business-cards-table.ts
 */
import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL is required')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('Creating expo_business_cards table...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS expo_business_cards (
        id SERIAL PRIMARY KEY,
        expo_name TEXT NOT NULL DEFAULT '',
        contact_name TEXT NOT NULL DEFAULT '',
        company_name TEXT NOT NULL DEFAULT '',
        job_title TEXT NOT NULL DEFAULT '',
        phone_number TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        card_image_url TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'lead',
        rating TEXT NOT NULL DEFAULT 'warm',
        created_by_id TEXT,
        created_by_name TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS expo_bc_contact_name_idx ON expo_business_cards (contact_name);
      CREATE INDEX IF NOT EXISTS expo_bc_company_name_idx ON expo_business_cards (company_name);
      CREATE INDEX IF NOT EXISTS expo_bc_expo_name_idx ON expo_business_cards (expo_name);
      CREATE INDEX IF NOT EXISTS expo_bc_created_at_idx ON expo_business_cards (created_at DESC);
    `)

    console.log('Successfully created expo_business_cards table!')
  } catch (err) {
    console.error('Error creating expo_business_cards table:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
