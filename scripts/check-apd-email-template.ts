import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { eq } from 'drizzle-orm';
async function main() {
  const rows = await db.select({ name: emailTemplates.name, code: emailTemplates.templateCode, html: emailTemplates.htmlContent }).from(emailTemplates).where(eq(emailTemplates.templateCode, 'apd_request_approved'));
  if (rows.length === 0) { console.log('NOT FOUND'); return; }
  console.log('=== Template:', rows[0].name, '===');
  console.log(rows[0].html?.substring(0, 3000));
}
main().catch(console.error).finally(() => process.exit(0));
