'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default leaflet icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom pulse pin icon
const customPinIcon = L.divIcon({
  className: 'custom-osm-pin',
  html: `
    <div style="position: relative; width: 24px; height: 24px;">
      <span style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: #3b82f6; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function MapCenterUpdater({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true })
  }, [lat, lng, zoom, map])
  return null
}

export default function OsmMiniMapInner({
  latitude,
  longitude,
  zoom = 15,
}: {
  latitude: number
  longitude: number
  zoom?: number
}) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={zoom}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Marker position={[latitude, longitude]} icon={customPinIcon} />
      <MapCenterUpdater lat={latitude} lng={longitude} zoom={zoom} />
    </MapContainer>
  )
}
