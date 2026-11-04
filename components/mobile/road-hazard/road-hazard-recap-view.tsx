'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Save,
  RotateCcw,
  MapPin,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Gauge,
  Clock,
  Camera,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  Share2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HeroKpiCard } from '@/components/templates'
import { generateRoadHazardPdf } from '@/lib/road-hazard/road-hazard-pdf'
import { generateRoadHazardExcel } from '@/lib/road-hazard/road-hazard-excel'
import { resolveClientUploadUrl } from '@/lib/client-upload-url'
import type { DetectedHazardEvent } from './road-hazard-camera-view'

interface RoadHazardRecapViewProps {
  sessionCode?: string
  siteId: string | number
  siteName: string
  customerName?: string
  inspectorName: string
  roadSection: string
  durationSeconds: number
  totalDistanceMeters: number
  events: DetectedHazardEvent[]
  onResetNewTrip: () => void
}

export function RoadHazardRecapView({
  sessionCode = 'DRAFT',
  siteId,
  siteName,
  customerName = '',
  inspectorName,
  roadSection,
  durationSeconds,
  totalDistanceMeters,
  events,
  onResetNewTrip,
}: RoadHazardRecapViewProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [currentSessionCode, setCurrentSessionCode] = useState(sessionCode)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [notesState, setNotesState] = useState<Record<string, string>>({})
  const [previewSnapshot, setPreviewSnapshot] = useState<DetectedHazardEvent | null>(null)
  const [summaryNotes, setSummaryNotes] = useState('')

  // Statistics
  const totalHazards = events.length
  const potholesCount = events.filter((e) => e.hazardType === 'Potholes').length
  const corrugationCount = events.filter((e) => e.hazardType === 'Corragation').length
  const rutsCount = events.filter((e) => e.hazardType === 'Ruts').length

  const severityLevel =
    potholesCount >= 5 || totalHazards >= 12
      ? 'CRITICAL'
      : potholesCount >= 3 || totalHazards >= 7
      ? 'HIGH'
      : totalHazards >= 3
      ? 'MEDIUM'
      : 'LOW'

  // Format Duration
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${mins}m ${s}s`
  }

  // Handle Save Session to Database
  const handleSaveToDatabase = async () => {
    if (isSaving || isSaved) return
    setIsSaving(true)

    try {
      const payload = {
        siteId,
        siteName,
        customerName,
        roadSection,
        durationSeconds,
        totalDistanceMeters,
        totalHazards,
        potholesCount,
        corrugationCount,
        rutsCount,
        severityLevel,
        summaryNotes,
        events: events.map((ev) => ({
          hazardType: ev.hazardType,
          confidence: ev.confidence,
          latitude: ev.latitude,
          longitude: ev.longitude,
          speedKmh: ev.speedKmh,
          photoUrl: ev.photoUrl || '',
          annotatedPhotoUrl: ev.annotatedPhotoUrl || null,
          detectionBoxes: ev.detectionBoxes || null,
          notes: notesState[ev.id] ?? ev.notes ?? '',
          isManualSnap: ev.isManualSnap,
        })),
      }

      const res = await fetch('/api/mobile/road-hazard/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Gagal menyimpan ke database.')
      }

      const data = await res.json()
      setIsSaved(true)
      if (data.sessionCode) {
        setCurrentSessionCode(data.sessionCode)
      }
      toast.success(`Sesi berhasil disimpan! (Kode: ${data.sessionCode || 'OK'})`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan sesi.')
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save on arrival at recap screen so user data is never lost
  useEffect(() => {
    if (!isSaved && !isSaving && (events.length > 0 || durationSeconds > 0)) {
      handleSaveToDatabase()
    }
  }, [])

  // Handle Export PDF
  const handleExportPdf = async () => {
    if (isExportingPdf) return
    setIsExportingPdf(true)

    try {
      const pdfBlob = await generateRoadHazardPdf({
        sessionCode: currentSessionCode,
        siteName,
        customerName,
        inspectorName,
        roadSection,
        dateStr: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        durationText: formatDuration(durationSeconds),
        totalDistanceText: `~${(totalDistanceMeters / 1000).toFixed(2)} km`,
        totalHazards,
        potholesCount,
        corrugationCount,
        rutsCount,
        severityLevel,
        summaryNotes,
        events: events.map((ev) => ({
          hazardType: ev.hazardType,
          confidence: ev.confidence,
          latitude: ev.latitude,
          longitude: ev.longitude,
          speedKmh: ev.speedKmh,
          photoUrl: ev.photoUrl,
          annotatedPhotoUrl: ev.annotatedPhotoUrl,
          notes: notesState[ev.id] ?? ev.notes,
        })),
      })

      const blobUrl = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `Laporan-Road-Hazard-${siteName.replace(/\s+/g, '_')}-${Date.now()}.pdf`
      link.click()
      URL.revokeObjectURL(blobUrl)

      toast.success('Laporan PDF resmi berhasil diunduh.')
    } catch (err) {
      console.error('[road-hazard-pdf] Export failed:', err)
      toast.error('Gagal mencetak dokumen PDF.')
    } finally {
      setIsExportingPdf(false)
    }
  }

  // Handle Export Excel (.xlsx) for Road Maintenance / Grader Team
  const handleExportExcel = async () => {
    if (isExportingExcel) return
    setIsExportingExcel(true)
    try {
      const excelBlob = generateRoadHazardExcel({
        sessionCode: currentSessionCode,
        siteName,
        customerName,
        inspectorName,
        roadSection,
        dateStr: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        durationText: formatDuration(durationSeconds),
        totalDistanceText: `~${(totalDistanceMeters / 1000).toFixed(2)} km`,
        totalHazards,
        potholesCount,
        corrugationCount,
        rutsCount,
        severityLevel,
        summaryNotes,
        events: events.map((ev) => ({
          hazardType: ev.hazardType,
          confidence: ev.confidence,
          latitude: ev.latitude,
          longitude: ev.longitude,
          speedKmh: ev.speedKmh,
          photoUrl: ev.photoUrl,
          notes: notesState[ev.id] ?? ev.notes,
          timestamp: ev.timestamp,
          isManualSnap: ev.isManualSnap,
        })),
      })

      const blobUrl = URL.createObjectURL(excelBlob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `Laporan-Road-Hazard-Titik-Maintenance-${siteName.replace(/\s+/g, '_')}-${Date.now()}.xlsx`
      link.click()
      URL.revokeObjectURL(blobUrl)

      toast.success('Data Excel (.xlsx) berhasil diunduh untuk tim maintenance jalan.')
    } catch (err) {
      console.error('[road-hazard-excel] Export failed:', err)
      toast.error('Gagal mengekspor file Excel.')
    } finally {
      setIsExportingExcel(false)
    }
  }

  // Handle Share WhatsApp
  const handleShareWhatsApp = () => {
    try {
      const dateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      const text = `🚨 *LAPORAN ROAD HAZARD LIVE AI - HERO HSE*
────────────────────────────
📍 *Site:* ${siteName}
🛣️ *Rute:* ${roadSection || 'Hauling Road'}
👤 *Inspektur:* ${inspectorName}
📅 *Tanggal:* ${dateStr}
⏱️ *Durasi:* ${formatDuration(durationSeconds)} (~${(totalDistanceMeters / 1000).toFixed(2)} km)

⚠️ *LEVEL RISIKO:* *${severityLevel} RISK*
📊 *Total Kendala:* ${totalHazards} Titik
 • 🕳️ Potholes (Lubang): ${potholesCount}
 • 〰️ Corrugation (Keriting): ${corrugationCount}
 • 🛣️ Ruts (Alur Ambles): ${rutsCount}

📝 *Catatan / Rekomendasi Tindakan:*
${summaryNotes || 'Perlu perataan (grading) dan penimbunan batu agregat pada titik lubang aktif.'}
────────────────────────────
Kode Sesi: ${currentSessionCode}
*HERO Mobile AI Dashcam*`

      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
      window.open(waUrl, '_blank')
    } catch {
      toast.error('Gagal membuka WhatsApp.')
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Session Overview Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Rekapitulasi Trip
            </span>
            <h2 className="font-display text-base font-black text-foreground">{siteName}</h2>
            <p className="text-xs text-muted-foreground">{roadSection || 'Hauling Road'}</p>
          </div>
          <div
            className={`rounded-xl px-3 py-1 text-xs font-black uppercase tracking-wider ${
              severityLevel === 'CRITICAL'
                ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                : severityLevel === 'HIGH'
                ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                : severityLevel === 'MEDIUM'
                ? 'bg-yellow-500/15 text-yellow-600 border border-yellow-500/30'
                : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
            }`}
          >
            {severityLevel} RISK
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
            <Clock className="size-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Durasi Rekam</p>
              <p className="font-bold text-foreground">{formatDuration(durationSeconds)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
            <Gauge className="size-4 text-cyan-600 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Est. Jarak Tempuh</p>
              <p className="font-bold text-foreground">{(totalDistanceMeters / 1000).toFixed(2)} km</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <HeroKpiCard
          title="Total Kendala"
          value={totalHazards}
          icon={<AlertTriangle className="size-5" />}
          tone="blue"
          description="Titik bahaya terdeteksi"
        />
        <HeroKpiCard
          title="Potholes (Lubang)"
          value={potholesCount}
          icon={<AlertTriangle className="size-5" />}
          tone="rose"
          description="Potensi rusak ban"
        />
        <HeroKpiCard
          title="Corrugation"
          value={corrugationCount}
          icon={<Layers className="size-5" />}
          tone="amber"
          description="Jalan bergelombang"
        />
        <HeroKpiCard
          title="Ruts (Alur Ambles)"
          value={rutsCount}
          icon={<Gauge className="size-5" />}
          tone="cyan"
          description="Alur roda dalam"
        />
      </div>

      {/* Saved Status Banner */}
      {isSaved && currentSessionCode && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-2.5 text-xs border border-emerald-500/25">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <div>
              <p className="font-bold">Sesi Tersimpan di Database</p>
              <p className="text-[10px] opacity-80">Kode: {currentSessionCode}</p>
            </div>
          </div>
          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
            TERCATAT
          </span>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center pt-1">
        <Button
          type="button"
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          className="h-9 gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm"
        >
          {isExportingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span>PDF Resmi</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleExportExcel}
          disabled={isExportingExcel}
          className="h-9 gap-1.5 rounded-lg font-semibold text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          title="Download data titik koordinat untuk tim grader/maintenance"
        >
          {isExportingExcel ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4 text-emerald-600" />
          )}
          <span>Excel .xlsx</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleShareWhatsApp}
          className="h-9 gap-1.5 rounded-lg font-semibold text-xs border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
          title="Bagikan ringkasan laporan ke grup WhatsApp HSE"
        >
          <Share2 className="size-4 text-green-600" />
          <span>Share WA</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleSaveToDatabase}
          disabled={isSaving || isSaved}
          className={`h-9 gap-1.5 rounded-lg font-semibold text-xs ${
            isSaved ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : ''
          }`}
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isSaved ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : (
            <Save className="size-4" />
          )}
          <span>{isSaved ? 'Tersimpan di DB' : 'Simpan'}</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onResetNewTrip}
          className="col-span-2 sm:col-span-1 h-9 gap-1.5 rounded-lg text-xs font-semibold"
          title="Mulai Sesi Baru"
        >
          <RotateCcw className="size-3.5" />
          <span>Sesi Baru</span>
        </Button>
      </div>

      {/* Summary Notes Input */}
      <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
        <label className="text-[11px] font-bold text-foreground">Catatan / Rekomendasi Perbaikan</label>
        <textarea
          value={summaryNotes}
          onChange={(e) => setSummaryNotes(e.target.value)}
          placeholder="Tuliskan rekomendasi tindakan (contoh: Perlu grading dan penimbunan batu split pada KM 04)..."
          rows={2}
          className="mt-1 w-full rounded-lg border border-border/70 bg-muted/20 p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Snapshot Gallery & Damage List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-black text-foreground">
            Galeri Snap Kendala ({events.length})
          </h3>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {events.filter((e) => e.isManualSnap).length} Snap Manual •{' '}
            {events.filter((e) => !e.isManualSnap).length} Auto AI
          </span>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-8 text-center text-xs text-muted-foreground">
            Tidak ada kendala jalan yang tertangkap selama trip ini. Jalan dalam kondisi prima!
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev, idx) => {
              const displayUrl = resolveClientUploadUrl(ev.annotatedPhotoUrl || ev.photoUrl)
              const badgeClass =
                ev.hazardType === 'Potholes'
                  ? 'bg-rose-500/15 text-rose-600 border-rose-300'
                  : ev.hazardType === 'Corragation'
                  ? 'bg-amber-500/15 text-amber-600 border-amber-300'
                  : 'bg-yellow-500/15 text-yellow-600 border-yellow-300'

              return (
                <div
                  key={ev.id || idx}
                  className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
                >
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail with click-to-preview & fallback */}
                    <div 
                      onClick={() => setPreviewSnapshot(ev)}
                      className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-slate-900 border border-border/50 cursor-pointer active:scale-95 transition-transform group"
                    >
                      {displayUrl ? (
                        <img
                          src={displayUrl}
                          alt={ev.hazardType}
                          className="size-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.parentElement?.querySelector('.img-fallback')
                            if (fallback) (fallback as HTMLElement).style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className={`img-fallback flex size-full items-center justify-center text-[10px] text-muted-foreground ${displayUrl ? 'hidden' : ''}`}>
                        <Camera className="size-6 text-muted-foreground/40" />
                      </div>
                      {ev.isManualSnap && (
                        <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 text-[9px] font-bold text-white">
                          SNAP
                        </span>
                      )}
                    </div>

                    {/* Metadata Details */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${badgeClass}`}
                          >
                            {ev.hazardType}
                          </span>
                          <span className="text-[11px] font-semibold text-primary">
                            AI {Math.round(ev.confidence * 100)}%
                          </span>
                        </div>

                        {/* Location / Geotag */}
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="size-3 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {ev.latitude && ev.longitude
                              ? `${Number(ev.latitude).toFixed(5)}, ${Number(ev.longitude).toFixed(5)}`
                              : 'Lokasi tidak tersedia'}
                          </span>
                        </div>

                        {/* Speed & Time */}
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground/80">
                          <span>{ev.speedKmh ? `${ev.speedKmh} km/h` : '0 km/h'}</span>
                          <span>•</span>
                          <span>{ev.timestamp}</span>
                        </div>
                      </div>

                      {/* External Map Action */}
                      {ev.latitude && ev.longitude && (
                        <div className="pt-1.5">
                          <a
                            href={`https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            <span>Buka di Google Maps</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes per snapshot */}
                  <div className="border-t border-border/50 bg-muted/20 px-3 py-1.5">
                    <input
                      type="text"
                      placeholder="Catatan kendala (contoh: Pothole diameter 40cm, kedalaman 15cm)..."
                      value={notesState[ev.id] ?? ev.notes ?? ''}
                      onChange={(e) =>
                        setNotesState((prev) => ({ ...prev, [ev.id]: e.target.value }))
                      }
                      className="w-full bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {/* Snapshot Detail Preview Modal */}
        <Dialog open={!!previewSnapshot} onOpenChange={(open) => !open && setPreviewSnapshot(null)}>
          <DialogContent className="max-w-md rounded-2xl bg-slate-950 text-white border border-white/20 p-4 shadow-2xl">
            {previewSnapshot && (
              <>
                <DialogHeader className="pb-2 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span>{previewSnapshot.hazardType.toUpperCase()}</span>
                      <span className="text-xs text-cyan-300 font-mono">
                        AI {Math.round(previewSnapshot.confidence * 100)}%
                      </span>
                    </DialogTitle>
                  </div>
                  <p className="text-xs text-slate-400">
                    {previewSnapshot.timestamp} • {previewSnapshot.isManualSnap ? 'Manual Snap' : 'Auto AI Detection'}
                  </p>
                </DialogHeader>

                <div className="space-y-3 pt-2">
                  <div className="overflow-hidden rounded-xl bg-black border border-white/10 max-h-[300px] flex items-center justify-center">
                    <img
                      src={resolveClientUploadUrl(
                        previewSnapshot.annotatedPhotoUrl || previewSnapshot.photoUrl
                      )}
                      alt="Detail Snapshot"
                      className="size-full object-contain max-h-[300px]"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>

                  {previewSnapshot.latitude && previewSnapshot.longitude && (
                    <div className="flex items-center justify-between rounded-lg bg-white/5 p-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                        <MapPin className="size-3.5 text-emerald-400" />
                        <span>
                          {Number(previewSnapshot.latitude).toFixed(5)},{' '}
                          {Number(previewSnapshot.longitude).toFixed(5)}
                        </span>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${previewSnapshot.latitude},${previewSnapshot.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline"
                      >
                        <span>Google Maps</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  )}

                  {previewSnapshot.notes && (
                    <p className="rounded-lg bg-white/5 p-2 text-xs italic text-slate-300">
                      {previewSnapshot.notes}
                    </p>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

