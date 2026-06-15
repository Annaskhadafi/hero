import { db } from "@/db";
import { sql } from "drizzle-orm";

async function createGroupLabelStylesTable() {
  console.log("Creating hero_navbar_group_label_styles table...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_navbar_group_label_styles" (
      "id" serial PRIMARY KEY,
      "section" text NOT NULL,
      "group_label" text NOT NULL,
      "text_color" text NOT NULL DEFAULT '#6B7280',
      "background_color" text,
      "font_weight" text NOT NULL DEFAULT 'semibold',
      "font_size" text NOT NULL DEFAULT '10px',
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  console.log("Table created successfully!");

  console.log("Inserting default styles...");

  const defaultStyles = [
    { section: "Human Capital", groupLabel: "HR Operational", textColor: "#0369A1" },
    { section: "Human Capital", groupLabel: "Recruitment Management", textColor: "#7C3AED" },
    { section: "Human Capital", groupLabel: "Training Center", textColor: "#059669" },
    { section: "Human Capital", groupLabel: "Performance & Development", textColor: "#DC2626" },
    { section: "HSE", groupLabel: "Safety Management", textColor: "#EA580C" },
    { section: "HSE", groupLabel: "Safety Tools & Compliance", textColor: "#CA8A04" },
    { section: "HSE", groupLabel: "Incident Management", textColor: "#DC2626" },
    { section: "Central Service", groupLabel: "Repair & Retread", textColor: "#2563EB" },
    { section: "Central Service", groupLabel: "Warehouse Repair", textColor: "#7C3AED" },
    { section: "Central Service", groupLabel: "Logistics", textColor: "#059669" },
  ];

  for (const style of defaultStyles) {
    await db.execute(sql`
      INSERT INTO "hero_navbar_group_label_styles" ("section", "group_label", "text_color")
      VALUES (${style.section}, ${style.groupLabel}, ${style.textColor})
      ON CONFLICT DO NOTHING
    `);
  }

  console.log("Default styles inserted!");
  console.log("Done!");
}

createGroupLabelStylesTable()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
