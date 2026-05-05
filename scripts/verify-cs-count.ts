import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";

async function verifyCount() {
  const all = await db.select().from(centralServiceEmployees);
  console.log("Total employees in Central Service table: " + all.length);
  
  const deptCounts = {};
  all.forEach((emp) => {
    deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
  });
  
  console.log("\nDepartment breakdown:");
  Object.entries(deptCounts).forEach(([dept, count]) => {
    console.log("  " + count + " - " + dept);
  });
}

verifyCount().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
