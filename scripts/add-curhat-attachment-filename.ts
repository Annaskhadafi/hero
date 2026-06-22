import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Ensuring hero_hr_counseling_messages.attachment_file_name column exists...");

  const result = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'hero_hr_counseling_messages'
      AND column_name = 'attachment_file_name'
  `);

  const rows = Array.isArray(result) ? result : [];
  if (rows.length > 0) {
    console.log("Column already exists.");
    process.exit(0);
  }

  await db.execute(sql`
    ALTER TABLE hero_hr_counseling_messages
    ADD COLUMN attachment_file_name TEXT
  `);

  console.log("Column added successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error adding column:", err);
  process.exit(1);
});
