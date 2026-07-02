import { db } from "../db";
import { centralServiceAssets } from "../db/schema/central-service";

async function main() {
  try {
    const data = await db.select().from(centralServiceAssets).limit(1);
    console.log("Success! Data:", data);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

main();
