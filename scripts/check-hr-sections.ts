import { db } from '../db';
import { hrSections } from '../db/schema/hero';
import { eq, asc } from 'drizzle-orm';

async function main() {
  const sections = await db.select({
    id: hrSections.id,
    code: hrSections.code,
    name: hrSections.name,
    departmentId: hrSections.departmentId,
  }).from(hrSections).where(eq(hrSections.isActive, true)).orderBy(asc(hrSections.name));

  console.log('Total HR Sections:', sections.length);
  console.log('');
  sections.forEach((s, i) => {
    console.log(`${i+1}. [${s.code}] ${s.name} (Dept: ${s.departmentId})`);
  });
}

main().catch(console.error);
