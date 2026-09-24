import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const rows = await db
    .select({
      id: emailTemplates.id,
      name: emailTemplates.name,
      code: emailTemplates.templateCode,
      subject: emailTemplates.subject,
      htmlContent: emailTemplates.htmlContent,
    })
    .from(emailTemplates)
    .where(sql`template_code like '%apd%' or template_code like '%material%'`);
  for (const r of rows) {
    const featureBadgeMatch = r.htmlContent?.match(/background:#eff6ff[^>]*>(.*?)<\/div>/i);
    console.log(`CODE: ${r.code} | NAME: ${r.name} | FEATURE BADGE: ${featureBadgeMatch ? featureBadgeMatch[1] : 'none'}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
