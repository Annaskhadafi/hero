const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function main() {
  try {
    console.log("Connecting to " + process.env.DATABASE_URL);
    const res = await pool.query('SELECT 1 as val');
    console.log("Success! ", res.rows);
  } catch (err) {
    console.error("Error with ssl: false =>", err.message);
  }

  try {
    const pool2 = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    const res2 = await pool2.query('SELECT 1 as val');
    console.log("Success! with SSL =>", res2.rows);
  } catch (err) {
    console.error("Error with ssl: rejectUnauthorized: false =>", err.message);
  }
  
  process.exit(0);
}

main();
