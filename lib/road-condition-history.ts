import { sql } from 'drizzle-orm'

import { db } from '@/db'

export async function ensureRoadConditionReportTable() {
  // ponytail: runtime guard, remove when migrations are guaranteed in every deployed DB.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_road_condition_reports (
      id serial PRIMARY KEY,
      site_id integer REFERENCES hero_sites(id) ON DELETE SET NULL,
      site_name text NOT NULL,
      customer_name text NOT NULL,
      inspector_name text NOT NULL,
      report_date date NOT NULL,
      average_score numeric(5,2) NOT NULL DEFAULT 0.00,
      model_used text NOT NULL DEFAULT '',
      report_data jsonb NOT NULL,
      created_by text NOT NULL DEFAULT '',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `)
}
