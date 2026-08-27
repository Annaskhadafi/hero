import { db } from '@/db';
import { employees } from '@/db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  // Revert HSE role permission for workflow_studio back to canEdit: false
  const { sql } = await import('drizzle-orm');
  await db.execute(sql`UPDATE hero_role_menu_permissions SET can_edit = false WHERE role_id = 7 AND menu_item_id = 426`);
  console.log('✅ Reverted HSE role permission back to canEdit: false');

  // Set Khadafi to Super Admin
  await db.update(employees).set({ accessRole: 'Super Admin' }).where(eq(employees.id, 5));
  console.log('✅ Khadafi role changed to Super Admin');
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
