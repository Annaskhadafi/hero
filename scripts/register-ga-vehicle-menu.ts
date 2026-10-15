import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/hero_db',
})

async function main() {
  try {
    await pool.query(`
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label)
      SELECT 'main', 'HRGA', 'Armada Kendaraan (GA)', '/dashboard/ga/vehicles', 'truck', 'ga-vehicles', 37, true, false, 'menu', 'General Affairs (GA)'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/ga/vehicles'
      );
    `)
    console.log('✓ GA Vehicles navbar menu item registered successfully')
  } catch (err) {
    console.error('Error inserting navbar menu item:', err)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

main()
