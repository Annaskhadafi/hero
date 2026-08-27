import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  // Find menu_item_id for workflow_studio
  const menuResult = await db.execute(sql`SELECT id, resource FROM hero_navbar_menu_items WHERE resource = 'workflow_studio' LIMIT 1`);
  const menuRows = (menuResult as any).rows ?? [];
  console.log('Menu item:', menuRows);
  
  if (menuRows.length === 0) {
    console.log('⚠️ workflow_studio menu not found');
    return;
  }
  
  const menuItemId = menuRows[0].id;
  
  // Find HSE role
  const roleResult = await db.execute(sql`SELECT id, name FROM hero_security_roles WHERE name = 'HSE' LIMIT 1`);
  const roleRows = (roleResult as any).rows ?? [];
  console.log('Role:', roleRows);
  
  if (roleRows.length === 0) {
    console.log('⚠️ HSE role not found');
    return;
  }
  
  const roleId = roleRows[0].id;
  
  // Check existing permission
  const existingResult = await db.execute(sql`SELECT * FROM hero_role_menu_permissions WHERE role_id = ${roleId} AND menu_item_id = ${menuItemId} LIMIT 1`);
  const existingRows = (existingResult as any).rows ?? [];
  console.log('Existing permission:', existingRows);
  
  if (existingRows.length > 0) {
    const perm = existingRows[0];
    console.log(`  canEdit: ${perm.can_edit}`);
    if (!perm.can_edit) {
      console.log('  ⚠️ canEdit is false! Updating to true...');
      await db.execute(sql`
        UPDATE hero_role_menu_permissions 
        SET can_edit = true, can_view = true 
        WHERE role_id = ${roleId} AND menu_item_id = ${menuItemId}
      `);
      console.log('  ✅ Updated!');
    } else {
      console.log('  ✅ canEdit is already true');
    }
  } else {
    console.log('  No permission record found. Creating...');
    await db.execute(sql`
      INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, data_scope)
      VALUES (${roleId}, ${menuItemId}, true, true, false, 'own')
    `);
    console.log('  ✅ Created!');
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
