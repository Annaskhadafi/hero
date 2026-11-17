'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { resolveClientUploadUrl } from '@/lib/client-upload-url'
import type { DetectedHazardEvent } from './road-hazard-camera-view'

// Fix default leaflet icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Vehicle live location icon (pulsing cyan pin with vehicle indicator)
const vehicleIcon = L.divIcon({
  className: 'vehicle-live-pin',
  html: `
    <div style="position: relative; width: 28px; height: 28px;">
      <span style="position: absolute; inset: 0; border-radius: 50%; background: #06b6d4; opacity: 0.45; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border-radius: 50%; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></span>
      </span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

// Create hazard snapshot pins based on type
function createHazardIcon(type: string) {
  let bg = '#e11d48' // red for Potholes
  let border = '#ffe4e6'
  let label = 'P'

  if (type === 'Corragation') {
    bg = '#ea580c' // orange
    border = '#ffedd5'
    label = 'C'
  } else if (type === 'Ruts') {
    bg = '#eab308' // yellow
    border = '#fef9c3'
    label = 'R'
  }

  return L.divIcon({
    className: 'hazard-snapshot-pin',
    html: `
      <div style="position: relative; width: 26px; height: 26px;">
        <span style="position: absolute; inset: 0; border-radius: 50%; background: ${bg}; opacity: 0.3; animation: pulse 2s infinite;"></span>
        <div style="position: absolute; top: 2px; left: 2px; width: 22px; height: 22px; border-radius: 50%; background: ${bg}; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 10px; font-weight: 900; font-family: sans-serif;">
          ${label}
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

function MapCenterFollower({ lat, lng, follow = true }: { lat: number; lng: number; follow?: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (follow && lat && lng) {
      map.setView([lat, lng], map.getZoom(), { animate: true })
    }
  }, [lat, lng, follow, map])
  return null
}

export interface RoadHazardLiveMapInnerProps {
  currentLat: number
  currentLng: number
  pathCoordinates: [number, number][]
  snapshots: DetectedHazardEvent[]
  followVehicle?: boolean
  zoom?: number
  onSelectSnapshot?: (event: DetectedHazardEvent) => void
}

export default function RoadHazardLiveMapInner({
  currentLat,
  currentLng,
  pathCoordinates,
  snapshots,
  followVehicle = true,
  zoom = 16,
}: RoadHazardLiveMapInnerProps) {
  const centerPos = useMemo<[number, number]>(() => {
    if (currentLat && currentLng) return [currentLat, currentLng]
    if (snapshots.length > 0 && snapshots[0].latitude && snapshots[0].longitude) {
      return [Number(snapshots[0].latitude), Number(snapshots[0].longitude)]
    }
    return [-1.202291, 116.868041] // Balikpapan / Kaltim default
  }, [currentLat, currentLng, snapshots])

  return (
    <MapContainer
      center={centerPos}
      zoom={zoom}
      scrollWheelZoom={true}
      zoomControl={false}
      attributionControl={false}
      style={{ height: '100%', width: '100%', background: '#0f172a' }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {/* Traveled Route Polyline (Blue GPS breadcrumb trail) */}
      {pathCoordinates.length > 1 && (
        <Polyline
          positions={pathCoordinates}
          pathOptions={{
            color: '#0284c7',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {/* Moving Vehicle Location Marker */}
      {currentLat && currentLng && (
        <Marker position={[currentLat, currentLng]} icon={vehicleIcon}>
          <Popup className="road-hazard-popup">
            <div className="p-1 text-xs">
              <p className="font-bold text-slate-900">Unit Kendaraan</p>
              <p className="text-[10px] text-slate-500 font-mono">
                {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Hazard Snapshot Pins on the Road */}
      {snapshots.map((snap) => {
        if (!snap.latitude || !snap.longitude) return null
        const lat = Number(snap.latitude)
        const lng = Number(snap.longitude)
        const imgUrl = resolveClientUploadUrl(snap.annotatedPhotoUrl || snap.photoUrl)

        return (
          <Marker
            key={snap.id}
            position={[lat, lng]}
            icon={createHazardIcon(snap.hazardType)}
          >
            <Popup className="road-hazard-popup" maxWidth={200}>
              <div className="space-y-1.5 p-1 text-xs">
                {imgUrl && (
                  <div className="h-20 w-full overflow-hidden rounded-md bg-slate-900">
                    <img src={imgUrl} alt={snap.hazardType} className="size-full object-cover" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-black text-[11px] uppercase text-rose-600">
                    {snap.hazardType}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600">
                    AI {Math.round(snap.confidence * 100)}%
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 font-mono">
                  GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
                <p className="text-[9px] text-slate-400">
                  {snap.timestamp} {snap.isManualSnap ? '• Manual Snap' : '• Auto AI'}
                </p>
              </div>
            </Popup>
          </Marker>
        )
      })}

      <MapCenterFollower lat={currentLat} lng={currentLng} follow={followVehicle} />
    </MapContainer>
  )
}
