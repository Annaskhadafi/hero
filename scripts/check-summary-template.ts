import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { eq } from 'drizzle-orm';
async function main() {
  const rows = await db.select().from(emailTemplates).where(eq(emailTemplates.templateCode, 'apd_summary_approved'));
  if (rows.length === 0) { console.log('NOT FOUND in DB'); return; }
  const t = rows[0];
  console.log('Name:', t.name);
  console.log('Code:', t.templateCode);
  console.log('Active:', t.isActive);
  console.log('Subject:', t.subject);
}
main().catch(console.error).finally(() => process.exit(0));
