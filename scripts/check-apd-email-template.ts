import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const rows = await db
    .select({ name: emailTemplates.name, code: emailTemplates.templateCode })
    .from(emailTemplates)
    .where(eq(emailTemplates.templateCode, 'apd_request_approved'));
  console.log('Template check:', rows);
}
main().catch(console.error).finally(() => process.exit(0));
