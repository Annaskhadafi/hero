import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('📌 Registering Helpdesk Navbar Menu and Role Permissions...')

    // 1. Insert into hero_navbar_menu_items
    await client.query(`
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label)
      VALUES 
        ('main', 'Support & Helpdesk', 'Helpdesk Tiket', '/dashboard/helpdesk', 'headphones', 'helpdesk', 1, TRUE, FALSE, 'menu', 'Operasional'),
        ('main', 'Settings', 'Pengaturan Helpdesk', '/dashboard/settings/helpdesk', 'settings', 'helpdesk_settings', 25, TRUE, FALSE, 'menu', 'Pengaturan')
      ON CONFLICT DO NOTHING;
    `)

    // 2. Grant permissions to superadmin / all roles
    await client.query(`
      INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
      SELECT r.id, m.id, TRUE, TRUE, TRUE, TRUE, 'all'
      FROM hero_security_roles r
      CROSS JOIN hero_navbar_menu_items m
      WHERE m.resource IN ('helpdesk', 'helpdesk_settings')
      ON CONFLICT DO NOTHING;
    `)

    // 3. Register email template presets into email_templates using 'code' column
    await client.query(`
      INSERT INTO email_templates (id, name, code, subject, html_content, text_content, type, is_active)
      VALUES 
        (
          gen_random_uuid()::text,
          'Eskalasi Tiket Maestro ke Tim HERO',
          'MAESTRO_TICKET_ESCALATED',
          '[Helpdesk] Tiket Baru / Eskalasi: {{ticketNumber}} — {{categoryName}}',
          '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px"><h2 style="color:#4f46e5;margin-top:0">PT CHITRA PARATAMA - HELPDESK</h2><p>Halo Tim Spesialis HERO,</p><p>Terdapat tiket baru / eskalasi dari pelanggan Maestro yang membutuhkan respon penanganan Anda:</p><div style="background:#f8fafc;padding:15px;border-radius:6px;margin:15px 0"><p><strong>Nomor Tiket:</strong> {{ticketNumber}}</p><p><strong>Pelanggan:</strong> {{customerName}} ({{siteName}})</p><p><strong>Kategori:</strong> {{categoryName}}</p><p><strong>Judul Masalah:</strong> {{title}}</p><p><strong>Prioritas:</strong> {{priority}}</p><p><strong>Ringkasan AI:</strong> {{aiSummary}}</p></div><p><a href="{{ticketUrl}}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">Buka Tiket di Dashboard HERO</a></p></div>',
          'Halo Tim Spesialis HERO,\n\nTerdapat tiket eskalasi baru: {{ticketNumber}}\nPelanggan: {{customerName}} ({{siteName}})\nKategori: {{categoryName}}\nJudul: {{title}}\nPrioritas: {{priority}}\n\nBuka Tiket: {{ticketUrl}}',
          'notification',
          TRUE
        ),
        (
          gen_random_uuid()::text,
          'Balasan Petugas HERO ke Pelanggan Maestro',
          'MAESTRO_TICKET_AGENT_REPLY',
          '[Helpdesk Maestro] Balasan Baru untuk Tiket Anda: {{ticketNumber}}',
          '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px"><h2 style="color:#0284c7;margin-top:0">MAESTRO - PT CHITRA PARATAMA</h2><p>Yth. {{customerUserName}},</p><p>Petugas spesialis kami telah membalas tiket pengaduan Anda <strong>#{{ticketNumber}}</strong>:</p><div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:15px;margin:15px 0"><p style="margin:0;font-style:italic">"{{agentMessage}}"</p><p style="margin:8px 0 0 0;font-size:12px;color:#64748b">— {{agentName}} (Spesialis HERO)</p></div><p><a href="{{maestroTicketUrl}}" style="display:inline-block;padding:10px 20px;background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">Lihat & Lanjutkan Chat di Maestro</a></p></div>',
          'Yth. {{customerUserName}},\n\nPetugas spesialis HERO ({{agentName}}) telah membalas tiket #{{ticketNumber}}:\n"{{agentMessage}}"\n\nBuka di Maestro: {{maestroTicketUrl}}',
          'notification',
          TRUE
        )
      ON CONFLICT (code) DO NOTHING;
    `)

    console.log('✓ All Navbar menus, permissions, and email templates registered successfully!')
  } catch (err) {
    console.error('Registration failed:', err)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
