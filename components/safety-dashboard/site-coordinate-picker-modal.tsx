'use client'

import * as React from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Check, Crosshair, MapPin, Search, Sparkles, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Marker icon
const pinIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center cursor-pointer">
      <span class="absolute -inset-1 animate-ping rounded-full bg-rose-400 opacity-75"></span>
      <div class="relative flex size-9 items-center justify-center rounded-full bg-rose-600 border-2 border-white text-white shadow-xl ring-2 ring-rose-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `,
  className: 'custom-pin-picker-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

function LocationMarker({
  position,
  setPosition,
}: {
  position: [number, number]
  setPosition: (pos: [number, number]) => void
}) {
  const map = useMapEvents({
    click(e) {
      setPosition([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))])
    },
  })

  return (
    <Marker
      position={position}
      icon={pinIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target
          const latLng = marker.getLatLng()
          setPosition([Number(latLng.lat.toFixed(6)), Number(latLng.lng.toFixed(6))])
        },
      }}
    />
  )
}

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap()
  React.useEffect(() => {
    map.invalidateSize()
    map.setView(center, map.getZoom())
    const timer = setTimeout(() => map.invalidateSize(), 200)
    return () => clearTimeout(timer)
  }, [center, map])
  return null
}

export function SiteCoordinatePickerInner({
  siteName,
  initialLat,
  initialLng,
  isOpen,
  onClose,
  onSelectCoordinates,
}: {
  siteName: string
  initialLat: string
  initialLng: string
  isOpen: boolean
  onClose: () => void
  onSelectCoordinates: (lat: string, lng: string) => void
}) {
  const parsedLat = parseFloat(initialLat)
  const parsedLng = parseFloat(initialLng)

  const defaultCenter: [number, number] =
    !Number.isNaN(parsedLat) && !Number.isNaN(parsedLng) && parsedLat && parsedLng
      ? [parsedLat, parsedLng]
      : [-1.2379, 116.8529] // Default Balikpapan / Kaltim

  const [position, setPosition] = React.useState<[number, number]>(defaultCenter)
  const [mapType, setMapType] = React.useState<'osm' | 'satelit'>('osm')

  React.useEffect(() => {
    if (isOpen) {
      const lat = parseFloat(initialLat)
      const lng = parseFloat(initialLng)
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat && lng) {
        setPosition([lat, lng])
      } else {
        setPosition([-1.2379, 116.8529])
      }
    }
  }, [isOpen, initialLat, initialLng])

  const handleConfirm = () => {
    onSelectCoordinates(String(position[0]), String(position[1]))
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-0 bg-white shadow-2xl">
        <DialogHeader className="p-4 bg-slate-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-rose-100 text-rose-700 grid place-items-center">
                <MapPin className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Pilih Titik Lokasi Peta: {siteName}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Klik di area peta mana saja atau geser (drag) pin merah untuk menentukan koordinat lokasi site.
                </DialogDescription>
              </div>
            </div>

            {/* Map Style Selector */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg">
              <Button
                type="button"
                size="sm"
                variant={mapType === 'osm' ? 'default' : 'ghost'}
                onClick={() => setMapType('osm')}
                className="h-7 text-xs px-2.5 font-medium"
              >
                🗺️ Standar
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mapType === 'satelit' ? 'default' : 'ghost'}
                onClick={() => setMapType('satelit')}
                className="h-7 text-xs px-2.5 font-medium"
              >
                🛰️ Satelit
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Map Container */}
        <div className="relative h-[480px] w-full bg-slate-100">
          <MapContainer
            center={position}
            zoom={7}
            scrollWheelZoom={true}
            className="size-full z-0"
          >
            {mapType === 'osm' ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
            ) : (
              <TileLayer
                attribution='Tiles &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            )}

            <MapCenterController center={position} />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>

          {/* Floating Coordinate Pill */}
          <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-3 bg-white/95 px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-xs font-semibold backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Crosshair className="size-4 text-rose-600" />
              <span>Titik Terpilih:</span>
            </div>
            <div className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 bg-slate-50 border-t flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            className="bg-[#1e40af] hover:bg-[#1e40af]/90 text-white font-semibold gap-1.5 shadow-sm"
          >
            <Check className="size-4" />
            Gunakan Koordinat Ini
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
