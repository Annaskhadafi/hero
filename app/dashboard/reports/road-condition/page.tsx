import { asc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { AdminPageShell } from '@/components/admin-page-shell'
import { db } from '@/db'
import { sites } from '@/db/schema/hero'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { ensureHeroGovernanceSeedData } from '@/lib/hero-admin'
import { ROAD_CONDITION_RESOURCE } from '@/lib/road-condition-rubric'

import { RoadConditionAnalysisClient } from './client-page'

export default async function RoadConditionAnalysisPage() {
  await ensureHeroGovernanceSeedData()

  const [access, siteRows] = await Promise.all([
    getCurrentMenuPermission(ROAD_CONDITION_RESOURCE),
    db
      .select({
        id: sites.id,
        name: sites.name,
        customerName: sites.customerName,
      })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name)),
  ])

  if (!access.canView) {
    redirect('/dashboard/reports')
  }

  return (
    <AdminPageShell
      eyebrow="Laporan"
      title="Report Analysis Road Condition"
      description="Analisis foto road condition dan output report slide."
    >
      <RoadConditionAnalysisClient access={access} sites={siteRows} />
    </AdminPageShell>
  )
}
