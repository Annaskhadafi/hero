const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query('SELECT id, item_id, quantity, price, subtotal, is_backup FROM hero_service360_quotation_items WHERE quotation_id = 18');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

check();
