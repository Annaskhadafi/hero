const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  try {
    await pool.query('ALTER TABLE hero_service360_quotation_items ALTER COLUMN item_id DROP NOT NULL;');
    console.log('Successfully dropped NOT NULL constraint on item_id');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

fix();
