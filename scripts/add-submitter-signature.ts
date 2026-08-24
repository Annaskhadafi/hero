import { db } from '../db';
import { sql } from 'drizzle-orm';
async function main() {
  const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'hero_apd_summaries' AND column_name = 'submitter_signature_url'`);
  if (result.rows.length === 0) {
    await db.execute(sql`ALTER TABLE hero_apd_summaries ADD COLUMN submitter_signature_url TEXT`);
    console.log('Column submitter_signature_url added');
  } else {
    console.log('Column already exists');
  }
}
main().catch(console.error).finally(() => process.exit(0));
