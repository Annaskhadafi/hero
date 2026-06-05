import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Renaming columns in hc_candidate_mcu to match drizzle schema...");
  try {
    await db.execute(sql`
      ALTER TABLE "hero_hc_candidate_mcu" 
      RENAME COLUMN "clinic_name" TO "klinik_name";
    `);
    console.log("Renamed clinic_name to klinik_name");
  } catch(e) { console.log(e.message); }

  try {
    await db.execute(sql`
      ALTER TABLE "hero_hc_candidate_mcu" 
      RENAME COLUMN "clinic_email" TO "klinik_email";
    `);
    console.log("Renamed clinic_email to klinik_email");
  } catch(e) { console.log(e.message); }

  try {
    await db.execute(sql`
      ALTER TABLE "hero_hc_candidate_mcu" 
      RENAME COLUMN "mcu_package" TO "paket_mcu";
    `);
    console.log("Renamed mcu_package to paket_mcu");
  } catch(e) { console.log(e.message); }

  console.log("Done!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
