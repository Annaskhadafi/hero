import { sql } from 'drizzle-orm'
import { db } from '@/db'

let isTableEnsured = false

export async function ensureRoadHazardTables() {
  if (isTableEnsured) return
  try {
    // ponytail: runtime guard, ensures tables exist in any DB environment
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_road_hazard_sessions (
        id serial PRIMARY KEY,
        session_code text NOT NULL UNIQUE,
        site_id integer REFERENCES hero_sites(id) ON DELETE SET NULL,
        site_name text NOT NULL DEFAULT '',
        customer_name text NOT NULL DEFAULT '',
        inspector_id integer REFERENCES hero_employees(id) ON DELETE SET NULL,
        inspector_name text NOT NULL DEFAULT '',
        road_section text NOT NULL DEFAULT '',
        start_time timestamp NOT NULL DEFAULT now(),
        end_time timestamp,
        duration_seconds integer NOT NULL DEFAULT 0,
        total_distance_meters integer NOT NULL DEFAULT 0,
        total_hazards integer NOT NULL DEFAULT 0,
        potholes_count integer NOT NULL DEFAULT 0,
        corrugation_count integer NOT NULL DEFAULT 0,
        ruts_count integer NOT NULL DEFAULT 0,
        severity_level text NOT NULL DEFAULT 'LOW',
        status text NOT NULL DEFAULT 'COMPLETED',
        summary_notes text NOT NULL DEFAULT '',
        metadata jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS hero_road_hazard_events (
        id serial PRIMARY KEY,
        session_id integer NOT NULL REFERENCES hero_road_hazard_sessions(id) ON DELETE CASCADE,
        hazard_type text NOT NULL,
        confidence numeric(5,3) NOT NULL DEFAULT 0.000,
        latitude numeric(11,8),
        longitude numeric(11,8),
        speed_kmh numeric(6,2) DEFAULT 0.00,
        photo_url text NOT NULL DEFAULT '',
        annotated_photo_url text,
        detection_boxes jsonb,
        quality_info jsonb,
        notes text NOT NULL DEFAULT '',
        is_manual_snap boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_road_hazard_events_session_id ON hero_road_hazard_events(session_id);
    `)
    isTableEnsured = true
  } catch (error) {
    console.warn('[road-hazard-db] Table guard check skipped/timed out:', error)
  }
}
