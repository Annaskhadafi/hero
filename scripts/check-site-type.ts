import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env' });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='hero_sites' AND column_name='site_type'"
  );
  console.log('site_type exists:', r.rows.length > 0);
  if (r.rows.length === 0) {
    console.log('Adding site_type column...');
    await pool.query(`ALTER TABLE hero_sites ADD COLUMN site_type text NOT NULL DEFAULT 'Site'`);
    console.log('Column added.');
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
