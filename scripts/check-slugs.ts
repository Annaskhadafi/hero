import { db } from "../db";
import { hcOnlineTestGroups } from "../db/schema/hero";

async function run() {
  const groups = await db.select().from(hcOnlineTestGroups);
  console.log("Groups:", groups);
}

run().catch(console.error);
