import { db } from '../db';
import { employees, masterSections, masterDepartments } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

/**
 * Fix Khadafi's test data:
 * 1. Reset all section head_employee_id that were set to Khadafi (emp#5) → NULL
 * 2. Reset Central Services dept head → NULL
 * 3. Reset Khadafi's accessRole from 'Super Admin' back to 'Staff'
 */
async function main() {
  console.log('=== FIXING KHADAFI TEST DATA ===\n');

  // 1. Reset all sections where Khadafi was incorrectly set as head
  const sectionsUpdated = await db.update(masterSections)
    .set({ headEmployeeId: null })
    .where(eq(masterSections.headEmployeeId, 5))
    .returning({ id: masterSections.id, code: masterSections.code, name: masterSections.name });
  console.log(`✅ Reset ${sectionsUpdated.length} section heads (were set to Khadafi):`);
  for (const s of sectionsUpdated) {
    console.log(`   - [${s.code}] ${s.name}`);
  }

  // 2. Reset Central Services dept head
  const deptsUpdated = await db.update(masterDepartments)
    .set({ headEmployeeId: null })
    .where(eq(masterDepartments.headEmployeeId, 5))
    .returning({ id: masterDepartments.id, code: masterDepartments.code, name: masterDepartments.name });
  console.log(`\n✅ Reset ${deptsUpdated.length} department heads (were set to Khadafi):`);
  for (const d of deptsUpdated) {
    console.log(`   - [${d.code}] ${d.name}`);
  }

  // 3. Reset Khadafi's access role from Super Admin to Staff
  await db.update(employees)
    .set({ accessRole: 'Staff' })
    .where(eq(employees.id, 5));
  console.log(`\n✅ Reset Khadafi's accessRole from 'Super Admin' to 'Staff'`);

  // 4. Verify the changes
  const [verifyKhadafi] = await db.select({
    id: employees.id,
    name: employees.name,
    accessRole: employees.accessRole,
  }).from(employees).where(eq(employees.id, 5));
  console.log(`\n📋 Verification - Khadafi's current record:`, verifyKhadafi);

  const remainingSections = await db.select({ id: masterSections.id })
    .from(masterSections)
    .where(eq(masterSections.headEmployeeId, 5));
  console.log(`📋 Sections still pointing to Khadafi: ${remainingSections.length}`);

  console.log('\n=== DONE ===');
  console.log('Khadafi sekarang sudah bersih dari data testing.');
  console.log('Section heads dan department heads bisa di-assign ulang melalui UI.');
}

main().catch(console.error).finally(() => process.exit(0));
