import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating HR Counseling tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_hr_counseling_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
      hr_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      closed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_hr_counseling_messages (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES hero_hr_counseling_sessions(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Tables created successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error creating tables:", err);
  process.exit(1);
});
