import { db } from '../db';
import { masterSections } from '../db/schema/hero';
import { isNull, eq } from 'drizzle-orm';
async function main() {
  const noDept = await db.select({ id: masterSections.id, name: masterSections.name }).from(masterSections).where(isNull(masterSections.departmentId));
  if (noDept.length > 0) {
    console.log('Sections WITHOUT department:');
    for (const s of noDept) console.log(`  #${s.id} ${s.name}`);
  } else {
    console.log('All sections have departments assigned');
  }
}
main().catch(console.error).finally(() => process.exit(0));
