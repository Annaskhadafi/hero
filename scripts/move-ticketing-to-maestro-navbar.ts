import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
const pool = new Pool({ connectionString: url, ssl: false })

async function updateNavbar() {
  const client = await pool.connect()
  try {
    console.log('📌 Moving Helpdesk Ticketing to MAESTRO section in Navbar...')

    // Delete previous temporary items if any
    await client.query(`
      DELETE FROM hero_navbar_menu_items 
      WHERE url IN ('/dashboard/helpdesk', '/dashboard/settings/helpdesk');
    `)

    // Insert under MAESTRO section
    const res = await client.query(`
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label)
      VALUES 
        ('main', 'MAESTRO', 'Ticketing Problem', '/dashboard/settings/maestro/tickets', 'headphones', 'maestro_tickets', 3, TRUE, FALSE, 'menu', 'Customer Portal'),
        ('main', 'MAESTRO', 'Pengaturan Ticketing & AI', '/dashboard/settings/maestro/tickets/settings', 'settings', 'maestro_tickets_settings', 4, TRUE, FALSE, 'menu', 'Customer Portal')
      RETURNING id, section, title, url;
    `)

    console.log('Inserted under MAESTRO:', res.rows)

    // Grant permissions to all security roles
    await client.query(`
      INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
      SELECT r.id, m.id, TRUE, TRUE, TRUE, TRUE, 'all'
      FROM hero_security_roles r
      CROSS JOIN hero_navbar_menu_items m
      WHERE m.url IN ('/dashboard/settings/maestro/tickets', '/dashboard/settings/maestro/tickets/settings')
      ON CONFLICT DO NOTHING;
    `)

    console.log('✓ Navbar menus moved to MAESTRO section successfully!')
  } finally {
    client.release()
    await pool.end()
  }
}

updateNavbar()
