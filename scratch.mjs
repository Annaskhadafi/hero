import { db } from './db/index.js';
import { employees } from './db/schema/hero.js';
import { eq, like, ilike } from 'drizzle-orm';

async function run() {
  const data = await db.select().from(employees).where(ilike(employees.jobTitle, '%field%')).limit(1);
  if (data.length > 0) {
      console.log("Found field team by jobTitle:", data[0]);
      process.exit(0);
  }
  const data2 = await db.select().from(employees).where(ilike(employees.accessRole, '%field%')).limit(1);
  if (data2.length > 0) {
      console.log("Found field team by accessRole:", data2[0]);
      process.exit(0);
  }
  const data3 = await db.select().from(employees).limit(1);
  console.log("Just any employee:", data3[0]);
  process.exit(0);
}
run();
