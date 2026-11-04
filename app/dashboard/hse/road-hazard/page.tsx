import { desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { AdminPageShell } from '@/components/admin-page-shell'
import { db } from '@/db'
import { roadHazardSessions } from '@/db/schema/road-hazard'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { ensureRoadHazardTables } from '@/lib/road-hazard/db-helper'
import { RoadHazardDesktopClient, type RoadHazardSessionRow } from './road-hazard-desktop-client'

export const dynamic = 'force-dynamic'

export default async function RoadHazardDashboardPage() {
  await ensureRoadHazardTables()

  const access = await getCurrentMenuPermission('hse_road_hazard')
  if (!access.canView) {
    redirect('/dashboard')
  }

  const rawSessions = await db
    .select()
    .from(roadHazardSessions)
    .orderBy(desc(roadHazardSessions.createdAt))
    .limit(100)
    .catch((err) => {
      console.warn('[road-hazard-dashboard] Failed to load sessions:', err)
      return []
    })

  const sessions: RoadHazardSessionRow[] = rawSessions.map((s) => ({
    id: s.id,
    sessionCode: s.sessionCode,
    siteId: s.siteId,
    siteName: s.siteName,
    customerName: s.customerName,
    inspectorName: s.inspectorName,
    roadSection: s.roadSection,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime ? s.endTime.toISOString() : null,
    durationSeconds: s.durationSeconds,
    totalDistanceMeters: s.totalDistanceMeters,
    totalHazards: s.totalHazards,
    potholesCount: s.potholesCount,
    corrugationCount: s.corrugationCount,
    rutsCount: s.rutsCount,
    severityLevel: s.severityLevel,
    status: s.status,
    summaryNotes: s.summaryNotes,
  }))

  return (
    <AdminPageShell
      eyebrow="HSE & Keselamatan Kerja"
      title="Road Hazard AI & Field Monitoring"
      description="Pemantauan inspeksi jalan hauling, deteksi lubang & keriting jalan, serta integrasi rekaman dashcam unit."
    >
      <RoadHazardDesktopClient
        sessions={sessions}
        canEdit={access.canEdit}
        canDelete={access.canDelete}
      />
    </AdminPageShell>
  )
}
