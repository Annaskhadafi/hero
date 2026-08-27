import { db } from '../db';
import { masterSections, masterDepartments } from '../db/schema/hero';
import { eq, asc } from 'drizzle-orm';
async function main() {
  const sections = await db.select({
    id: masterSections.id,
    name: masterSections.name,
    departmentId: masterSections.departmentId,
  }).from(masterSections).where(eq(masterSections.isActive, true)).orderBy(asc(masterSections.name));
  
  for (const s of sections) {
    const dept = s.departmentId ? await db.select({ name: masterDepartments.name }).from(masterDepartments).where(eq(masterDepartments.id, s.departmentId)).limit(1) : null;
    console.log(`Section #${s.id} ${s.name} → Dept: ${dept?.[0]?.name || 'NONE'} (${s.departmentId})`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
