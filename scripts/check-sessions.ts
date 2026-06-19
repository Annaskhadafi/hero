import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`SELECT * FROM hero_hr_counseling_sessions`);
    console.log("Sessions:", res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
