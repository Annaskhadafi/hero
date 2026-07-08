import { db } from "./db";
import { sites } from "./db/schema/hero";

async function main() {
  const allSites = await db.select().from(sites);
  console.log("Sites:", allSites.map(s => ({id: s.id, name: s.name, location: s.location})));
  process.exit(0);
}

main();
