import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`ALTER TABLE hero_employees ADD COLUMN IF NOT EXISTS manpower text NOT NULL DEFAULT 'Lokal'`);
    console.log('Migration applied: manpower column added to hero_employees');
  } catch (e) {
    console.error('Migration failed:', (e as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
