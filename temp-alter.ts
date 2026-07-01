import { db } from "./db/index.js"
import { sql } from "drizzle-orm"

async function main() {
  try {
    await db.execute(sql`ALTER TABLE "hero_service360_items" ADD COLUMN IF NOT EXISTS "job_title" text;`)
    console.log("Column added")
  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}
main()
