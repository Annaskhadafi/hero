import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`SELECT DISTINCT department FROM hero_employees`);
    console.log("Departments:");
    console.dir(res.rows.map(r => r.department), { maxArrayLength: null });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
