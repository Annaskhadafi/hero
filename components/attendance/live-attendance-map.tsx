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
} from 'lucide-react'
import { getLiveAttendanceMapData } from '@/app/actions/attendance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

const MAP_ZOOM = 7
const MAP_CENTER = { latitude: -2.5, longitude: 118 }
const MAP_TILE_COLUMNS = 12
const MAP_TILE_ROWS = 10

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

function tileCoordinate(latitude: number, longitude: number, zoom: number) {
  const scale = 2 ** zoom
  const x = ((longitude + 180) / 360) * scale
  const latitudeRadians = (latitude * Math.PI) / 180
  const y =
    ((1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2) * scale

  return { x: x * 256, y: y * 256 }
}

function mapMarkerPosition(latitude: number, longitude: number, zoom: number, mapCenter: MapCenter) {
  const center = tileCoordinate(mapCenter.latitude, mapCenter.longitude, zoom)
  const marker = tileCoordinate(latitude, longitude, zoom)

  return {
    left: marker.x - center.x,
    top: marker.y - center.y,
  }
}

function getRadiusInfo(record: LiveAttendanceRecord) {
  const accuracyMatch = record.locationNote.match(/(\d+)\s*m\s*accuracy/i)
  return {
    meters: accuracyMatch ? Number(accuracyMatch[1]) : record.siteRadiusMeters,
    label: accuracyMatch ? 'Akurasi GPS' : 'Radius validasi site',
  }
}

function getRadiusVisualSize(radiusMeters: number, zoom: number) {
  return Math.min(132, Math.max(20, radiusMeters * 0.045 * 2 ** (zoom - MAP_ZOOM)))
}

function MapTiles({ zoom, pan, mapCenter }: { zoom: number; pan: { x: number; y: number }; mapCenter: MapCenter }) {
  const center = tileCoordinate(mapCenter.latitude, mapCenter.longitude, zoom)
  const centerTileX = Math.floor(center.x / 256)
  const centerTileY = Math.floor(center.y / 256)
  const startX = centerTileX - Math.floor(MAP_TILE_COLUMNS / 2)
  const startY = centerTileY - Math.floor(MAP_TILE_ROWS / 2)
  const maxTile = 2 ** zoom

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#dceae6]">
      {Array.from({ length: MAP_TILE_COLUMNS * MAP_TILE_ROWS }, (_, index) => {
        const column = index % MAP_TILE_COLUMNS
        const row = Math.floor(index / MAP_TILE_COLUMNS)
        const x = ((startX + column) % maxTile + maxTile) % maxTile
        const y = Math.max(0, Math.min(maxTile - 1, startY + row))
        const worldX = (startX + column) * 256
        const worldY = (startY + row) * 256

        return (
          <img
            key={`${x}-${y}`}
            src={`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`}
            alt=""
            className="absolute size-64 max-w-none opacity-90 saturate-[0.72]"
            style={{
              left: `calc(50% + ${worldX - center.x + pan.x}px - 128px)`,
              top: `calc(50% + ${worldY - center.y + pan.y}px - 128px)`,
            }}
            loading="lazy"
          />
        )
      })}
    </div>
  )
}

