import { db } from '../db';
import { apdRequests } from '../db/schema/hero';
import { desc } from 'drizzle-orm';

async function main() {
  const requests = await db.select().from(apdRequests).orderBy(desc(apdRequests.id)).limit(5);
  console.log('Recent APD requests count:', requests.length);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });








