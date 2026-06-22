import { db } from '../db';
import { employees } from '../db/schema/hero';
import { account } from '../db/schema/auth';
import { hashPassword } from 'better-auth/crypto';
import { eq, and, isNotNull, notIlike } from 'drizzle-orm';

async function main() {
  console.log('Fetching employees...');
  const emps = await db.select({
    id: employees.id,
    authUserId: employees.authUserId,
    employeeSn: employees.employeeSn,
    accessRole: employees.accessRole
  })
  .from(employees)
  .where(
    and(
      isNotNull(employees.authUserId),
      notIlike(employees.accessRole, '%super%admin%')
    )
  );

  console.log(`Found ${emps.length} non-super-admin employees with auth accounts.`);

  let updated = 0;
  for (const emp of emps) {
    if (!emp.authUserId) continue;
    
    // Create dynamic password based on employee SN
    const normalizedSn = (emp.employeeSn || '').trim().replace(/^emp[-]?/i, '');
    const newPassword = `Chitra#${normalizedSn}`;
    
    const hashedPassword = await hashPassword(newPassword);

    await db.update(account)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(
        and(
          eq(account.userId, emp.authUserId),
          eq(account.providerId, 'credential')
        )
      );
    
    updated++;
    if (updated % 10 === 0) console.log(`Updated ${updated}/${emps.length}`);
  }
  
  console.log(`Finished updating ${updated} accounts.`);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