export function LiveAttendanceMap({ initialData }: Props) {
  const [data, setData] = useState<LiveAttendanceData>(initialData as LiveAttendanceData)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'offline'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [mapZoom, setMapZoom] = useState(MAP_ZOOM)
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 })
  const mapDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const suppressMarkerClickRef = useRef(false)

  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    mapDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: mapPan.x,
      originY: mapPan.y,
    }
  }

  const handleMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = mapDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) suppressMarkerClickRef.current = true
    setMapPan({
      x: drag.originX + deltaX,
      y: drag.originY + deltaY,
    })
  }

  const handleMapPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = mapDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    mapDragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const refresh = async () => {
    setRefreshing(true)
    try {
      setData((await getLiveAttendanceMapData()) as LiveAttendanceData)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), 30000)
    return () => window.clearInterval(interval)
  }, [])

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
  const mapCenter = useMemo<MapCenter>(() => {
    const anchor = latestRecords.find(hasValidCoordinates)
    return anchor
      ? { latitude: Number(anchor.latitude), longitude: Number(anchor.longitude) }
      : MAP_CENTER
  }, [latestRecords])
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
                <span className="inline-flex size-2 rounded-full bg-[#25b88f]" /> Aktif
                <span className="ml-2 inline-flex size-2 rounded-full bg-[#95a9b2]" /> Selesai / offline
              </div>
            </div>
            <div
              className="relative aspect-[1.55] min-h-[420px] cursor-grab select-none overflow-hidden bg-[#dceae6] active:cursor-grabbing"
              onPointerDown={handleMapPointerDown}
              onPointerMove={handleMapPointerMove}
              onPointerUp={handleMapPointerUp}
              onPointerCancel={handleMapPointerUp}
              style={{ touchAction: 'none' }}
            >
              <MapTiles zoom={mapZoom} pan={mapPan} mapCenter={mapCenter} />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,251,249,0.18),transparent_44%,rgba(7,79,81,0.12))]" />
              {visibleRecords.map((record) => {
                const latitude = Number(record.latitude)
                const longitude = Number(record.longitude)
                if (!hasValidCoordinates(record)) return null
                const position = mapMarkerPosition(latitude, longitude, mapZoom, mapCenter)
                const active = statusIsLive(record)
                const selectedMarker = selected?.employeeId === record.employeeId
                const radiusMeters = getRadiusInfo(record).meters
                const radiusSize = getRadiusVisualSize(radiusMeters, mapZoom)
                return (
                  <button
                    key={record.employeeId}
                    type="button"
                    className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 ${selectedMarker ? 'scale-110' : ''}`}
                    style={{
                      left: `calc(50% + ${position.left + mapPan.x}px)`,
                      top: `calc(50% + ${position.top + mapPan.y}px)`,
                    }}
                    onClick={() => {
                      if (suppressMarkerClickRef.current) {
                        suppressMarkerClickRef.current = false
                        return
                      }
                      setSelectedId(record.employeeId)
                    }}
                    aria-label={`Lihat ${record.employeeName} di ${record.siteName}`}
                  >
                    <span
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border ${active ? 'border-[#10a77f]/55 bg-[#10a77f]/18' : 'border-[#6f8791]/50 bg-[#6f8791]/16'}`}
                      style={{ width: radiusSize, height: radiusSize }}
                      title={`${getRadiusInfo(record).label} ${radiusMeters}m`}
                    />
                    <span className={`relative flex size-9 items-center justify-center rounded-full border-2 border-white shadow-lg ${active ? 'bg-[#10a77f]' : 'bg-[#6f8791]'}`}>
                      <MapPin className="size-4 text-white" />
                    </span>
                    {active ? <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25b88f]/40" /> : null}
                  </button>
                )
              })}
              <div className="absolute bottom-3 left-3 rounded-lg border border-white/70 bg-white/85 px-2.5 py-1.5 text-[10px] text-[#4f7474] shadow-sm backdrop-blur-sm">
                © OpenStreetMap contributors
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-2 rounded-lg border border-white/70 bg-white/90 px-2 py-1.5 text-[#4f7474] shadow-sm backdrop-blur-sm">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Indonesia · {mapZoom}Z</span>
                  <span className="text-[10px]">Lingkaran = radius akurasi</span>
                </div>
                <div className="flex overflow-hidden rounded-md border border-[#cfe3df] bg-white">
                  <button type="button" className="size-7 text-base font-semibold hover:bg-[#edf6f3]" onClick={() => { setMapZoom((zoom) => Math.max(1, zoom - 1)); setMapPan({ x: 0, y: 0 }) }} aria-label="Perkecil peta">−</button>
                  <button type="button" className="size-7 border-l border-[#cfe3df] text-base font-semibold hover:bg-[#edf6f3]" onClick={() => { setMapZoom((zoom) => Math.min(8, zoom + 1)); setMapPan({ x: 0, y: 0 }) }} aria-label="Perbesar peta">+</button>
                </div>
              </div>
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
