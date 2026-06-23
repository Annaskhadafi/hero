import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { inArray } from "drizzle-orm";

async function main() {
  await db
    .update(employees)
    .set({ isActive: true })
    .where(inArray(employees.id, [1196, 962]));

  console.log("Reactivated employees.id 1196 and 962");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
