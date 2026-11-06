import { asc, desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { Video, Sparkles, Route, ShieldAlert } from 'lucide-react'

import { db } from '@/db'
import { sites } from '@/db/schema/hero'
import { roadHazardSessions } from '@/db/schema/road-hazard'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { ensureRoadHazardTables } from '@/lib/road-hazard/db-helper'
import { RoadHazardClientPage } from './road-hazard-client'

export default async function MobileRoadHazardPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/mobile/hse/road-hazard')
  }

  const access = await getCurrentMenuPermission('hse_road_hazard')
  if (!access.canView) {
    redirect('/403')
  }

  await ensureRoadHazardTables()

  const [siteRows, sessionRows] = await Promise.all([
    db
      .select({
        id: sites.id,
        name: sites.name,
        customerName: sites.customerName,
      })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name))
      .catch((err) => {
        console.warn('[road-hazard-mobile] Failed to load sites:', err)
        return []
      }),

    db
      .select()
      .from(roadHazardSessions)
      .orderBy(desc(roadHazardSessions.createdAt))
      .limit(20)
      .catch((err) => {
        console.warn('[road-hazard-mobile] Failed to load sessions:', err)
        return []
      }),
  ])

  const parsedSessions = sessionRows.map((s) => ({
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
    summaryNotes: s.summaryNotes,
    createdAt: s.createdAt.toISOString(),
  }))

  return (
    <main className="min-h-dvh bg-slate-50 pb-8 dark:bg-slate-950">
      {/* Mobile Top Header Banner */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-950 via-slate-900 to-[#0753e7] px-4 pb-4 pt-3.5 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <Video className="size-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                HSE & SAFETY AI
              </span>
              <span className="rounded bg-cyan-400/20 px-1 py-0.2 text-[9px] font-bold text-cyan-300 border border-cyan-400/30">
                LIVE
              </span>
            </div>
            <h1 className="truncate font-display text-base font-black text-white">
              Road Hazard AI & Record
            </h1>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-white/70">
          Deteksi real-time lubang, keriting & alur jalan via Vision AI
        </p>
      </div>

      {/* Main Container */}
      <div className="px-3 pt-3">
        <RoadHazardClientPage
          sites={siteRows}
          initialSessions={parsedSessions}
          currentUserName={session.user.name || session.user.email || 'Inspector HSE'}
        />
      </div>
    </main>
  )
}
