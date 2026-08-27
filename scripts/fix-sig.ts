import { db } from '../db';
import { apdSummaries } from '../db/schema/apd-summary';
import { eq } from 'drizzle-orm';

async function main() {
  // Delete summary 3 so user can regenerate with proper signature
  await db.delete(apdSummaries).where(eq(apdSummaries.id, 3));
  console.log('Deleted summary 3. User should regenerate.');
}
main().then(() => process.exit(0));
