'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  ExternalLink,
  Map,
  MapPin,
  Mountain,
  Satellite,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Setup default Leaflet marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Fallback koordinat untuk site di seluruh Indonesia
export const SITE_COORDINATES_FALLBACK: Record<string, { lat: number; lng: number }> = {
  'Balikpapan': { lat: -1.2379, lng: 116.8529 },
  'Balikpapan External': { lat: -1.2100, lng: 116.8900 },
  'CK MHU': { lat: -0.6746, lng: 116.8743 },
  'CK KIM': { lat: -1.4113, lng: 101.7124 },
  'AMM Mifa Hauling': { lat: 4.2116, lng: 96.2463 },
  'CK MIFA': { lat: 4.1800, lng: 96.1800 },
  'CK NCN': { lat: 4.1500, lng: 96.1600 },
  'CK BIB': { lat: -3.6128, lng: 115.6022 },
  'PPA BIB': { lat: -3.6200, lng: 115.6100 },
  'Sebamban': { lat: -3.6000, lng: 115.6300 },
  'CK BMB': { lat: -3.0033, lng: 115.1583 },
  'Tj. Adaro': { lat: -2.1812, lng: 115.5186 },
  'BUMA Tanjung': { lat: -2.1900, lng: 115.5300 },
  'Sangatta KABO': { lat: 0.4930, lng: 117.5890 },
  'Sangatta KPC': { lat: 0.5200, lng: 117.5500 },
  'Vale - Sorowako': { lat: -2.5323, lng: 121.3533 },
  'Makassar': { lat: -5.1477, lng: 119.4327 },
  'Jakarta': { lat: -6.2088, lng: 106.8456 },
  'Palembang': { lat: -2.9761, lng: 104.7754 },
  'Pekanbaru': { lat: 0.5071, lng: 101.4478 },
  'PKA Musi Rawas': { lat: -3.2000, lng: 103.0500 },
  'CDE - Bengkulu': { lat: -3.4500, lng: 102.5200 },
  'PPA TJ-Enim': { lat: -3.7380, lng: 103.7840 },
  'MTN - ME': { lat: -3.7100, lng: 103.7500 },
  'PT SMJ - Berau': { lat: 2.1550, lng: 117.4950 },
  'Tj. Redeb - Berau': { lat: 2.1600, lng: 117.4800 },
  'MTN - Berau': { lat: 2.1400, lng: 117.5100 },
  'Madhani Talatah - ME': { lat: 2.1300, lng: 117.4700 },
  'Petrosea SDA': { lat: -3.3500, lng: 127.1000 },
  'BSI - Banyuwangi': { lat: -8.6250, lng: 114.0500 },
  'TU Gresik': { lat: -7.1566, lng: 112.6555 },
  'TU Batu Hijau': { lat: -8.9667, lng: 116.8667 },
  'KPUC - Malinau': { lat: 3.5833, lng: 116.6333 },
  'AMM Tabang': { lat: 0.5500, lng: 115.9800 },
}

export type SiteMapData = {
  id: number
  name: string
  location?: string | null
  geoLatitude?: string | null
  geoLongitude?: string | null
  totalManpower?: number
  manpowerService?: number
  manpowerRepair?: number
  totalIncidents?: number
  summary?: {
    nearmiss: number
    propertyDamage: number
    firstAid: number
    medicalTreatment: number
    environmental: number
    majorInjury: number
    fatality: number
    safetyManHours: number | string
    totalManpower: number
    manpowerService?: number
    manpowerRepair?: number
    totalIncidents?: number
    sickEmployeesCount: number
    lostDaysCount: number
    sickLettersCount: number
    occupationalDiseasesCount: number
    incidentNotes?: string
  } | null
}

function createCustomIcon(status: 'zero' | 'warning' | 'danger', siteName: string) {
  const bgClass =
    status === 'danger'
      ? 'bg-rose-500 text-white shadow-rose-500/50'
      : status === 'warning'
      ? 'bg-amber-500 text-white shadow-amber-500/50'
      : 'bg-emerald-600 text-white shadow-emerald-500/50'

  const borderClass =
    status === 'danger'
      ? 'border-rose-200 ring-rose-400'
      : status === 'warning'
      ? 'border-amber-200 ring-amber-400'
      : 'border-emerald-200 ring-emerald-400'

  const pulseHtml =
    status === 'danger'
      ? '<span class="absolute -inset-1 animate-ping rounded-full bg-rose-400 opacity-75"></span>'
      : status === 'warning'
      ? '<span class="absolute -inset-1 animate-ping rounded-full bg-amber-400 opacity-50"></span>'
      : ''

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group">
      ${pulseHtml}
      <div class="relative flex size-8 items-center justify-center rounded-full ${bgClass} ${borderClass} border-2 shadow-lg ring-2 ring-offset-1 transition-all duration-300 group-hover:scale-125">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${
            status === 'zero'
              ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'
              : status === 'warning'
              ? '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
              : '<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
          }
        </svg>
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-site-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const t1 = setTimeout(() => map.invalidateSize(), 200)
    const t2 = setTimeout(() => map.invalidateSize(), 600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map])
  return null
}

