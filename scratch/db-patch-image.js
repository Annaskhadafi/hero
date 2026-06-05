const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral',
});

async function run() {
  try {
    await pool.query("ALTER TABLE hero_hc_online_test_questions ADD COLUMN image_url text DEFAULT '';");
    console.log('Added image_url to test questions');
  } catch (e) {
    console.log(e.message);
  }
  process.exit(0);
}

run();
