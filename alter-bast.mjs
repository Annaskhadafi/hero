import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function alterTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Alter hero_service360_quotations
    const qCols = [
      'ADD COLUMN IF NOT EXISTS "include_bast" boolean DEFAULT false'
    ];
    await client.query(`ALTER TABLE "hero_service360_quotations" ${qCols.join(', ')};`);

    await client.query('COMMIT');
    console.log("360 Service tables altered successfully with include_bast.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error altering tables:", e);
  } finally {
    client.release();
    pool.end();
  }
}

alterTables();
