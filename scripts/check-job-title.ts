import "dotenv/config";
import { db } from "./db/index.js";
import { employees, masterJobTitles } from "./db/schema/hero.js";
import { eq } from "drizzle-orm";

async function run() {
  const emp = await db.select().from(employees).where(eq(employees.employeeSn, "77901")).limit(1);
  console.log("Employee: ", emp);
  if (emp[0].positionId) {
    const jobTitle = await db.select().from(masterJobTitles).where(eq(masterJobTitles.id, emp[0].positionId)).limit(1);
    console.log("Job Title: ", jobTitle);
  }
}

run().catch(console.error).then(() => process.exit(0));
