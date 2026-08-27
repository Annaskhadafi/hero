import { db } from '../db';
import { masterSections } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const sections = await db.select({
    id: masterSections.id,
    code: masterSections.code,
    name: masterSections.name,
    departmentId: masterSections.departmentId,
    headEmployeeId: masterSections.headEmployeeId,
  }).from(masterSections).where(eq(masterSections.isActive, true)).orderBy(masterSections.name);

  console.log('Total sections:', sections.length);
  console.log('');
  sections.forEach((s, i) => {
    console.log(`${i+1}. [${s.code}] ${s.name} (Dept: ${s.departmentId}, Head: ${s.headEmployeeId || 'kosong'})`);
  });
}

main().catch(console.error);
