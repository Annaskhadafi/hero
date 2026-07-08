import { Pool } from 'pg';
import { config } from 'dotenv';

config({ path: '.env' });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`ALTER TABLE hero_sites ADD COLUMN IF NOT EXISTS site_type text NOT NULL DEFAULT 'Site'`);
    console.log('Migration applied: site_type column added to hero_sites');
  } catch (e) {
    console.error('Migration failed:', (e as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
