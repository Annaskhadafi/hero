import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
const pool = new Pool({ connectionString: url, ssl: false })

async function verify() {
  const c = await pool.connect()
  try {
    const cats = await c.query('SELECT code, name, color FROM hero_ticket_categories')
    const sets = await c.query('SELECT ai_enabled, ai_model FROM hero_helpdesk_settings')
    const menus = await c.query(
      "SELECT id, section, title, url, menu_area, group_label FROM hero_navbar_menu_items WHERE LOWER(title) LIKE '%maestro%' OR LOWER(section) LIKE '%maestro%' OR LOWER(url) LIKE '%maestro%'",
    )
    console.log('Maestro Menus:', menus.rows)
  } finally {
    c.release()
    await pool.end()
  }
}

verify()
