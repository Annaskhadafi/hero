import { db } from "./db";
import { sites } from "./db/schema/hero";

async function run() {
  const allSites = await db.select().from(sites);
  console.table(allSites.map(s => ({id: s.id, name: s.name, location: s.location})));
  process.exit(0);
}
run();
