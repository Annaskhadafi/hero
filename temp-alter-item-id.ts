import { db } from "./db/index.js"
import { sql } from "drizzle-orm"

async function main() {
  try {
    await db.execute(sql`ALTER TABLE "hero_service360_quotation_items" ALTER COLUMN "item_id" DROP NOT NULL;`)
    console.log("Column altered")
  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}
main()
