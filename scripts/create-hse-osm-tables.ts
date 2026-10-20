import { db } from '../db'
import { sql } from 'drizzle-orm'
import { HSE_OSM_DEFAULT_FOCUS_ITEMS, HSE_OSM_DEFAULT_CLASSIFICATIONS } from '../lib/hse-osm-constants'

async function main() {
  console.log('🚀 Creating HSE On the Spot Monitoring (OSM) database tables...')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_hse_osm_master_focus_items" (
      "id" SERIAL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT DEFAULT '',
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "hero_hse_osm_master_classifications" (
      "id" SERIAL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT DEFAULT '',
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "hero_hse_osm_sessions" (
      "id" SERIAL PRIMARY KEY,
      "session_number" TEXT NOT NULL UNIQUE,
      "site_id" INTEGER REFERENCES "hero_sites"("id") ON DELETE SET NULL,
      "inspection_date" TEXT NOT NULL,
      "inspection_time" TEXT NOT NULL,
      "location_area" TEXT NOT NULL,
      "latitude" TEXT DEFAULT '',
      "longitude" TEXT DEFAULT '',
      "gps_accuracy" TEXT DEFAULT '',
      "focus_item_id" INTEGER REFERENCES "hero_hse_osm_master_focus_items"("id") ON DELETE SET NULL,
      "focus_item_name" TEXT NOT NULL,
      "lead_employee_id" INTEGER REFERENCES "hero_employees"("id") ON DELETE SET NULL,
      "lead_employee_name" TEXT NOT NULL,
      "lead_badge_number" TEXT NOT NULL,
      "lead_department" TEXT NOT NULL,
      "lead_company" TEXT NOT NULL DEFAULT 'PT Chitra Paratama',
      "lead_role" TEXT DEFAULT '',
      "notes" TEXT DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "created_by" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "deleted_at" TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "hero_hse_osm_team_members" (
      "id" SERIAL PRIMARY KEY,
      "session_id" INTEGER NOT NULL REFERENCES "hero_hse_osm_sessions"("id") ON DELETE CASCADE,
      "employee_id" INTEGER REFERENCES "hero_employees"("id") ON DELETE SET NULL,
      "badge_number" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "department" TEXT NOT NULL,
      "company" TEXT NOT NULL DEFAULT 'PT Chitra Paratama',
      "is_team_leader" BOOLEAN NOT NULL DEFAULT FALSE,
      "is_external" BOOLEAN NOT NULL DEFAULT FALSE,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "hero_hse_osm_findings" (
      "id" SERIAL PRIMARY KEY,
      "session_id" INTEGER NOT NULL REFERENCES "hero_hse_osm_sessions"("id") ON DELETE CASCADE,
      "finding_number" TEXT NOT NULL UNIQUE,
      "finding_date" TEXT NOT NULL,
      "finding_time" TEXT NOT NULL,
      "classification_id" INTEGER REFERENCES "hero_hse_osm_master_classifications"("id") ON DELETE SET NULL,
      "classification_name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "photo_urls" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "risk_level" TEXT NOT NULL DEFAULT 'MEDIUM',
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "action_required" TEXT DEFAULT '',
      "action_taken" TEXT DEFAULT '',
      "action_photo_urls" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "action_submitted_at" TIMESTAMP,
      "action_submitted_by" TEXT,
      "verified_at" TIMESTAMP,
      "verified_by" TEXT,
      "rejection_reason" TEXT DEFAULT '',
      "due_date" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "deleted_at" TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "idx_hero_hse_osm_sessions_site" ON "hero_hse_osm_sessions" ("site_id");
    CREATE INDEX IF NOT EXISTS "idx_hero_hse_osm_sessions_date" ON "hero_hse_osm_sessions" ("inspection_date");
    CREATE INDEX IF NOT EXISTS "idx_hero_hse_osm_findings_status" ON "hero_hse_osm_findings" ("status");
    CREATE INDEX IF NOT EXISTS "idx_hero_hse_osm_findings_session" ON "hero_hse_osm_findings" ("session_id");
  `)

  console.log('✅ OSM tables created successfully!')

  // Seed default Focus Items
  console.log('🌱 Seeding default Focus Items...')
  for (const item of HSE_OSM_DEFAULT_FOCUS_ITEMS) {
    await db.execute(sql`
      INSERT INTO "hero_hse_osm_master_focus_items" ("code", "name", "description", "sort_order")
      VALUES (${item.code}, ${item.name}, ${item.description}, ${item.sortOrder})
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "sort_order" = EXCLUDED."sort_order";
    `)
  }

  // Seed default Classifications
  console.log('🌱 Seeding default Classifications...')
  for (const item of HSE_OSM_DEFAULT_CLASSIFICATIONS) {
    await db.execute(sql`
      INSERT INTO "hero_hse_osm_master_classifications" ("code", "name", "description", "sort_order")
      VALUES (${item.code}, ${item.name}, ${item.description}, ${item.sortOrder})
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "sort_order" = EXCLUDED."sort_order";
    `)
  }

  console.log('🎉 HSE OSM database setup & seed completed successfully!')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Failed creating HSE OSM database tables:', err)
  process.exit(1)
})
