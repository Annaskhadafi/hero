import { db } from '../db';
import { masterDepartments } from '../db/schema/hero';
import { eq } from 'drizzle-orm';
async function main() {
  // Set Khadafi (emp 5) as dept head for Central Services (dept 2)
  await db.update(masterDepartments).set({ headEmployeeId: 5 }).where(eq(masterDepartments.id, 2));
  console.log('Department #2 (Central Services) head set to Khadafi');
}
main().catch(console.error).finally(() => process.exit(0));
