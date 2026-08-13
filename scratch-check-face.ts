import { db } from "./db";
import { employees } from "./db/schema/hero";
import { isNull } from "drizzle-orm";

async function main() {
  const unregistered = await db
    .select({
      name: employees.name,
      email: employees.email,
    })
    .from(employees)
    .where(isNull(employees.faceRegisteredAt));

  console.log(`Unregistered count: ${unregistered.length}`);
  console.log("Sample (up to 10):");
  unregistered.slice(0, 10).forEach(e => console.log(`- ${e.name} (${e.email})`));
  process.exit(0);
}

main().catch(console.error);
