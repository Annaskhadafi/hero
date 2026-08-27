import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  // Check menu permissions for workflow_studio
  const result = await db.execute(sql`
    SELECT * FROM hero_menu_permissions 
    WHERE menu_key = 'workflow_studio'
  `);
  const rows = result.rows ?? result;
  console.log('workflow_studio permissions:', JSON.stringify(rows, null, 2));
  
  if (rows.length === 0) {
    console.log('\n⚠️ No permission found for workflow_studio!');
    console.log('Creating default permission...');
    await db.execute(sql`
      INSERT INTO hero_menu_permissions (menu_key, can_view, can_edit, can_delete, created_at, updated_at)
      VALUES ('workflow_studio', true, true, true, NOW(), NOW())
      ON CONFLICT (menu_key) DO UPDATE SET can_edit = true, updated_at = NOW()
    `);
    console.log('✅ Permission created/updated!');
  } else {
    const r = rows[0] as any;
    console.log(`  can_view: ${r.can_view}`);
    console.log(`  can_edit: ${r.can_edit}`);
    console.log(`  can_delete: ${r.can_delete}`);
    
    if (!r.can_edit) {
      console.log('\n⚠️ can_edit is false! Updating...');
      await db.execute(sql`
        UPDATE hero_menu_permissions SET can_edit = true, updated_at = NOW() 
        WHERE menu_key = 'workflow_studio'
      `);
      console.log('✅ can_edit updated to true!');
    }
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
