import { db } from '../db';
import { repairFormWo } from '../db/schema/form-wo';
import { eq } from 'drizzle-orm';

async function main() {
  for (const id of [15, 16]) {
    const [r] = await db.select().from(repairFormWo).where(eq(repairFormWo.id, id));
    if (r) {
      console.log(`${r.noPengajuan} (${r.jenisPengajuan}): submitterSignatureUrl = ${r.submitterSignatureUrl ? '✅ SET (' + r.submitterSignatureUrl.substring(0, 40) + '...)' : '❌ NULL'}`);
    }
  }
  process.exit(0);
}
main();
