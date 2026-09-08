import { db } from '../db'
import { navbarMenuItems } from '../db/schema/hero'
import { eq, or } from 'drizzle-orm'

async function main() {
  console.log('Moving GOBPI (SOP/WIN) menu to Quality & CPI...')

  await db
    .update(navbarMenuItems)
    .set({
      section: 'Quality & CPI',
      groupLabel: 'Quality & Continuous Improvement',
      sortOrder: 2,
      isVisible: true,
    })
    .where(
      or(
        eq(navbarMenuItems.resource, 'sop-win'),
        eq(navbarMenuItems.url, '/dashboard/sop-win'),
        eq(navbarMenuItems.section, 'GOBPI')
      )
    )

  await db
    .update(navbarMenuItems)
    .set({
      section: 'Quality & CPI',
      groupLabel: 'Quality & Continuous Improvement',
      sortOrder: 1,
      isVisible: true,
    })
    .where(
      or(
        eq(navbarMenuItems.resource, 'five_r_report'),
        eq(navbarMenuItems.url, '/dashboard/quality/5r')
      )
    )

  await db
    .delete(navbarMenuItems)
    .where(eq(navbarMenuItems.section, 'GOBPI'))

  console.log('✅ Menu SOP/WIN successfully moved to Quality & CPI and GOBPI section cleaned up!')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
