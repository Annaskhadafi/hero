require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const res = await pool.query(`SELECT id, employee_sn, name, role, access_role FROM hero_employees WHERE employee_sn = '71261'`);
    console.log(res.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
