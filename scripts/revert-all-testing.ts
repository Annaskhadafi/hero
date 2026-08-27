import { db } from '../db';
import { sql } from 'drizzle-orm';
import { masterDepartments, orgNodeAssignments, approvalMatrices, employees, orgChartNodes } from '../db/schema/hero';
import { eq, and } from 'drizzle-orm';

async function main() {
  // 1. Kembalikan APD email recipient ke Fauzan
  await db.execute(sql`UPDATE hero_apd_notification_config SET recipient_emails = 'm.asar.fauzan@chitraparatama.co.id' WHERE id = 1`);
  console.log('1. APD email → m.asar.fauzan@chitraparatama.co.id');

  // 2. Kembalikan department head Central Services ke Romy Hidayat
  // Cari Romy Hidayat
  const [romy] = await db.select().from(employees).where(eq(employees.name, 'Romy Hidayat')).limit(1);
  if (romy) {
    await db.update(masterDepartments).set({ headEmployeeId: romy.id }).where(eq(masterDepartments.id, 2));
    console.log(`2. Dept Head Central Services → Romy Hidayat (emp:${romy.id})`);
  } else {
    console.log('2. Romy Hidayat not found, skipping');
  }

  // 3. Hapus semua org node assignment Khadafi (emp 5) yang ditambahkan testing
  const deleted = await db.delete(orgNodeAssignments).where(eq(orgNodeAssignments.employeeId, 5));
  console.log(`3. Deleted Khadafi org node assignments: ${deleted.rowCount}`);

  // 4. Kembalikan SPECIFIC_SITES di approval-engine.ts (sudah dikembalikan via str_replace)
  console.log('4. SPECIFIC_SITES removed in approval-engine.ts - need manual revert');

  console.log('\nDone! Cek approval-engine.ts untuk kembalikan SPECIFIC_SITES.');
}
main().catch(console.error).finally(() => process.exit(0));
