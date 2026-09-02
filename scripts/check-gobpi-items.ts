import { db } from '../db'
import { navbarMenuItems } from '../db/schema/hero'
import { eq } from 'drizzle-orm'

async function main() {
  const items = await db.select().from(navbarMenuItems).where(eq(navbarMenuItems.section, 'GOBPI'))
  console.log('Items in section GOBPI:', items)
}

main().then(() => process.exit(0)).catch(console.error)
