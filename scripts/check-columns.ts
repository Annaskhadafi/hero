import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });

async function main() {
  const url = process.env.DATABASE_URL || '';
  console.log('Connecting to:', url.replace(/:[^@]+@/, ':***@'));

  const pool = new Pool({ connectionString: url });
  const r = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='hero_sites' ORDER BY ordinal_position"
  );
  console.log('Columns:', r.rows.map((x) => x.column_name).join(', '));

  const hasSiteType = r.rows.some((x) => x.column_name === 'site_type');
  console.log('site_type exists:', hasSiteType);

  if (!hasSiteType) {
    console.log('Adding site_type column...');
    await pool.query(`ALTER TABLE hero_sites ADD COLUMN site_type text NOT NULL DEFAULT 'Site'`);
    console.log('Done!');
  }
  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
