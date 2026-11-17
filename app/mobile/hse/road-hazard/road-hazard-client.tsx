'use client'

import { useState } from 'react'
import {
  Video,
  FileCheck2,
  History,
  Route,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react'
import { RoadHazardCameraView, type DetectedHazardEvent } from '@/components/mobile/road-hazard/road-hazard-camera-view'
import { RoadHazardRecapView } from '@/components/mobile/road-hazard/road-hazard-recap-view'
import { RoadHazardHistoryList, type RoadHazardSessionRow } from '@/components/mobile/road-hazard/road-hazard-history-list'
import { HeroSearchableSelect } from '@/components/templates'

interface SiteOption {
  id: number
  name: string
  customerName?: string
}

interface RoadHazardClientPageProps {
  sites: SiteOption[]
  initialSessions: RoadHazardSessionRow[]
  currentUserName: string
}

export function RoadHazardClientPage({
  sites,
  initialSessions,
  currentUserName,
}: RoadHazardClientPageProps) {
  const [activeTab, setActiveTab] = useState<'live' | 'recap' | 'history'>('live')

  // Selected Site & Road Section
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    sites[0]?.id ? String(sites[0].id) : '1'
  )
  const [roadSection, setRoadSection] = useState('Hauling Road KM 00 - 15')

  const selectedSite = sites.find((s) => String(s.id) === selectedSiteId) || sites[0]

  // Completed trip session data
  const [completedTrip, setCompletedTrip] = useState<{
    durationSeconds: number
    totalDistanceMeters: number
    events: DetectedHazardEvent[]
  } | null>(null)

  // When trip finishes from camera view
  const handleCompleteTrip = (sessionData: {
    durationSeconds: number
    totalDistanceMeters: number
    events: DetectedHazardEvent[]
  }) => {
    setCompletedTrip(sessionData)
    setActiveTab('recap')
  }

  // Reset to start a new trip
  const handleResetNewTrip = () => {
    setCompletedTrip(null)
    setActiveTab('live')
  }

  return (
    <div className="space-y-3">
      {/* Tab Switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'live'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Video className="size-3.5" />
          <span>Live AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recap')}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'recap'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileCheck2 className="size-3.5" />
          <span>Rekap</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <History className="size-3.5" />
          <span>Riwayat</span>
        </button>
      </div>

      {/* Site & Section Bar (only visible on live tab) */}
      {activeTab === 'live' && (
        <div className="rounded-xl border border-border/80 bg-card p-2.5 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Pilih Site Operasional
              </label>
              <HeroSearchableSelect
                value={selectedSiteId}
                onChange={(val) => val && setSelectedSiteId(String(val))}
                options={sites.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  description: s.customerName,
                }))}
                placeholder="Pilih Site..."
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Segmen Jalur / Rute Jalan
            </label>
            <input
              type="text"
              value={roadSection}
              onChange={(e) => setRoadSection(e.target.value)}
              placeholder="Contoh: Hauling Road KM 02 - KM 18"
              className="h-8 w-full rounded-lg border border-border/70 bg-muted/20 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'live' && (
        <RoadHazardCameraView
          siteId={selectedSite?.id || 1}
          siteName={selectedSite?.name || 'Site Operasional'}
          roadSection={roadSection}
          onCompleteTrip={handleCompleteTrip}
        />
      )}

      {activeTab === 'recap' && (
        <RoadHazardRecapView
          siteId={selectedSite?.id || 1}
          siteName={selectedSite?.name || 'Site Operasional'}
          customerName={selectedSite?.customerName}
          inspectorName={currentUserName}
          roadSection={roadSection}
          durationSeconds={completedTrip?.durationSeconds ?? 0}
          totalDistanceMeters={completedTrip?.totalDistanceMeters ?? 0}
          events={completedTrip?.events ?? []}
          onResetNewTrip={handleResetNewTrip}
        />
      )}

      {activeTab === 'history' && (
        <RoadHazardHistoryList initialSessions={initialSessions} />
      )}
    </div>
  )
}
