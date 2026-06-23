import { db } from "@/db";
import { masterSections } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function main() {
  await db.update(masterSections).set({ headEmployeeId: null }).where(eq(masterSections.id, 31));
  await db.update(masterSections).set({ headEmployeeId: null }).where(eq(masterSections.id, 28));
  console.log("Nullified headEmployeeId on masterSections id=31 and id=28");
  process.exit(0);
}
main().catch(console.error);
