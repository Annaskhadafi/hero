'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  Activity,
  Clock3,
  Crosshair,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { getLiveAttendanceMapData, getSitesForMap } from '@/app/actions/attendance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const LiveAttendanceLeaflet = dynamic(() => import('./live-attendance-leaflet'), { 
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-[#dceae6]" />
})

type LiveAttendanceRecord = {
  id: number
  employeeId: number
  employeeName: string
  employeeJobTitle: string
  siteId: number
  siteName: string
  siteLocation: string
  siteRadiusMeters: number
  eventType: string
  eventTime: string
  status: string
  locationNote: string
  latitude: string | null
  longitude: string | null
  gpsValid: boolean
}

type LiveAttendanceData =
  | {
      success: true
      scope: 'global' | 'site'
      generatedAt: string
      records: LiveAttendanceRecord[]
    }
  | {
      success: false
      reason: 'forbidden'
      scope: 'own'
      records: []
    }

type Props = {
  initialData: Awaited<ReturnType<typeof getLiveAttendanceMapData>>
}

type MapCenter = { latitude: number; longitude: number }

function formatTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusIsLive(record: LiveAttendanceRecord) {
  return record.eventType === 'checked-in' && record.status !== 'rejected'
}

function hasValidCoordinates(record: LiveAttendanceRecord) {
  const latitude = Number(record.latitude)
  const longitude = Number(record.longitude)
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -11.5 &&
    latitude <= 6.5 &&
    longitude >= 94 &&
    longitude <= 142 &&
    !(latitude === 0 && longitude === 0)
  )
}

function latestByEmployee(records: LiveAttendanceRecord[]) {
  const latest = new Map<number, LiveAttendanceRecord>()
  const latestGps = new Map<number, LiveAttendanceRecord>()
  for (const record of records) {
    if (!latest.has(record.employeeId)) latest.set(record.employeeId, record)
    if (!latestGps.has(record.employeeId) && hasValidCoordinates(record)) {
      latestGps.set(record.employeeId, record)
    }
  }
  return [...latest.values()].map((record) => {
    const gpsRecord = latestGps.get(record.employeeId)
    if (!gpsRecord || hasValidCoordinates(record)) return record

    return {
      ...record,
      latitude: gpsRecord.latitude,
      longitude: gpsRecord.longitude,
      gpsValid: true,
      locationNote: `${record.locationNote || 'Attendance'} · GPS terakhir ${formatDate(gpsRecord.eventTime)}`,
    }
  })
}

function getRadiusInfo(record: LiveAttendanceRecord) {
  const accuracyMatch = record.locationNote.match(/(\d+)\s*m\s*accuracy/i)
  return {
    meters: accuracyMatch ? Number(accuracyMatch[1]) : record.siteRadiusMeters,
    label: accuracyMatch ? 'Akurasi GPS' : 'Radius validasi site',
  }
}

