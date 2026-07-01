import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, ".env") })
dotenv.config({ path: path.resolve(__dirname, ".env.local") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL not found")
}

const sql = neon(databaseUrl)

async function main() {
  console.log("Adding job_title column to hero_service360_items...")
  try {
    await sql`ALTER TABLE "hero_service360_items" ADD COLUMN IF NOT EXISTS "job_title" text;`
    console.log("✅ Successfully added job_title column")
  } catch (error) {
    console.error("❌ Error adding column:", error)
  }
}

main()
