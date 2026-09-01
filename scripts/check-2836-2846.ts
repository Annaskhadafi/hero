import { db } from '../db';
import { approvalMatrices } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const m2836 = await db.select().from(approvalMatrices).where(eq(approvalMatrices.id, 2836));
  const m2846 = await db.select().from(approvalMatrices).where(eq(approvalMatrices.id, 2846));
  console.log('Matrix 2836:', m2836[0]);
  console.log('Matrix 2846:', m2846[0]);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
