import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  // Revert HSE role permission for workflow_studio back to canEdit: false
  await db.execute(sql`
    UPDATE hero_role_menu_permissions 
    SET can_edit = false 
    WHERE role_id = 7 AND menu_item_id = 426
  `);
  console.log('✅ Reverted HSE role workflow_studio permission to canEdit: false');
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
