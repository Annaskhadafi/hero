import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { like } from 'drizzle-orm';
async function main() {
  const rows = await db.select().from(emailTemplates).where(like(emailTemplates.templateCode, 'apd_summary%'));
  console.log(`Ditemukan ${rows.length} template dengan kode apd_summary*:`);
  for (const r of rows) {
    console.log(`  - ${r.templateCode} | ${r.name} | Active: ${r.isActive}`);
  }
  if (rows.length === 0) {
    console.log('  (tidak ada template summary sama sekali)');
  }
}
main().catch(console.error).finally(() => process.exit(0));
