'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Clock3, ShieldCheck, Save, LockKeyhole, Pencil } from 'lucide-react'
import { updateSiteRadiusFromMap } from '@/app/actions/attendance'

// Setup default icon to fix missing icon issue in nextjs/leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type LiveAttendanceRecord = any
type Site = any

type Props = {
  records: LiveAttendanceRecord[]
  selectedId: number | null
  setSelectedId: (id: number) => void
  statusIsLive: (record: LiveAttendanceRecord) => boolean
  formatTime: (time: string) => string
  sites?: Site[]
  refresh?: () => void
}

function MapController({ selectedRecord }: { selectedRecord: LiveAttendanceRecord | undefined }) {
  const map = useMap()

  useEffect(() => {
    if (selectedRecord && selectedRecord.latitude && selectedRecord.longitude) {
      map.flyTo(
        [Number(selectedRecord.latitude), Number(selectedRecord.longitude)],
        16, // Zoom closer to the specific marker
        { duration: 1.5 }
      )
    }
  }, [selectedRecord, map])

  return null
}

function SiteMarker({ site, refresh }: { site: Site; refresh?: () => void }) {
  const [position, setPosition] = useState([site.latitude, site.longitude] as [number, number])
  const [radius, setRadius] = useState(site.radiusMeters)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const markerRef = useRef<any>(null)

  const iconHtml = `<div style="position:relative;display:flex;width:48px;height:48px;align-items:center;justify-content:center;border-radius:12px;border:3px solid white;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);background-color:#0a4f51;transition:transform 0.15s"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg></div>`
  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'bg-transparent border-0',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateSiteRadiusFromMap(site.id, radius, position[0], position[1])
      if (res.success) {
        setEditing(false)
        refresh?.()
      } else if (!res.success) {
        alert(res.error)
      }
    } finally {
      setSaving(false)
    }
  }

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          const latLng = marker.getLatLng()
          setPosition([latLng.lat, latLng.lng])
        }
      },
    }),
    []
  )

  return (
    <Marker
      draggable={editing}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
      zIndexOffset={-100} // Taruh di bawah user
    >
      <Circle
        center={position}
        radius={radius}
        pathOptions={{
          color: '#0a4f51',
          fillColor: '#0a4f51',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5',
        }}
      />
      <Popup className="min-w-[240px] rounded-xl">
        <div className="font-sans">
          <p className="mb-1 text-sm font-bold text-[#0a4f51]">{site.name}</p>
          <p className="mb-4 text-xs text-[#6b8d8d]">
            {editing ? 'Mode edit aktif. Geser ikon gedung, lalu simpan.' : 'Lokasi Site terkunci.'}
          </p>

          <div className="space-y-3">
            <div className={editing ? '' : 'pointer-events-none opacity-60'}>
              <label className="mb-1 block text-xs font-semibold text-[#0a4f51]">
                Radius Site (Meter)
              </label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full rounded-md border border-[#cfe3df] px-2 py-1.5 text-sm"
              />
            </div>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0a4f51] px-3 py-2 text-sm font-semibold text-white hover:bg-[#083c3e]"
              >
                <Pencil className="size-4" />
                Edit Lokasi & Radius
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPosition([site.latitude, site.longitude])
                    setRadius(site.radiusMeters)
                    setEditing(false)
                  }}
                  disabled={saving}
                  className="flex-1 rounded-md border border-[#cfe3df] bg-white px-3 py-2 text-sm font-semibold text-[#0a4f51] hover:bg-[#f2faf7] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#10a77f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0e8a69] disabled:opacity-50"
                >
                  <Save className="size-4" />
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            )}
          </div>
        </div>
      </Popup>
      <Tooltip direction="top" offset={[0, -26]} opacity={1}>
        <div className="font-sans">
          <p className="font-bold text-[#0a4f51]">Site: {site.name}</p>
          <p className="text-xs text-[#6b8d8d]">
            <LockKeyhole className="mr-1 inline size-3" /> Radius: {radius}m ·{' '}
            {editing ? 'Edit aktif' : 'Terkunci'}
          </p>
        </div>
      </Tooltip>
    </Marker>
  )
}

