import { db } from '@/db';
import { employees, roleMenuPermissions } from '@/db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  // Check Khadafi's access role
  const [emp] = await db.select({ 
    id: employees.id, 
    name: employees.name, 
    email: employees.email, 
    accessRole: employees.accessRole 
  }).from(employees).where(eq(employees.id, 5)).limit(1);
  
  console.log('Employee:', emp?.name, '| Role:', emp?.accessRole);
  
  // Check workflow_studio permission for this role
  const [perm] = await db.select().from(roleMenuPermissions)
    .where(eq(roleMenuPermissions.menuKey, 'workflow_studio'))
    .limit(1);
  
  if (perm) {
    console.log('Permission for workflow_studio:');
    console.log('  canView:', perm.canView);
    console.log('  canEdit:', perm.canEdit);
  } else {
    console.log('⚠️ No permission record for workflow_studio');
    
    // Create permission
    await db.insert(roleMenuPermissions).values({
      menuKey: 'workflow_studio',
      canView: true,
      canEdit: true,
      canDelete: false,
    });
    console.log('✅ Created permission for workflow_studio');
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
