import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
const pool = new Pool({ connectionString: url, ssl: false })

async function sync() {
  const c = await pool.connect()
  try {
    console.log('--- Syncing Service Desk Tables ---')

    await c.query(`
      CREATE TABLE IF NOT EXISTS hero_service_desk_categories (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#0753e7',
        icon TEXT NOT NULL DEFAULT 'Tool',
        target_department_id INTEGER,
        default_sla_hours INTEGER NOT NULL DEFAULT 24,
        is_system_issue BOOLEAN NOT NULL DEFAULT true,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await c.query(`
      CREATE TABLE IF NOT EXISTS hero_service_desk_tickets (
        id SERIAL PRIMARY KEY,
        ticket_number TEXT NOT NULL UNIQUE,
        unit_code TEXT,
        system_module TEXT NOT NULL DEFAULT 'General',
        site_id INTEGER NOT NULL REFERENCES hero_sites(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES hero_service_desk_categories(id) ON DELETE SET NULL,
        category_name TEXT NOT NULL DEFAULT 'General Issue',
        reporter_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        source_department_id INTEGER,
        target_department_id INTEGER,
        title TEXT NOT NULL,
        finding_description TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'user_report',
        source_detail TEXT NOT NULL DEFAULT 'Pelaporan Langsung',
        priority TEXT NOT NULL DEFAULT 'sedang',
        status TEXT NOT NULL DEFAULT 'baru',
        assigned_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        assigned_employee_name TEXT,
        assigned_role TEXT,
        detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
        claimed_at TIMESTAMP,
        target_sla_at TIMESTAMP NOT NULL,
        resolved_at TIMESTAMP,
        closed_at TIMESTAMP,
        resolution_notes TEXT,
        mttr_hours DOUBLE PRECISION,
        satisfaction_rating INTEGER,
        satisfaction_feedback TEXT,
        attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await c.query(`
      CREATE INDEX IF NOT EXISTS idx_hero_service_desk_tickets_status ON hero_service_desk_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_hero_service_desk_tickets_site ON hero_service_desk_tickets(site_id);
      CREATE INDEX IF NOT EXISTS idx_hero_service_desk_tickets_priority ON hero_service_desk_tickets(priority);
    `)

    await c.query(`
      CREATE TABLE IF NOT EXISTS hero_service_desk_activities (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES hero_service_desk_tickets(id) ON DELETE CASCADE,
        actor_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        actor_name TEXT NOT NULL DEFAULT 'Sistem',
        action_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await c.query(`
      CREATE TABLE IF NOT EXISTS hero_service_desk_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES hero_service_desk_tickets(id) ON DELETE CASCADE,
        sender_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        sender_name TEXT NOT NULL DEFAULT 'User',
        sender_role TEXT NOT NULL DEFAULT 'Pelapor',
        message TEXT NOT NULL,
        attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_internal_note BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await c.query(`
      CREATE TABLE IF NOT EXISTS hero_service_desk_knowledge_base (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category_code TEXT NOT NULL,
        system_module TEXT NOT NULL DEFAULT 'General',
        symptom TEXT NOT NULL,
        root_cause TEXT NOT NULL,
        solution_steps TEXT NOT NULL,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        view_count INTEGER NOT NULL DEFAULT 0,
        helpful_count INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    console.log('Service Desk tables verified and synced successfully!')
  } finally {
    c.release()
    await pool.end()
  }
}

sync().catch(console.error)