export default function LiveAttendanceLeaflet({
  records,
  selectedId,
  setSelectedId,
  statusIsLive,
  formatTime,
  sites = [],
  refresh,
}: Props) {
  const [mapReady, setMapReady] = useState(false)
  const mapCenterRef = useRef<[number, number]>([-2.5, 118])

  // Center map on the first valid record on mount if no selected id
  useEffect(() => {
    if (!selectedId && records.length > 0) {
      const firstValid = records.find((r: any) => r.latitude && r.longitude)
      if (firstValid) {
        mapCenterRef.current = [Number(firstValid.latitude), Number(firstValid.longitude)]
      }
    }
    setMapReady(true)
  }, [records, selectedId])

  const selectedRecord = records.find((r: any) => r.employeeId === selectedId)

  if (!mapReady) return <div className="size-full animate-pulse bg-[#dceae6]" />

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={mapCenterRef.current}
        zoom={selectedRecord ? 16 : 5}
        className="z-0 size-full"
        style={{ background: '#dceae6', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="saturate-[0.72]"
        />

        <MapController selectedRecord={selectedRecord} />

        {/* Render Sites */}
        {sites.map((site) => (
          <SiteMarker key={`site-${site.id}`} site={site} refresh={refresh} />
        ))}

        {/* Render Employees */}
        {records.map((record) => {
          if (!record.latitude || !record.longitude) return null

          const lat = Number(record.latitude)
          const lng = Number(record.longitude)
          const active = statusIsLive(record)
          const isSelected = selectedId === record.employeeId
          // Calculate distance to site if site coords exist
          let distanceToSite = 0
          let isOutOfBounds = false
          const hasSitePosition = Boolean(record.siteGeoLatitude && record.siteGeoLongitude)
          if (hasSitePosition) {
            distanceToSite = Math.round(
              L.latLng(lat, lng).distanceTo(
                L.latLng(Number(record.siteGeoLatitude), Number(record.siteGeoLongitude))
              )
            )
            isOutOfBounds = distanceToSite > (record.siteRadiusMeters || 500)
          }
          const isNearBoundary =
            hasSitePosition &&
            !isOutOfBounds &&
            distanceToSite >= (record.siteRadiusMeters || 500) * 0.8
          const locationStatus = !hasSitePosition
            ? 'GPS Site belum dikonfigurasi'
            : isOutOfBounds
              ? `Di Luar Radius (${distanceToSite}m)`
              : isNearBoundary
                ? `Dekat Batas (${distanceToSite}m)`
                : `Dalam Radius (${distanceToSite}m)`

          const markerBg = isOutOfBounds
            ? '#ef4444'
            : isNearBoundary
              ? '#f59e0b'
              : active
                ? '#10a77f'
                : '#6f8791'

          // Create custom SVG icon that looks exactly like the old UI
          const pingEl = active
            ? `<span style="position:absolute;inset:0;z-index:-1;border-radius:9999px;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;background-color:${isOutOfBounds ? 'rgba(239,68,68,0.5)' : isNearBoundary ? 'rgba(245,158,11,0.5)' : 'rgba(37,184,143,0.5)'}"></span>`
            : ''
          const markerHtml = `<div style="position:relative;display:flex;width:36px;height:36px;align-items:center;justify-content:center;border-radius:9999px;border:2px solid white;background-color:${markerBg};box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);${isSelected ? 'transform:scale(1.1)' : ''}">${pingEl}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`
          const iconHtml = markerHtml

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'bg-transparent border-0', // Remove default styles
            iconSize: [36, 36],
            iconAnchor: [18, 18], // Center of the 36x36 icon
            popupAnchor: [0, -18],
          })

          return (
            <Marker
              key={record.employeeId}
              position={[lat, lng]}
              icon={customIcon}
              eventHandlers={{
                click: () => setSelectedId(record.employeeId),
              }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup className="rounded-xl">
                <div className="min-w-[200px] font-sans">
                  <p className="font-bold text-[#0a4f51]">{record.employeeName}</p>
                  <p className="mb-2 text-xs text-[#6b8d8d]">{record.siteName}</p>

                  <div
                    className={`mb-2 rounded border px-2 py-1 text-xs font-semibold ${isOutOfBounds ? 'border-red-200 bg-red-50 text-red-600' : isNearBoundary ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                  >
                    {isOutOfBounds ? '⚠️' : isNearBoundary ? '⚠️' : '✓'} {locationStatus}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-[#557b7b]">
                    <Clock3 className="size-3" /> {formatTime(record.eventTime)}
                  </div>
                  <div className="mt-1 flex items-start gap-1 text-[11px] text-[#557b7b]">
                    <ShieldCheck className="mt-0.5 size-3 shrink-0" />
                    <span className="line-clamp-2">{record.locationNote || 'Lokasi GPS'}</span>
                  </div>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                <div className="font-sans">
                  <p className="font-bold text-[#0a4f51]">{record.employeeName}</p>
                  <p className="text-xs text-[#6b8d8d]">{record.siteName}</p>
                  <p
                    className={`mt-0.5 text-xs font-semibold ${isOutOfBounds ? 'text-red-500' : isNearBoundary ? 'text-amber-600' : 'text-emerald-600'}`}
                  >
                    {locationStatus}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-[#557b7b]">
                    <Clock3 className="size-3" /> {formatTime(record.eventTime)}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
