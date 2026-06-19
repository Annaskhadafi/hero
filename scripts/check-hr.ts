import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`SELECT id, name, department, job_title FROM hero_employees WHERE job_title LIKE '%HRGA%'`);
    console.log('HRGA Users:', res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
