import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function main() {
  await db.delete(employees).where(eq(employees.id, 73));
  console.log("Deleted Zulfikar (id=73, sn=164)");
  process.exit(0);
}
main().catch(console.error);
