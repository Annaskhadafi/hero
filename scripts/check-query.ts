import { db } from '@/db';
import { sql, eq } from 'drizzle-orm';
import { hrCounselingSessions } from '@/db/schema/hr-counseling';
import { employees } from '@/db/schema/hero';
import { alias } from 'drizzle-orm/pg-core';

async function run() {
  try {
    const hrAlias = alias(employees, "hrAlias");
    const res = await db
      .select({
        id: hrCounselingSessions.id,
        hrId: hrCounselingSessions.hrId,
        hrName: hrAlias.name,
        userId: hrCounselingSessions.userId,
        userName: employees.name,
        category: hrCounselingSessions.category,
        status: hrCounselingSessions.status,
      })
      .from(hrCounselingSessions)
      .innerJoin(employees, eq(hrCounselingSessions.userId, employees.id))
      .innerJoin(hrAlias, eq(hrCounselingSessions.hrId, hrAlias.id))
      .where(eq(hrCounselingSessions.id, 1));
      
    console.log("Query result:", res);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
