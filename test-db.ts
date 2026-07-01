import { db } from "./db";
import { service360Quotations } from "./db/schema/service360";
import { desc } from "drizzle-orm";

async function main() {
  const result = await db.select().from(service360Quotations).orderBy(desc(service360Quotations.id));
  console.log("Quotations:", result);
}
main();
