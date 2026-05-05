import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { sql } from "drizzle-orm";

async function listDepartments() {
  console.log("Listing all departments in User Management...\n");

  const result = await db
    .select({ 
      department: employees.department,
      count: sql<number>`count(*)::int`
    })
    .from(employees)
    .groupBy(employees.department)
    .orderBy(sql`count(*) DESC`);

  console.log("Total unique departments: " + result.length + "\n");
  console.log("Top departments:");
  result.slice(0, 20).forEach((dept) => {
    console.log("  " + dept.count + " employees - " + dept.department);
  });
}

listDepartments().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