function MapBoundsController({ sites }: { sites: SiteMapData[] }) {
  const map = useMap()

  useEffect(() => {
    if (!sites.length) return
    const points: [number, number][] = []

    for (const site of sites) {
      let lat = parseFloat(site.geoLatitude || '')
      let lng = parseFloat(site.geoLongitude || '')

      if (Number.isNaN(lat) || Number.isNaN(lng) || !lat || !lng) {
        const fb = SITE_COORDINATES_FALLBACK[site.name]
        if (fb) {
          lat = fb.lat
          lng = fb.lng
        }
      }

      if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat && lng) {
        points.push([lat, lng])
      }
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 })
    }
  }, [sites, map])

  return null
}

export function SiteSafetyMapInner({
  sites,
  selectedMonthLabel,
  onOpenSiteDetail,
  onOpenManageCoordinates,
}: {
  sites: SiteMapData[]
  selectedMonthLabel: string
  onOpenSiteDetail: (site: SiteMapData) => void
  onOpenManageCoordinates?: () => void
}) {
  const indonesiaCenter: [number, number] = [-1.5, 117.5]
  const [mapLayer, setMapLayer] = useState<'osm' | 'satelit' | 'topo'>('osm')

  // Filter sites that have valid coordinates (or fallback)
  const mappedSites = useMemo(() => {
    return sites.map((s) => {
      let lat = parseFloat(s.geoLatitude || '')
      let lng = parseFloat(s.geoLongitude || '')

      if (Number.isNaN(lat) || Number.isNaN(lng) || !lat || !lng) {
        const fb = SITE_COORDINATES_FALLBACK[s.name]
        if (fb) {
          lat = fb.lat
          lng = fb.lng
        }
      }

      return {
        ...s,
        resolvedLat: lat,
        resolvedLng: lng,
        hasCoords: !Number.isNaN(lat) && !Number.isNaN(lng) && Boolean(lat) && Boolean(lng),
      }
    })
  }, [sites])

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-border/80 bg-slate-100 shadow-md">
      <MapContainer
        center={indonesiaCenter}
        zoom={5}
        scrollWheelZoom={true}
        className="size-full z-0"
        style={{ minHeight: '100%', width: '100%' }}
      >
        {mapLayer === 'osm' && (
          <TileLayer
            key="osm"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}
        {mapLayer === 'satelit' && (
          <TileLayer
            key="satelit"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        )}
        {mapLayer === 'topo' && (
          <TileLayer
            key="topo"
            attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            maxZoom={17}
          />
        )}

        <MapResizer />
        <MapBoundsController sites={sites} />

        {mappedSites
          .filter((s) => s.hasCoords)
          .map((site) => {
            const sum = site.summary
            const totalMp = site.totalManpower ?? sum?.totalManpower ?? 0
            const serviceMp = site.manpowerService ?? sum?.manpowerService ?? 0
            const repairMp = site.manpowerRepair ?? sum?.manpowerRepair ?? 0
            const totalIncidentsVal =
              site.totalIncidents ??
              sum?.totalIncidents ??
              ((sum?.fatality ?? 0) +
                (sum?.majorInjury ?? 0) +
                (sum?.propertyDamage ?? 0) +
                (sum?.nearmiss ?? 0) +
                (sum?.environmental ?? 0) +
                (sum?.firstAid ?? 0) +
                (sum?.medicalTreatment ?? 0))

            const hasSevere = (sum?.fatality ?? 0) > 0 || (sum?.majorInjury ?? 0) > 0
            const hasMinor =
              (sum?.nearmiss ?? 0) > 0 ||
              (sum?.propertyDamage ?? 0) > 0 ||
              (sum?.firstAid ?? 0) > 0 ||
              (sum?.medicalTreatment ?? 0) > 0 ||
              (sum?.environmental ?? 0) > 0 ||
              totalIncidentsVal > 0

            const statusType: 'zero' | 'warning' | 'danger' = hasSevere
              ? 'danger'
              : hasMinor
              ? 'warning'
              : 'zero'

            const markerIcon = createCustomIcon(statusType, site.name)

            return (
              <Marker
                key={site.id}
                position={[site.resolvedLat, site.resolvedLng]}
                icon={markerIcon}
              >
                <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                  <div className="font-semibold text-xs text-slate-900">
                    {site.name}
                    <span className="block text-[10px] text-muted-foreground font-normal">
                      {statusType === 'zero'
                        ? '🟢 Zero Accident'
                        : statusType === 'warning'
                        ? '🟡 Insiden Minor/PD'
                        : '🔴 Insiden Major/Fatality'}
                    </span>
                  </div>
                </Tooltip>

                <Popup className="safety-map-popup" minWidth={270} maxWidth={320}>
                  <div className="p-1 space-y-2.5">
                    <div className="border-b pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">
                          {site.name}
                        </h4>
                        {statusType === 'zero' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                            Zero Accident
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] font-semibold">
                            Ada Insiden
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{selectedMonthLabel}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* 1. Total Manpower (Featured Full Width) */}
                      <div className="col-span-2 rounded-lg bg-blue-50/80 p-2 border border-blue-200/80 flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="text-[10px] text-blue-700 uppercase tracking-wider block font-bold">
                            Total Manpower
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                            {totalMp.toLocaleString('id-ID')} <span className="text-[11px] font-normal text-slate-600">org</span>
                          </span>
                        </div>
                        <Users className="size-4 text-blue-600" />
                      </div>

                      {/* 2. Manpower Service */}
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200/60 shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Manpower Service
                        </span>
                        <span className="font-bold text-slate-900 text-sm tabular-nums">
                          {serviceMp.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-500">org</span>
                        </span>
                      </div>

                      {/* 3. Manpower Repair */}
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200/60 shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Manpower Repair
                        </span>
                        <span className="font-bold text-slate-900 text-sm tabular-nums">
                          {repairMp.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-500">org</span>
                        </span>
                      </div>

                      {/* 4. Safe Man Hours */}
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200/60 shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Safe Man Hours
                        </span>
                        <span className="font-bold text-slate-900 text-sm tabular-nums">
                          {(parseFloat(String(sum?.safetyManHours ?? 0).replace(/,/g, '')) || 0).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* 5. Total Insiden */}
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200/60 shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Total Insiden
                        </span>
                        <span
                          className={`font-bold text-sm tabular-nums ${
                            totalIncidentsVal > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {totalIncidentsVal.toLocaleString('id-ID')}{' '}
                          <span className="text-[10px] font-normal text-slate-500">
                            {totalIncidentsVal > 0 ? 'kasus' : ''}
                          </span>
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-8 text-xs font-semibold bg-[#1e40af] hover:bg-[#1e40af]/90 text-white gap-1.5 shadow-sm"
                      onClick={() => onOpenSiteDetail(site)}
                    >
                      <ExternalLink className="size-3.5" />
                      Buka OSHE Performance
                    </Button>
                  </div>
                </Popup>
              </Marker>
            )
          })}
      </MapContainer>

      {/* Floating Top Right: Map Style Switcher & Setting Koordinat */}
      <div className="absolute top-3 right-3 z-[400] flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center rounded-xl border border-slate-300 bg-white/95 p-1 shadow-md backdrop-blur-md">
          <Button
            type="button"
            size="sm"
            variant={mapLayer === 'osm' ? 'default' : 'ghost'}
            onClick={() => setMapLayer('osm')}
            className={`h-7 px-2.5 text-xs font-semibold gap-1.5 ${
              mapLayer === 'osm' ? 'bg-[#1e40af] text-white' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Map className="size-3.5" />
            Standar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mapLayer === 'satelit' ? 'default' : 'ghost'}
            onClick={() => setMapLayer('satelit')}
            className={`h-7 px-2.5 text-xs font-semibold gap-1.5 ${
              mapLayer === 'satelit' ? 'bg-[#1e40af] text-white' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Satellite className="size-3.5" />
            Satelit
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mapLayer === 'topo' ? 'default' : 'ghost'}
            onClick={() => setMapLayer('topo')}
            className={`h-7 px-2.5 text-xs font-semibold gap-1.5 ${
              mapLayer === 'topo' ? 'bg-[#1e40af] text-white' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Mountain className="size-3.5" />
            Topo
          </Button>
        </div>

        {onOpenManageCoordinates && (
          <Button
            type="button"
            size="sm"
            onClick={onOpenManageCoordinates}
            className="h-9 text-xs font-semibold bg-white/95 hover:bg-white text-slate-800 border border-slate-300 shadow-md backdrop-blur-md gap-1.5"
          >
            <Settings2 className="size-3.5 text-primary" />
            Setting Koordinat Site
          </Button>
        )}
      </div>

      {/* Floating Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-2 rounded-xl border border-white/40 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-md text-xs font-medium text-slate-800">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mr-1">
          Status Site:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
          <span>Zero Accident</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
          <span>Nearmiss / Minor / PD</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200"></span>
          <span>Major / Fatality</span>
        </div>
      </div>
    </div>
  )
}
