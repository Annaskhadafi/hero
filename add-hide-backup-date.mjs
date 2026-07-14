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
    await client.query(`ALTER TABLE "hero_service360_quotations" ADD COLUMN IF NOT EXISTS "hide_backup_date" boolean NOT NULL DEFAULT false;`);
    await client.query('COMMIT');
    console.log("Column hide_backup_date added successfully.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error altering tables:", e);
  } finally {
    client.release();
    pool.end();
  }
}

alterTables();
