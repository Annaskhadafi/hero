import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'hero_approvals' AND column_name = 'apd_summary_id'`);
  console.log('Column exists:', result.rows.length > 0);
  if (result.rows.length === 0) {
    await db.execute(sql`ALTER TABLE hero_approvals ADD COLUMN apd_summary_id INTEGER REFERENCES hero_apd_summaries(id) ON DELETE CASCADE`);
    console.log('Column apd_summary_id added to hero_approvals');
  } else {
    console.log('Column already exists, skipping');
  }
}
main().catch(console.error);
