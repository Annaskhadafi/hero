'use client'

import dynamic from 'next/dynamic'
import { MapPin, Navigation } from 'lucide-react'
import type { RoadHazardLiveMapInnerProps } from './road-hazard-live-map-inner'

const DynamicLeafletMap = dynamic(() => import('./road-hazard-live-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex size-full flex-col items-center justify-center bg-slate-900 text-slate-400">
      <Navigation className="size-6 animate-spin text-cyan-400 mb-1" />
      <span className="text-[10px] font-medium text-slate-300">Memuat Widget Peta OpenStreetMap...</span>
    </div>
  ),
})

export function RoadHazardLiveMap(props: RoadHazardLiveMapInnerProps & { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${props.className || 'size-full'}`}>
      <DynamicLeafletMap {...props} />
    </div>
  )
}
