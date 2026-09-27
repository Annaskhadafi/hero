import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🎫 Creating Helpdesk & Ticketing tables...')

    await client.query(`
      -- 1. hero_ticket_categories
      CREATE TABLE IF NOT EXISTS hero_ticket_categories (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#3b82f6',
        icon TEXT NOT NULL DEFAULT 'HelpCircle',
        default_sla_hours INTEGER NOT NULL DEFAULT 24,
        is_ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- 2. hero_ticket_routing_rules
      CREATE TABLE IF NOT EXISTS hero_ticket_routing_rules (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES hero_ticket_categories(id) ON DELETE CASCADE,
        site_id INTEGER REFERENCES hero_sites(id) ON DELETE CASCADE,
        assigned_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        notify_employee_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- 3. hero_tickets
      CREATE TABLE IF NOT EXISTS hero_tickets (
        id SERIAL PRIMARY KEY,
        ticket_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        site_id INTEGER NOT NULL REFERENCES hero_sites(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES hero_ticket_categories(id) ON DELETE RESTRICT,
        customer_user_id TEXT NOT NULL REFERENCES maestro_customer_users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'bot_active',
        assigned_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        claimed_at TIMESTAMP,
        ai_summary TEXT,
        escalation_reason TEXT,
        resolution_notes TEXT,
        resolved_at TIMESTAMP,
        closed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS hero_tickets_customer_id_idx ON hero_tickets(customer_id);
      CREATE INDEX IF NOT EXISTS hero_tickets_site_id_idx ON hero_tickets(site_id);
      CREATE INDEX IF NOT EXISTS hero_tickets_status_idx ON hero_tickets(status);
      CREATE INDEX IF NOT EXISTS hero_tickets_category_id_idx ON hero_tickets(category_id);
      CREATE INDEX IF NOT EXISTS hero_tickets_assigned_employee_idx ON hero_tickets(assigned_employee_id);

      -- 4. hero_ticket_messages
      CREATE TABLE IF NOT EXISTS hero_ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES hero_tickets(id) ON DELETE CASCADE,
        sender_type TEXT NOT NULL,
        sender_customer_user_id TEXT REFERENCES maestro_customer_users(id) ON DELETE SET NULL,
        sender_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
        ai_tokens INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS hero_ticket_messages_ticket_id_idx ON hero_ticket_messages(ticket_id);

      -- 5. hero_helpdesk_settings
      CREATE TABLE IF NOT EXISTS hero_helpdesk_settings (
        id SERIAL PRIMARY KEY,
        ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        ai_model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
        ai_system_prompt TEXT,
        ai_greeting_message TEXT,
        auto_escalate_keywords JSONB NOT NULL DEFAULT '["kecelakaan", "darurat", "urgent", "bahaya", "kebakaran", "tumpahan", "breakdown"]'::jsonb,
        max_bot_turns_before_escalate INTEGER NOT NULL DEFAULT 5,
        updated_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Seed initial categories if empty
      INSERT INTO hero_ticket_categories (code, name, description, color, icon, default_sla_hours, is_ai_enabled, is_active)
      VALUES 
        ('productivity', 'Productivity & Performance', 'Keluhan terkait produktivitas unit, ritase, dan performa ban', '#3b82f6', 'TrendingUp', 24, TRUE, TRUE),
        ('hse', 'HSE & Keselamatan', 'Pelaporan isu keselamatan kerja, insiden, atau kepatuhan K3', '#ef4444', 'ShieldAlert', 8, TRUE, TRUE),
        ('sales', 'Penjualan & Komersial', 'Pertanyaan seputar penawaran harga, kontrak, dan invoice', '#10b981', 'DollarSign', 24, TRUE, TRUE),
        ('spm', 'SPM / Service & Maintenance', 'Permintaan jadwal servis, perbaikan ban (repair), dan inspeksi', '#f59e0b', 'Wrench', 12, TRUE, TRUE),
        ('operation', 'Operasional & Site', 'Kendala operasional lapangan dan koordinasi tim site', '#8b5cf6', 'HardHat', 24, TRUE, TRUE),
        ('logistics', 'Logistik & Pengiriman', 'Tracking status pengiriman ban, delivery order, dan logistik', '#06b6d4', 'Truck', 24, TRUE, TRUE),
        ('other', 'Umum & Lain-lain', 'Pertanyaan umum dan keluhan yang tidak terdefinisi di atas', '#64748b', 'HelpCircle', 48, TRUE, TRUE)
      ON CONFLICT (code) DO NOTHING;

      -- Seed initial settings if empty
      INSERT INTO hero_helpdesk_settings (id, ai_enabled, ai_model, ai_system_prompt, ai_greeting_message, auto_escalate_keywords, max_bot_turns_before_escalate)
      VALUES (
        1,
        TRUE,
        'openai/gpt-4o-mini',
        'Anda adalah Asisten AI Helpdesk Chitra Paratama yang bertugas melayani keluhan dan pertanyaan customer di portal Maestro. Berikan jawaban yang sopan, solutif, empatik, dan profesional. Tanyakan informasi rinci jika keluhan membutuhkan data spesifik (nomor unit, lokasi site, foto bukti). Jika customer menyatakan masalah darurat atau meminta berbicara dengan petugas manusia, sampaikan bahwa tiket akan segera dialihkan ke tim spesialis HERO yang bersangkutan.',
        'Halo! Saya Asisten Pintar HERO Helpdesk. Terima kasih telah menghubungi kami. Bagaimana saya dapat membantu Anda hari ini?',
        '["kecelakaan", "darurat", "urgent", "bahaya", "kebakaran", "tumpahan", "breakdown", "manusia", "petugas", "staf", "bicara"]'::jsonb,
        5
      )
      ON CONFLICT (id) DO NOTHING;

      -- Seed Maestro Permissions for Tickets
      INSERT INTO maestro_permissions (code, label, module, action, is_active)
      VALUES 
        ('maestro:tickets:view', 'Lihat Tiket Helpdesk', 'tickets', 'view', TRUE),
        ('maestro:tickets:create', 'Buat Tiket Helpdesk', 'tickets', 'create', TRUE),
        ('maestro:tickets:chat', 'Kirim Pesan Tiket', 'tickets', 'chat', TRUE)
      ON CONFLICT (code) DO NOTHING;

      -- Grant permissions to default Maestro roles
      INSERT INTO maestro_role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM maestro_roles r
      CROSS JOIN maestro_permissions p
      WHERE p.code IN ('maestro:tickets:view', 'maestro:tickets:create', 'maestro:tickets:chat')
      ON CONFLICT DO NOTHING;

      -- Register Maestro Page Registry
      INSERT INTO maestro_page_registry (code, path, label, module, permission_code, menu_group, sort_order, requires_site_scope, is_active)
      VALUES (
        'MAESTRO_TICKETS',
        '/tickets',
        'Helpdesk & Tiket',
        'tickets',
        'maestro:tickets:view',
        'MAESTRO',
        40,
        FALSE,
        TRUE
      )
      ON CONFLICT (code) DO NOTHING;
    `)

    console.log('✓ All Helpdesk tables, initial categories, settings & Maestro registry created successfully!')
  } catch (err) {
    console.error('Failed to create helpdesk tables:', err)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
