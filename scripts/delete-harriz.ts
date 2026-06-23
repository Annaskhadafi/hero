import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function main() {
  await db.delete(employees).where(eq(employees.id, 81));
  console.log("Deleted Harriz Ichwan (id=81, sn=172)");
  process.exit(0);
}
main().catch(console.error);
