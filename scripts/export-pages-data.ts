import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { db } from "../db";
import { navbarMenuItems } from "../db/schema/hero";

async function main() {
  const items = await db.select().from(navbarMenuItems);
  const outputPath = path.join(__dirname, "../.tmp_pages.json");
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
  console.log(`Exported ${items.length} pages to ${outputPath}`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
