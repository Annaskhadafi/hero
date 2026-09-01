import { db } from '../db'
import { navbarMenuItems } from '../db/schema/hero'
import { eq, or, asc } from 'drizzle-orm'

async function moveSopWinToQualityCpi() {
  console.log('🔄 Moving SOP/WIN to Quality & CPI section in database...')

  await db
    .update(navbarMenuItems)
    .set({
      section: 'Quality & CPI',
      groupLabel: 'Quality & Continuous Improvement',
      sortOrder: 1,
    })
    .where(or(eq(navbarMenuItems.resource, 'sop-win'), eq(navbarMenuItems.url, '/dashboard/sop-win')))

  await db
    .update(navbarMenuItems)
    .set({ sortOrder: 2 })
    .where(eq(navbarMenuItems.resource, 'five_r_report'))

  await db
    .update(navbarMenuItems)
    .set({ sortOrder: 3 })
    .where(eq(navbarMenuItems.resource, 'five_r_create'))

  await db
    .update(navbarMenuItems)
    .set({ sortOrder: 4 })
    .where(eq(navbarMenuItems.resource, 'five_r_master_area'))

  const qualityItems = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.section, 'Quality & CPI'))
    .orderBy(asc(navbarMenuItems.sortOrder))

  console.table(qualityItems)
  console.log('✅ Successfully moved SOP/WIN to Quality & CPI!')
}

moveSopWinToQualityCpi().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); })





