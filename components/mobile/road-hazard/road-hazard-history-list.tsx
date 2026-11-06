'use client'

import { useState } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Download,
  Loader2,
  FileText,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroDetailModal, HeroStatusBadge } from '@/components/templates'
import { generateRoadHazardPdf } from '@/lib/road-hazard/road-hazard-pdf'
import { resolveClientUploadUrl } from '@/lib/client-upload-url'
import { toast } from 'sonner'

export interface RoadHazardSessionRow {
  id: number
  sessionCode: string
  siteId: number | null
  siteName: string
  customerName: string
  inspectorName: string
  roadSection: string
  startTime: string | Date
  endTime: string | Date | null
  durationSeconds: number
  totalDistanceMeters: number
  totalHazards: number
  potholesCount: number
  corrugationCount: number
  rutsCount: number
  severityLevel: string
  summaryNotes: string
  createdAt: string | Date
}

interface RoadHazardHistoryListProps {
  initialSessions: RoadHazardSessionRow[]
}

export function RoadHazardHistoryList({ initialSessions }: RoadHazardHistoryListProps) {
  const [sessions, setSessions] = useState<RoadHazardSessionRow[]>(initialSessions)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState<RoadHazardSessionRow | null>(null)
  const [sessionEvents, setSessionEvents] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  // Filtered sessions
  const filtered = sessions.filter((s) => {
    const q = searchQuery.toLowerCase()
    return (
      s.sessionCode.toLowerCase().includes(q) ||
      s.siteName.toLowerCase().includes(q) ||
      s.roadSection.toLowerCase().includes(q) ||
      s.inspectorName.toLowerCase().includes(q)
    )
  })

  // Open Detail Modal & Fetch Events
  const handleOpenDetail = async (row: RoadHazardSessionRow) => {
    setSelectedSession(row)
    setDetailModalOpen(true)
    setLoadingDetail(true)

    try {
      const res = await fetch(`/api/mobile/road-hazard/session/${row.id}`)
      if (res.ok) {
        const data = await res.json()
        setSessionEvents(data.events || [])
      } else {
        setSessionEvents([])
      }
    } catch {
      setSessionEvents([])
    } finally {
      setLoadingDetail(false)
    }
  }

  // Export PDF from history detail
  const handleExportHistoryPdf = async () => {
    if (!selectedSession || isExportingPdf) return
    setIsExportingPdf(true)

    try {
      const pdfBlob = await generateRoadHazardPdf({
        sessionCode: selectedSession.sessionCode,
        siteName: selectedSession.siteName,
        customerName: selectedSession.customerName,
        inspectorName: selectedSession.inspectorName,
        roadSection: selectedSession.roadSection,
        dateStr: new Date(selectedSession.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        durationText: `${Math.floor(selectedSession.durationSeconds / 60)}m ${
          selectedSession.durationSeconds % 60
        }s`,
        totalDistanceText: `~${(selectedSession.totalDistanceMeters / 1000).toFixed(2)} km`,
        totalHazards: selectedSession.totalHazards,
        potholesCount: selectedSession.potholesCount,
        corrugationCount: selectedSession.corrugationCount,
        rutsCount: selectedSession.rutsCount,
        severityLevel: selectedSession.severityLevel,
        summaryNotes: selectedSession.summaryNotes,
        events: sessionEvents.map((ev) => ({
          hazardType: ev.hazardType,
          confidence: Number(ev.confidence || 0),
          latitude: ev.latitude,
          longitude: ev.longitude,
          speedKmh: ev.speedKmh,
          photoUrl: ev.photoUrl,
          annotatedPhotoUrl: ev.annotatedPhotoUrl,
          notes: ev.notes,
        })),
      })

      const blobUrl = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `Laporan-${selectedSession.sessionCode}.pdf`
      link.click()
      URL.revokeObjectURL(blobUrl)

      toast.success('Laporan PDF berhasil diunduh.')
    } catch (err) {
      toast.error('Gagal mengunduh PDF riwayat.')
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="space-y-3 pb-8">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari kode sesi, site, atau jalan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full rounded-xl border border-border/70 bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
        />
      </div>

      {/* List Container */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-8 text-center text-xs text-muted-foreground">
          Belum ada riwayat inspeksi road hazard yang tersimpan.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const dateFormatted = new Date(item.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            const mins = Math.floor(item.durationSeconds / 60)
            const secs = item.durationSeconds % 60

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                className="cursor-pointer rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm transition-all hover:border-primary/50 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">
                      {item.sessionCode}
                    </span>
                    <h4 className="font-display text-sm font-black text-foreground">
                      {item.siteName}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                      {item.roadSection || 'Hauling Road'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        item.severityLevel === 'CRITICAL'
                          ? 'bg-rose-500/15 text-rose-600'
                          : item.severityLevel === 'HIGH'
                          ? 'bg-amber-500/15 text-amber-600'
                          : item.severityLevel === 'MEDIUM'
                          ? 'bg-yellow-500/15 text-yellow-600'
                          : 'bg-emerald-500/15 text-emerald-600'
                      }`}
                    >
                      {item.severityLevel}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{dateFormatted}</span>
                  </div>
                </div>

                {/* Badges Breakdown */}
                <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-600">
                      P: {item.potholesCount}
                    </span>
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-600">
                      C: {item.corrugationCount}
                    </span>
                    <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-yellow-600">
                      R: {item.rutsCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="size-3" />
                    <span>{mins}m {secs}s</span>
                    <ChevronRight className="size-3.5 text-muted-foreground/60" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedSession && (
        <HeroDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          title={`Detail Sesi ${selectedSession.sessionCode}`}
          statusBadge={
            <HeroStatusBadge
              status={selectedSession.severityLevel}
            />
          }
        >
          <div className="space-y-4">
            {/* Quick Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/40 p-2.5">
                <p className="text-[10px] text-muted-foreground">Site & Customer</p>
                <p className="font-bold text-foreground">
                  {selectedSession.siteName}{' '}
                  {selectedSession.customerName ? `(${selectedSession.customerName})` : ''}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5">
                <p className="text-[10px] text-muted-foreground">Inspector</p>
                <p className="font-bold text-foreground">{selectedSession.inspectorName || '-'}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5">
                <p className="text-[10px] text-muted-foreground">Segmen Jalur</p>
                <p className="font-bold text-foreground">{selectedSession.roadSection || '-'}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5">
                <p className="text-[10px] text-muted-foreground">Total Kendala</p>
                <p className="font-bold text-foreground">{selectedSession.totalHazards} titik</p>
              </div>
            </div>

            {/* Action Download PDF */}
            <Button
              type="button"
              onClick={handleExportHistoryPdf}
              disabled={isExportingPdf}
              className="h-9 w-full gap-2 rounded-lg bg-primary text-xs font-semibold"
            >
              {isExportingPdf ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span>Unduh Dokumen PDF Resmi</span>
            </Button>

            {/* Event Snapshots */}
            <div className="space-y-2 pt-2">
              <h5 className="font-display text-xs font-black text-foreground">
                Daftar Snapshot ({sessionEvents.length})
              </h5>

              {loadingDetail ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : sessionEvents.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">
                  Tidak ada foto kendala dalam sesi ini.
                </p>
              ) : (
                <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  {sessionEvents.map((ev, i) => {
                    const imgUrl = resolveClientUploadUrl(ev.annotatedPhotoUrl || ev.photoUrl)
                    return (
                      <div
                        key={ev.id || i}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2 text-xs"
                      >
                        <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-black">
                          {imgUrl ? (
                            <img src={imgUrl} alt="Hazard" className="size-full object-cover" />
                          ) : (
                            <div className="size-full bg-slate-800" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground uppercase text-[11px]">
                            {ev.hazardType}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Keyakinan: {Math.round(Number(ev.confidence || 0) * 100)}%
                          </p>
                          {ev.latitude && ev.longitude && (
                            <p className="text-[10px] text-emerald-600 truncate">
                              GPS: {Number(ev.latitude).toFixed(5)}, {Number(ev.longitude).toFixed(5)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </HeroDetailModal>
      )}
    </div>
  )
}
