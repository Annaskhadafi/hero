'use client'

import dynamic from 'next/dynamic'
import { ExternalLink, MapPin } from 'lucide-react'

const DynamicLeafletMap = dynamic(() => import('./osm-mini-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex size-full flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
      <MapPin className="size-6 animate-bounce text-blue-600 mb-1" />
      <span className="text-[11px] font-medium">Memuat peta OpenStreetMap...</span>
    </div>
  ),
})

export function OsmMiniMap({
  latitude,
  longitude,
  accuracy,
  className = '',
}: {
  latitude: number | string
  longitude: number | string
  accuracy?: string
  className?: string
}) {
  const latNum = Number(latitude) || -1.202291
  const lngNum = Number(longitude) || 116.868041
  const googleMapsUrl = `https://www.google.com/maps?q=${latNum},${lngNum}`

  return (
    <div className={`relative rounded-xl border overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner group ${className}`}>
      {/* Real Interactive Leaflet Tile Map (Never blocked by iframe/X-Frame-Options) */}
      <DynamicLeafletMap latitude={latNum} longitude={lngNum} zoom={15} />

      {/* Floating Top Coordinate Badge */}
      <div className="pointer-events-none absolute top-2 left-2 z-[400] flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-foreground shadow-md border">
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
        </span>
        <span className="font-mono">{latNum.toFixed(6)}, {lngNum.toFixed(6)}</span>
      </div>

      {/* Floating Accuracy Badge */}
      {accuracy && (
        <div className="pointer-events-none absolute top-2 right-2 z-[400] rounded-full bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 shadow-md">
          {accuracy}
        </div>
      )}

      {/* Floating Action: External Google Maps Link */}
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 z-[400] flex items-center gap-1 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-[10px] font-semibold px-2.5 py-1 shadow-md backdrop-blur-sm transition-all active:scale-95"
      >
        <ExternalLink className="size-3" />
        <span>Buka Google Maps</span>
      </a>
    </div>
  )
}
