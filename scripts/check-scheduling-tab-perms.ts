import { db } from '@/db'
import { sql } from 'drizzle-orm'

async function main() {
  const items = await db.execute(sql`
    SELECT id, resource, title, url, section, menu_area, sort_order, is_visible
    FROM hero_navbar_menu_items
    WHERE section ILIKE '%roster%' OR resource ILIKE '%scheduling%' OR url ILIKE '%scheduling%'
    ORDER BY sort_order, id
  `)
  console.log('=== NAVBAR ITEMS FOR ROSTER & TIMESHEET ===')
  console.log(JSON.stringify(items.rows, null, 2))
}

main().catch(console.error)
