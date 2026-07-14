'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Clock3, ShieldCheck, Building2, Save } from 'lucide-react'
import { renderToString } from 'react-dom/server'
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
  getRadiusInfo: (record: LiveAttendanceRecord) => { meters: number; label: string }
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
  const markerRef = useRef<any>(null)

  const iconHtml = renderToString(
    <div className="relative flex size-12 items-center justify-center rounded-xl border-[3px] border-white shadow-xl bg-[#0a4f51] hover:scale-105 transition-transform">
      <Building2 className="size-6 text-white" />
    </div>
  )
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
      if (res.success && refresh) {
        refresh()
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
    [],
  )

  return (
    <Marker
      draggable={true}
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
          dashArray: '5, 5'
        }} 
      />
      <Popup className="rounded-xl min-w-[240px]">
        <div className="font-sans">
          <p className="font-bold text-[#0a4f51] text-sm mb-1">{site.name}</p>
          <p className="text-xs text-[#6b8d8d] mb-4">Geser ikon gedung untuk mengubah posisi kordinat Site.</p>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#0a4f51] mb-1 block">Radius Site (Meter)</label>
              <input 
                type="number" 
                value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full rounded-md border border-[#cfe3df] px-2 py-1.5 text-sm"
              />
            </div>
            
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-[#10a77f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0e8a69] disabled:opacity-50"
            >
              <Save className="size-4" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      </Popup>
      <Tooltip direction="top" offset={[0, -26]} opacity={1}>
        <div className="font-sans">
          <p className="font-bold text-[#0a4f51]">Site: {site.name}</p>
          <p className="text-xs text-[#6b8d8d]">Radius: {radius}m (Drag untuk pindah)</p>
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
  getRadiusInfo,
  formatTime,
  sites = [],
  refresh
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
        className="size-full z-0"
        style={{ background: '#dceae6', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="saturate-[0.72]"
        />
        
        <MapController selectedRecord={selectedRecord} />

        {/* Render Sites */}
        {sites.map(site => (
          <SiteMarker key={`site-${site.id}`} site={site} refresh={refresh} />
        ))}

        {/* Render Employees */}
        {records.map((record) => {
          if (!record.latitude || !record.longitude) return null
          
          const lat = Number(record.latitude)
          const lng = Number(record.longitude)
          const active = statusIsLive(record)
          const isSelected = selectedId === record.employeeId
          const radiusMeters = getRadiusInfo(record).meters
          
          // Calculate distance to site if site coords exist
          let distanceToSite = 0
          let isOutOfBounds = false
          if (record.siteGeoLatitude && record.siteGeoLongitude) {
            distanceToSite = Math.round(L.latLng(lat, lng).distanceTo(
              L.latLng(Number(record.siteGeoLatitude), Number(record.siteGeoLongitude))
            ))
            isOutOfBounds = distanceToSite > (record.siteRadiusMeters || 500)
          }

          const markerColor = isOutOfBounds ? 'bg-red-500' : (active ? 'bg-[#10a77f]' : 'bg-[#6f8791]')
          const pingColor = isOutOfBounds ? 'bg-red-400/50' : 'bg-[#25b88f]/50'

          // Create custom SVG icon that looks exactly like the old UI
          const iconHtml = renderToString(
            <div className={`relative flex size-9 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform ${markerColor} ${isSelected ? 'scale-110' : ''}`}>
              <MapPin className="size-4 text-white" />
              {active ? <span className={`absolute inset-0 -z-10 animate-ping rounded-full ${pingColor}`} /> : null}
            </div>
          )

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
                click: () => setSelectedId(record.employeeId)
              }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Circle 
                center={[lat, lng]} 
                radius={radiusMeters} 
                pathOptions={{
                  color: isOutOfBounds ? '#ef4444' : (active ? '#10a77f' : '#6f8791'),
                  fillColor: isOutOfBounds ? '#ef4444' : (active ? '#10a77f' : '#6f8791'),
                  fillOpacity: 0.15,
                  weight: 1
                }} 
              />
              <Popup className="rounded-xl">
                <div className="font-sans min-w-[200px]">
                  <p className="font-bold text-[#0a4f51]">{record.employeeName}</p>
                  <p className="text-xs text-[#6b8d8d] mb-2">{record.siteName}</p>
                  
                  {isOutOfBounds && (
                    <div className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                      ⚠️ Di Luar Radius ({distanceToSite}m dari Site)
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 text-[11px] text-[#557b7b]">
                    <Clock3 className="size-3" /> {formatTime(record.eventTime)}
                  </div>
                  <div className="flex items-start gap-1 text-[11px] text-[#557b7b] mt-1">
                    <ShieldCheck className="size-3 shrink-0 mt-0.5" /> 
                    <span className="line-clamp-2">{record.locationNote || 'Lokasi GPS'}</span>
                  </div>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                <div className="font-sans">
                  <p className="font-bold text-[#0a4f51]">{record.employeeName}</p>
                  <p className="text-xs text-[#6b8d8d]">{record.siteName}</p>
                  {isOutOfBounds && <p className="text-xs font-semibold text-red-500 mt-0.5">Luar Radius ({distanceToSite}m)</p>}
                  <div className="flex items-center gap-1 text-[11px] text-[#557b7b] mt-1">
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

