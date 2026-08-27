import { db } from '../db';
import { sql } from 'drizzle-orm';
async function main() {
  // Check APD notification config
  const result = await db.execute(sql`SELECT * FROM hero_apd_notification_config LIMIT 1`);
  console.log('APD Notification Config:', JSON.stringify(result.rows, null, 2));
}
main().catch(console.error).finally(() => process.exit(0));
