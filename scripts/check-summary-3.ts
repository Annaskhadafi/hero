import { db } from '../db';
import { apdSummaries } from '../db/schema/apd-summary';
import { eq } from 'drizzle-orm';

async function main() {
  const rows = await db.select().from(apdSummaries);
  for (const r of rows) {
    console.log(`ID: ${r.id}, Status: ${r.status}, Section: ${r.sectionId}, Generated: ${r.generatedByEmployeeId}, SigUrl: ${r.submitterSignatureUrl ? 'HAS SIG (' + r.submitterSignatureUrl.substring(0, 30) + '...)' : 'NULL'}`);
  }
}
main().then(() => process.exit(0));
