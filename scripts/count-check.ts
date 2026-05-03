import { db } from "../db";
import { employees, masterSections } from "../db/schema/hero";
import { count } from "drizzle-orm";

async function main() {
  const [ec] = await db.select({ c: count() }).from(employees);
  const [sc] = await db.select({ c: count() }).from(masterSections);
  console.log(`Employees: ${ec.c}`);
  console.log(`Sections: ${sc.c}`);
}
main().finally(() => process.exit());
