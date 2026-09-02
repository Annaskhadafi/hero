import { db } from '../db'
import { navbarMenuItems } from '../db/schema/hero'
import { eq, ilike, or } from 'drizzle-orm'

async function main() {
  const items = await db
    .select()
    .from(navbarMenuItems)
    .where(
      or(
        eq(navbarMenuItems.section, 'Quality & CPI'),
        ilike(navbarMenuItems.url, '%5r%')
      )
    )

  console.table(items)
}

main().then(() => process.exit(0)).catch(console.error)
