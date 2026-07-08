import { sql } from 'drizzle-orm';
import { db } from './db/drizzle';

async function main() {
  try {
    console.log("Adding po_file_url column...");
    await db.execute(sql`ALTER TABLE "hero_service360_quotations" ADD COLUMN "po_file_url" text;`);
    console.log("Successfully added column!");
  } catch (error: any) {
    console.error("Error adding column:", error.message);
  }
  process.exit(0);
}

main();
