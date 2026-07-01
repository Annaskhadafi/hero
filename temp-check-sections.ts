import { db } from "./db/index.js"
import { masterDepartments, masterSections } from "./db/schema/hero.js"
import { eq } from "drizzle-orm"

async function main() {
  const depts = await db.select().from(masterDepartments).where(eq(masterDepartments.name, 'Central Services'));
  console.log('Depts:', depts);
  if (depts.length > 0) {
    const secs = await db.select().from(masterSections).where(eq(masterSections.departmentId, depts[0].id));
    console.log('Sections:', secs);
  }
  process.exit(0)
}
main()
