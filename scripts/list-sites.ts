import { db } from "@/db";
import { sites } from "@/db/schema/hero";

async function listSites() {
  const allSites = await db.select().from(sites);
  console.log(`Found ${allSites.length} sites:\n`);
  allSites.forEach((site) => {
    console.log(`ID: ${site.id} | Name: ${site.name} | Location: ${site.location}`);
  });
}

listSites()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
