import { db } from '../db'
import { navbarMenuItems } from '../db/schema/hero'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('Moving SOP/WIN menu from GOBPI to Quality & CPI...')

  await db
    .update(navbarMenuItems)
    .set({
      section: 'Quality & CPI',
      groupLabel: 'Quality & Continuous Improvement',
      sortOrder: 2,
    })
    .where(eq(navbarMenuItems.id, 529))

  console.log('✅ Menu SOP/WIN successfully moved to Quality & CPI!')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
