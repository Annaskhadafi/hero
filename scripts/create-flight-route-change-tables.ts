import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Creating Flight Route Change Request database tables...')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_hc_flight_route_change_requests" (
      "id" SERIAL PRIMARY KEY,
      "request_number" TEXT NOT NULL UNIQUE,
      "employee_id" INTEGER REFERENCES "hero_employees"("id") ON DELETE SET NULL,
      "employee_sn" TEXT NOT NULL DEFAULT '',
      "requestor_name" TEXT NOT NULL,
      "job_title" TEXT NOT NULL DEFAULT '',
      "section_name" TEXT NOT NULL DEFAULT '',
      "department_name" TEXT NOT NULL DEFAULT '',
      "site_id" INTEGER REFERENCES "hero_sites"("id") ON DELETE SET NULL,
      "site_name" TEXT NOT NULL DEFAULT '',
      "origin_location" TEXT NOT NULL DEFAULT 'Jambi',
      "request_date" DATE NOT NULL,
      "poh_location" TEXT NOT NULL DEFAULT 'Balikpapan',
      "clause_accepted" BOOLEAN NOT NULL DEFAULT TRUE,
      "current_step_order" INTEGER NOT NULL DEFAULT 1,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "rejection_reason" TEXT NOT NULL DEFAULT '',
      "notes" TEXT NOT NULL DEFAULT '',
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "hero_hc_flight_route_change_items" (
      "id" SERIAL PRIMARY KEY,
      "request_id" INTEGER NOT NULL REFERENCES "hero_hc_flight_route_change_requests"("id") ON DELETE CASCADE,
      "flight_date" DATE NOT NULL,
      "flight_route" TEXT NOT NULL,
      "remark" TEXT NOT NULL DEFAULT 'Offsite/ FB',
      "sort_order" INTEGER NOT NULL DEFAULT 1,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "hero_hc_flight_route_change_approvals" (
      "id" SERIAL PRIMARY KEY,
      "request_id" INTEGER NOT NULL REFERENCES "hero_hc_flight_route_change_requests"("id") ON DELETE CASCADE,
      "step_order" INTEGER NOT NULL,
      "step_key" TEXT NOT NULL,
      "role_label" TEXT NOT NULL,
      "approver_title" TEXT NOT NULL DEFAULT '',
      "approver_employee_id" INTEGER REFERENCES "hero_employees"("id") ON DELETE SET NULL,
      "approver_name" TEXT NOT NULL DEFAULT '',
      "approver_email" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "signature_data_url" TEXT,
      "remarks" TEXT NOT NULL DEFAULT '',
      "signed_at" TIMESTAMP,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "hero_hc_flight_route_change_approvals_step_uq"
      ON "hero_hc_flight_route_change_approvals" ("request_id", "step_order");
  `)

  console.log('Flight Route Change Request database tables created successfully!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
