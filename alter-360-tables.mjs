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
      'ADD COLUMN IF NOT EXISTS "attn" text',
      'ADD COLUMN IF NOT EXISTS "cc" text',
      'ADD COLUMN IF NOT EXISTS "from_name" text',
      'ADD COLUMN IF NOT EXISTS "from_signature_url" text',
      'ADD COLUMN IF NOT EXISTS "subject" text',
      'ADD COLUMN IF NOT EXISTS "po_number" text',
      'ADD COLUMN IF NOT EXISTS "project_name" text',
      'ADD COLUMN IF NOT EXISTS "po_period" text',
      'ADD COLUMN IF NOT EXISTS "hide_backup_price" boolean DEFAULT false',
      'ADD COLUMN IF NOT EXISTS "show_days" boolean DEFAULT true'
    ];
    await client.query(`ALTER TABLE "hero_service360_quotations" ${qCols.join(', ')};`);

    // Alter hero_service360_quotation_items
    const iCols = [
      'ADD COLUMN IF NOT EXISTS "month_period" text',
      'ADD COLUMN IF NOT EXISTS "level" text',
      'ADD COLUMN IF NOT EXISTS "custom_description" text'
    ];
    await client.query(`ALTER TABLE "hero_service360_quotation_items" ${iCols.join(', ')};`);

    await client.query('COMMIT');
    console.log("360 Service tables altered successfully with new columns.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error altering tables:", e);
  } finally {
    client.release();
    pool.end();
  }
}

alterTables();
