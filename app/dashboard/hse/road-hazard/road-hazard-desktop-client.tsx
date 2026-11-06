'use client'

import { useState } from 'react'
import {
  Video,
  ShieldAlert,
  AlertTriangle,
  FileSpreadsheet,
  FileDown,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  Car,
  QrCode,
  Smartphone,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import {
  HeroDataTable,
  HeroKpiCard,
  HeroStatusBadge,
  HeroDetailModal,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { resolveClientUploadUrl } from '@/lib/client-upload-url'

export interface RoadHazardSessionRow {
  id: number
  sessionCode: string
  siteId: number | null
  siteName: string
  customerName: string
  inspectorName: string
  roadSection: string
  startTime: string
  endTime: string | null
  durationSeconds: number
  totalDistanceMeters: number
  totalHazards: number
  potholesCount: number
  corrugationCount: number
  rutsCount: number
  severityLevel: string
  status: string
  summaryNotes: string
}

interface RoadHazardDesktopClientProps {
  sessions: RoadHazardSessionRow[]
  canEdit: boolean
  canDelete: boolean
}

export function RoadHazardDesktopClient({
  sessions,
  canEdit,
  canDelete,
}: RoadHazardDesktopClientProps) {
  const [selectedSession, setSelectedSession] = useState<RoadHazardSessionRow | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // KPI Calculations
  const totalSessions = sessions.length
  const totalPotholes = sessions.reduce((acc, s) => acc + (s.potholesCount || 0), 0)
  const totalCorrugation = sessions.reduce((acc, s) => acc + (s.corrugationCount || 0), 0)
  const totalRuts = sessions.reduce((acc, s) => acc + (s.rutsCount || 0), 0)

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}m ${rem}s`
  }

  const columns: ColumnDef<RoadHazardSessionRow>[] = [
    {
      accessorKey: 'sessionCode',
      header: 'Kode Sesi',
      cell: ({ row }) => (
        <div className="font-mono text-xs font-bold text-foreground">
          {row.original.sessionCode}
        </div>
      ),
    },
    {
      accessorKey: 'siteName',
      header: 'Site Operasional',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-xs text-foreground">{row.original.siteName || '-'}</div>
          <div className="text-[11px] text-muted-foreground">{row.original.customerName || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'roadSection',
      header: 'Segmen Jalur',
      cell: ({ row }) => (
        <div className="text-xs font-medium text-foreground max-w-[180px] truncate">
          {row.original.roadSection || 'Hauling Road'}
        </div>
      ),
    },
    {
      accessorKey: 'inspectorName',
      header: 'Petugas / Driver',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">
          {row.original.inspectorName || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'durationSeconds',
      header: 'Durasi & Jarak',
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-semibold text-foreground">{formatDuration(row.original.durationSeconds)}</div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {((row.original.totalDistanceMeters || 0) / 1000).toFixed(2)} km
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'totalHazards',
      header: 'Temuan Bahaya',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-500/20">
            {row.original.potholesCount} Lubang
          </span>
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20">
            {row.original.corrugationCount} Keriting
          </span>
          <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-600 border border-cyan-500/20">
            {row.original.rutsCount} Alur
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'severityLevel',
      header: 'Tingkat Bahaya',
      cell: ({ row }) => {
        const sev = row.original.severityLevel || 'LOW'
        const statusMap: Record<string, 'success' | 'warning' | 'destructive' | 'neutral'> = {
          LOW: 'success',
          MEDIUM: 'warning',
          HIGH: 'destructive',
          CRITICAL: 'destructive',
        }
        return (
          <HeroStatusBadge
            status={statusMap[sev] || 'neutral'}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroKpiCard
          title="Total Sesi Inspeksi"
          value={totalSessions}
          description="Sesi perekaman trip jalan hauling"
          icon={<Video className="size-5" />}
          tone="blue"
        />
        <HeroKpiCard
          title="Lubang Terdeteksi"
          value={totalPotholes}
          description="Potholes berisiko merusak ban"
          icon={<AlertTriangle className="size-5" />}
          tone="rose"
        />
        <HeroKpiCard
          title="Jalan Keriting"
          value={totalCorrugation}
          description="Corrugation mengurangi traksi"
          icon={<ShieldAlert className="size-5" />}
          tone="amber"
        />
        <HeroKpiCard
          title="Alur Ambles (Ruts)"
          value={totalRuts}
          description="Ruts potensi slip unit muatan"
          icon={<Car className="size-5" />}
          tone="cyan"
        />
      </div>

      {/* Mobile Unit Dashcam Launcher Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/30 p-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            <Smartphone className="size-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Aplikasi Dashcam Unit Mobile (Perekaman Lapangan)
            </h3>
            <p className="text-xs text-muted-foreground">
              Gunakan perangkat smartphone / tablet di kabin unit hauling untuk live detection AI, OpenStreetMap, dan auto-snap rute jalan.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            className="h-9 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow"
          >
            <a href="/mobile/hse/road-hazard" target="_blank" rel="noopener noreferrer">
              <span>Buka Mobile Dashcam</span>
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {/* Sessions Data Table */}
      <HeroDataTable
        data={sessions}
        columns={columns}
        searchPlaceholder="Cari kode sesi, site, jalur..."
        onRowClick={(row: RoadHazardSessionRow) => {
          setSelectedSession(row)
          setDetailModalOpen(true)
        }}
        rowActions={[
          {
            label: 'Lihat Detail Sesi',
            icon: Eye,
            onClick: (row: RoadHazardSessionRow) => {
              setSelectedSession(row)
              setDetailModalOpen(true)
            },
          },
        ]}
      />

      {/* Detail Modal */}
      {selectedSession && (
        <HeroDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          title={`Detail Sesi: ${selectedSession.sessionCode}`}
          statusBadge={<HeroStatusBadge status={selectedSession.severityLevel === 'CRITICAL' || selectedSession.severityLevel === 'HIGH' ? 'destructive' : 'success'} />}
          subtitle={`Inspeksi jalur ${selectedSession.roadSection} di ${selectedSession.siteName}`}
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/70 p-3 bg-muted/20">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Petugas</p>
                <p className="font-semibold text-foreground">{selectedSession.inspectorName || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Waktu Mulai</p>
                <p className="font-semibold text-foreground">{new Date(selectedSession.startTime).toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Durasi Rekam</p>
                <p className="font-semibold text-foreground">{formatDuration(selectedSession.durationSeconds)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Estimasi Jarak</p>
                <p className="font-semibold text-foreground">{((selectedSession.totalDistanceMeters || 0) / 1000).toFixed(2)} km</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-foreground">Rekapitulasi Kerusakan Jalan:</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-center">
                  <p className="text-lg font-black text-rose-600">{selectedSession.potholesCount}</p>
                  <p className="text-[10px] font-bold text-rose-700">Lubang (Potholes)</p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-center">
                  <p className="text-lg font-black text-amber-600">{selectedSession.corrugationCount}</p>
                  <p className="text-[10px] font-bold text-amber-700">Keriting Jalan</p>
                </div>
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-center">
                  <p className="text-lg font-black text-cyan-600">{selectedSession.rutsCount}</p>
                  <p className="text-[10px] font-bold text-cyan-700">Alur Ambles (Ruts)</p>
                </div>
              </div>
            </div>

            {selectedSession.summaryNotes && (
              <div className="rounded-lg border border-border/70 p-3 bg-muted/20">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Catatan Petugas:</p>
                <p className="mt-1 text-xs text-foreground whitespace-pre-wrap">{selectedSession.summaryNotes}</p>
              </div>
            )}
          </div>
        </HeroDetailModal>
      )}
    </div>
  )
}
