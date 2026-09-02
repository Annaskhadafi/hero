import { seedDefaultSopWinDepartmentWorkflowsAction } from "../app/dashboard/sop-win/actions";

async function main() {
  console.log("Seeding all 22 department workflow matrix entries into database...");
  const res = await seedDefaultSopWinDepartmentWorkflowsAction();
  console.log("Result:", res);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
