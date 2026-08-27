import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'hero_apd_summaries' AND column_name = 'submitter_signature_url'`);
  console.log('Column exists:', result.rows.length > 0);
}
main().then(() => process.exit(0));
