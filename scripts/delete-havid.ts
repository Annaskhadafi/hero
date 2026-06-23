import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function main() {
  await db.delete(employees).where(eq(employees.id, 17));
  console.log("Deleted Havid Raka R.P. (id=17)");
  process.exit(0);
}
main().catch(console.error);
