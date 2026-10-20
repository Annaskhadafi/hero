import { db } from "../db"
import { sql } from "drizzle-orm"

async function main() {
  console.log("Creating table hero_safety_site_monthly_summary...")
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_safety_site_monthly_summary (
      id SERIAL PRIMARY KEY,
      site_id INTEGER NOT NULL REFERENCES hero_sites(id) ON DELETE CASCADE,
      month DATE NOT NULL,
      nearmiss INTEGER NOT NULL DEFAULT 0,
      property_damage INTEGER NOT NULL DEFAULT 0,
      first_aid INTEGER NOT NULL DEFAULT 0,
      medical_treatment INTEGER NOT NULL DEFAULT 0,
      environmental INTEGER NOT NULL DEFAULT 0,
      major_injury INTEGER NOT NULL DEFAULT 0,
      fatality INTEGER NOT NULL DEFAULT 0,
      safety_man_hours NUMERIC(14, 2) NOT NULL DEFAULT 0,
      total_manpower INTEGER NOT NULL DEFAULT 0,
      sick_employees_count INTEGER NOT NULL DEFAULT 0,
      lost_days_count INTEGER NOT NULL DEFAULT 0,
      sick_letters_count INTEGER NOT NULL DEFAULT 0,
      occupational_diseases_count INTEGER NOT NULL DEFAULT 0,
      incident_notes TEXT NOT NULL DEFAULT 'Nihil',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS hero_safety_site_monthly_summary_site_month_idx
    ON hero_safety_site_monthly_summary(site_id, month);
  `)
  console.log("Table hero_safety_site_monthly_summary created/verified successfully!")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration error:", err)
    process.exit(1)
  })
