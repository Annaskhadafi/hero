import { db } from '../db'
import { navbarMenuItems } from '../db/schema/hero'
import { sql } from 'drizzle-orm'

async function main() {
  const result: any = await db.execute(sql`
    SELECT id, section, group_label, title, url, icon_name, resource, sort_order, is_visible
    FROM hero_navbar_menu_items
    WHERE title ILIKE '%sop%' 
       OR title ILIKE '%win%' 
       OR title ILIKE '%bpi%' 
       OR section ILIKE '%bpi%' 
       OR section ILIKE '%quality%'
       OR url ILIKE '%sop%'
       OR url ILIKE '%win%'
       OR url ILIKE '%bpi%'
  `)
  console.table(result.rows || result)
}

main().then(() => process.exit(0)).catch(console.error)
