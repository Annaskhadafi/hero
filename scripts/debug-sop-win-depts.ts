import { db } from "../db";
import { sopWinDepartments, sopWinDepartmentWorkflows } from "../db/schema/hero";
import { getSopWinDepartmentWorkflowsAction } from "../app/dashboard/sop-win/actions";

async function main() {
  console.log("=== CHECKING sopWinDepartments TABLE ===");
  const allDepts = await db.select().from(sopWinDepartments);
  console.log(`Total rows in sopWinDepartments: ${allDepts.length}`);
  for (const d of allDepts) {
    console.log(`- ID: ${d.id}, Code: ${d.code}, Name: ${d.name}, isActive: ${d.isActive}`);
  }

  console.log("\n=== CHECKING sopWinDepartmentWorkflows TABLE ===");
  const allWfs = await db.select().from(sopWinDepartmentWorkflows);
  console.log(`Total rows in sopWinDepartmentWorkflows: ${allWfs.length}`);
  for (const w of allWfs) {
    console.log(`- ID: ${w.id}, Code: ${w.departmentCode}, Name: ${w.departmentName}, Steps: ${w.steps.length}`);
  }

  console.log("\n=== CALLING getSopWinDepartmentWorkflowsAction() ===");
  const res = await getSopWinDepartmentWorkflowsAction();
  console.log("Result success:", res.success);
  console.log("Result data length:", res.data?.length);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
