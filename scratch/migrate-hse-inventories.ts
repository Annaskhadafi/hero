import { sql } from "drizzle-orm"
import { db } from "../db"

async function run() {
  console.log("Creating hero_hse_inventories table...")
  
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_hse_inventories (
        id SERIAL PRIMARY KEY,
        document_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        location TEXT NOT NULL,
        condition TEXT NOT NULL DEFAULT 'Baik',
        notes TEXT NOT NULL DEFAULT '',
        pic_name TEXT NOT NULL DEFAULT '',
        photo_url TEXT NOT NULL DEFAULT '',
        verified_status TEXT NOT NULL DEFAULT 'verified',
        verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
        purchase_date TIMESTAMP,
        validity_months INTEGER,
        expiration_date TIMESTAMP,
        reminder_days_before INTEGER NOT NULL DEFAULT 30,
        reminder_email_recipients TEXT NOT NULL DEFAULT '',
        last_reminder_sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    console.log("Table hero_hse_inventories created successfully!")
  } catch (error) {
    console.error("Migration failed:", error)
  }
  
  process.exit(0)
}

run()
