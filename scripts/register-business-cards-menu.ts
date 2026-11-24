import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('📌 Registering Business Card Scanner Menu and Role Permissions...')

    // 1. Insert into hero_navbar_menu_items
    await client.query(`
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label)
      SELECT 'main', 'Marketing & Sales', 'Business Card Scanner', '/dashboard/business-cards', 'camera', 'business_cards', 5, TRUE, FALSE, 'menu', 'Expo & Leads'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/business-cards' OR resource = 'business_cards'
      );
    `)

    // 2. Grant permissions to roles
    await client.query(`
      INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
      SELECT r.id, m.id, TRUE, TRUE, TRUE, TRUE, 'all'
      FROM hero_security_roles r
      CROSS JOIN hero_navbar_menu_items m
      WHERE m.resource = 'business_cards'
      ON CONFLICT DO NOTHING;
    `)

    console.log('✅ Menu Business Card Scanner berhasil didaftarkan di navbar dan role permissions!')
  } catch (err) {
    console.error('Error registering menu:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
