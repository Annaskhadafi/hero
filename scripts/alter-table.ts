import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE hero_hr_counseling_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;`);
    await db.execute(sql`ALTER TABLE hero_hr_counseling_messages ALTER COLUMN message SET DEFAULT '';`);
    console.log('Done');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