export function LiveAttendanceMap({ initialData }: Props) {
  const [data, setData] = useState<LiveAttendanceData>(initialData as LiveAttendanceData)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'offline'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [targetDate, setTargetDate] = useState<Date>(new Date())
  const [allSites, setAllSites] = useState<any[]>([])
  const [manualSites, setManualSites] = useState<any[]>([])

  const refresh = async (date: Date = targetDate) => {
    setRefreshing(true)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      setData((await getLiveAttendanceMapData(dateStr)) as LiveAttendanceData)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isSameDay(targetDate, new Date())) return
    const interval = window.setInterval(() => void refresh(targetDate), 30000)
    return () => window.clearInterval(interval)
  }, [targetDate])

  const handlePrevDay = () => {
    const prev = subDays(targetDate, 1)
    setTargetDate(prev)
    refresh(prev)
  }

  const handleNextDay = () => {
    if (isSameDay(targetDate, new Date())) return
    const next = addDays(targetDate, 1)
    setTargetDate(next)
    refresh(next)
  }

  const loadAllSites = async (isOpen: boolean) => {
    if (isOpen && allSites.length === 0) {
      const res = await getSitesForMap()
      if (res.success) setAllSites(res.sites)
    }
  }

  const handleAddManualSite = (siteIdStr: string) => {
    const siteId = Number(siteIdStr)
    const existingMapSites = data.success && (data as any).sites ? (data as any).sites : []
    
    if (manualSites.some(s => s.id === siteId) || existingMapSites.some((s: any) => s.id === siteId)) {
      return // Already on map
    }
    
    const site = allSites.find(s => s.id === siteId)
    if (site) {
      setManualSites(prev => [...prev, {
        id: site.id,
        name: site.name,
        latitude: Number(site.geoLatitude) || -2.5,
        longitude: Number(site.geoLongitude) || 118,
        radiusMeters: site.geoRadiusMeters || 500,
      }])
    }
  }

  const mergedSites = useMemo(() => {
    const mapSites = data.success && (data as any).sites ? (data as any).sites : []
    const combined = [...mapSites]
    manualSites.forEach(ms => {
      if (!combined.some(cs => cs.id === ms.id)) {
        combined.push(ms)
      }
    })
    return combined
  }, [data, manualSites])

  const records = data.success ? data.records : []
  const latestRecords = useMemo(() => latestByEmployee(records), [records])
  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return latestRecords.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        `${record.employeeName} ${record.siteName} ${record.employeeJobTitle}`
          .toLowerCase()
          .includes(normalizedQuery)
      const isLive = statusIsLive(record)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'live' ? isLive : !isLive)
      return matchesQuery && matchesStatus
    })
  }, [latestRecords, query, statusFilter])
  const selected = visibleRecords.find((record) => record.employeeId === selectedId) ?? visibleRecords[0]
  const liveCount = latestRecords.filter(statusIsLive).length
  const locationsCount = latestRecords.filter(hasValidCoordinates).length
  const scopeLabel = data.success && data.scope === 'global' ? 'Semua site' : 'Site Anda'

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <section className="overflow-hidden rounded-[1.25rem] border border-[#cfe3df] bg-[#f5fbf9]">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between lg:p-7">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#16736d]">
              <span className="inline-flex size-2 rounded-full bg-[#25b88f] shadow-[0_0_0_5px_rgba(37,184,143,0.14)]" />
              Live Operations
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0a4f51] lg:text-4xl">
              Live Map Attendance
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#557b7b]">
              Pantau aktivitas attendance berbasis GPS dari user yang sedang bekerja di site.
              Data diperbarui otomatis setiap 30 detik.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge className="h-9 rounded-full border border-[#b7e3d4] bg-[#e8faf3] px-3 text-[#0e7b66]">
                <Wifi className="mr-1.5 size-3.5" /> Live {scopeLabel}
              </Badge>
              <Button
                variant="outline"
                className="h-9 rounded-full border-[#cfe3df] bg-white text-[#0a4f51]"
                onClick={() => void refresh()}
                disabled={refreshing}
              >
                <RefreshCw className={refreshing ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
                Refresh
              </Button>
            </div>
            
            <div className="flex items-center gap-1 rounded-full border border-[#cfe3df] bg-white p-1 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full hover:bg-[#edf6f3] text-[#0a4f51]"
                onClick={handlePrevDay}
                disabled={refreshing}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 text-sm font-semibold text-[#0a4f51]">
                <Calendar className="size-4 text-[#6b8d8d]" />
                <span className="min-w-[120px] text-center">
                  {isSameDay(targetDate, new Date()) 
                    ? 'Hari Ini' 
                    : format(targetDate, 'dd MMM yyyy', { locale: id })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full hover:bg-[#edf6f3] text-[#0a4f51]"
                onClick={handleNextDay}
                disabled={refreshing || isSameDay(targetDate, new Date())}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="grid border-t border-[#d8ebe7] sm:grid-cols-3">
          {[
            { label: 'Aktif sekarang', value: liveCount, icon: Activity, tone: 'text-[#087f63]' },
            { label: 'User terpantau', value: latestRecords.length, icon: Users, tone: 'text-[#2563a6]' },
            { label: 'Lokasi GPS', value: locationsCount, icon: MapPin, tone: 'text-[#c57916]' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 border-[#d8ebe7] px-5 py-4 sm:border-r last:border-r-0">
              <item.icon className={`size-5 ${item.tone}`} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b8d8d]">{item.label}</p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-[#0a4f51]">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!data.success ? (
        <section className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-8 text-center">
          <ShieldCheck className="mx-auto size-8 text-amber-700" />
          <h2 className="mt-3 text-lg font-semibold text-amber-950">Akses Live Map belum tersedia</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-amber-800">
            Hubungi administrator untuk mengaktifkan permission Live Map Attendance.
          </p>
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.8fr)]">
          <div className="overflow-hidden rounded-[1.25rem] border border-[#cfe3df] bg-white shadow-[0_16px_40px_rgba(20,84,82,0.08)]">
            <div className="flex flex-col gap-3 border-b border-[#d8ebe7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0a4f51]">Peta Indonesia</p>
                <p className="mt-0.5 text-xs text-[#6b8d8d]">Marker menunjukkan aktivitas terbaru setiap user.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6b8d8d]">
                <Select onOpenChange={loadAllSites} onValueChange={handleAddManualSite}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Tambah Marka Site..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allSites.length === 0 ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">Memuat site...</div>
                    ) : (
                      allSites.map(site => (
                        <SelectItem key={site.id} value={site.id.toString()}>
                          {site.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                <span className="ml-2 inline-flex size-2 rounded-full bg-[#25b88f]" /> Aktif
                <span className="ml-2 inline-flex size-2 rounded-full bg-[#95a9b2]" /> Selesai / offline
              </div>
            </div>
            <div className="relative aspect-[1.55] min-h-[420px] overflow-hidden bg-[#dceae6]">
              <LiveAttendanceLeaflet
                records={visibleRecords}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                statusIsLive={statusIsLive}
                getRadiusInfo={getRadiusInfo}
                formatTime={formatTime}
                sites={mergedSites}
                refresh={refresh}
              />
              <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(135deg,rgba(245,251,249,0.18),transparent_44%,rgba(7,79,81,0.12))]" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.25rem] border border-[#cfe3df] bg-white p-4 shadow-[0_16px_40px_rgba(20,84,82,0.06)]">
              <div className="flex items-center gap-2 rounded-lg border border-[#d8ebe7] bg-[#f7fbfa] px-3">
                <Search className="size-4 text-[#6b8d8d]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari user atau site"
                  className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-[#edf6f3] p-1">
                {[
                  ['all', 'Semua'],
                  ['live', 'Aktif'],
                  ['offline', 'Selesai'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-md px-2 py-2 text-xs font-semibold transition ${statusFilter === value ? 'bg-white text-[#0a4f51] shadow-sm' : 'text-[#6b8d8d] hover:text-[#0a4f51]'}`}
                    onClick={() => setStatusFilter(value as typeof statusFilter)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-[#cfe3df] bg-white p-4 shadow-[0_16px_40px_rgba(20,84,82,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0a4f51]">Aktivitas terbaru</p>
                  <p className="mt-0.5 text-xs text-[#6b8d8d]">{visibleRecords.length} user dalam tampilan</p>
                </div>
                <Crosshair className="size-5 text-[#10a77f]" />
              </div>
              <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
                {visibleRecords.length === 0 ? (
                  <div className="rounded-lg bg-[#f7fbfa] p-5 text-center text-sm text-[#6b8d8d]">Belum ada aktivitas GPS.</div>
                ) : (
                  visibleRecords.map((record) => {
                    const active = statusIsLive(record)
                    const isSelected = selected?.employeeId === record.employeeId
                    return (
                      <button
                        key={record.employeeId}
                        type="button"
                        className={`w-full rounded-xl border p-3 text-left transition ${isSelected ? 'border-[#7bcdb2] bg-[#effbf6]' : 'border-[#e2efec] bg-white hover:bg-[#f7fbfa]'}`}
                        onClick={() => setSelectedId(record.employeeId)}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-1 size-2.5 shrink-0 rounded-full ${active ? 'bg-[#10a77f]' : 'bg-[#95a9b2]'}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[#0a4f51]">{record.employeeName}</span>
                            <span className="mt-0.5 block truncate text-xs text-[#6b8d8d]">{record.siteName} · {record.employeeJobTitle || 'Employee'}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#6b8d8d]">
                            <Clock3 className="size-3.5" /> {formatTime(record.eventTime)}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {selected ? (
              <div className="rounded-[1.25rem] border border-[#b7e3d4] bg-[#eaf9f3] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#19846d]">Detail marker</p>
                    <p className="mt-1 text-base font-semibold text-[#0a4f51]">{selected.employeeName}</p>
                    <p className="text-xs text-[#557b7b]">{selected.employeeJobTitle || 'Employee'} · {selected.siteName}</p>
                  </div>
                  <Badge className={statusIsLive(selected) ? 'bg-[#10a77f] text-white' : 'bg-[#dbe6e8] text-[#557078]'}>
                    {statusIsLive(selected) ? 'Aktif' : 'Selesai'}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-white/70 p-3"><span className="block text-[#6b8d8d]">Event terakhir</span><strong className="mt-1 block text-[#0a4f51]">{formatDate(selected.eventTime)}</strong></div>
                  <div className="rounded-lg bg-white/70 p-3"><span className="block text-[#6b8d8d]">{getRadiusInfo(selected).label}</span><strong className="mt-1 block text-[#0a4f51]">{getRadiusInfo(selected).meters} m</strong></div>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#557b7b]"><MapPin className="mt-0.5 size-3.5 shrink-0 text-[#10a77f]" />{hasValidCoordinates(selected) ? `${selected.latitude}, ${selected.longitude}` : 'Koordinat GPS belum valid'}</p>
                <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-[#557b7b]"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#10a77f]" />{selected.locationNote || selected.siteLocation || 'Lokasi attendance tersimpan.'}</p>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  )
}
