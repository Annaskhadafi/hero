const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT * FROM hero_service360_quotations WHERE id = 18')
.then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); })
.catch(e => { console.error(e.message); pool.end(); });
