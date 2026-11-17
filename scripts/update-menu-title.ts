import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const pool = new Pool({ connectionString: getDatabaseUrl(), ssl: false })

async function update() {
  await pool.query(
    "UPDATE hero_navbar_menu_items SET title = 'Troubleshooting & Ticketing', icon_name = 'tool' WHERE url = '/dashboard/helpdesk'"
  )
  console.log('Menu title successfully updated to Troubleshooting & Ticketing!')
  await pool.end()
}

update().catch(console.error)
