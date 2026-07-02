import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'hero_service360_quotation_items';
  `);
  console.table(result.rows);
  process.exit(0);
}
main();
