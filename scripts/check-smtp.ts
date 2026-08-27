import { db } from '../db';
import { sql } from 'drizzle-orm';
async function main() {
  const result = await db.execute(sql`SELECT * FROM hero_email_smtp_settings LIMIT 1`);
  console.log('SMTP Settings:', JSON.stringify(result.rows, null, 2));
}
main().catch(console.error).finally(() => process.exit(0));
