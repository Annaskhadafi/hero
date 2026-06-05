import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Fixing location_or_link...");
  try {
    await db.execute(sql`
      ALTER TABLE "hero_hc_candidate_interviews" 
      RENAME COLUMN "location_url" TO "location_or_link";
    `);
    console.log("Renamed location_url to location_or_link");
  } catch(e) { console.log(e.message); }

  console.log("Done!");
  process.exit(0);
}

run();
