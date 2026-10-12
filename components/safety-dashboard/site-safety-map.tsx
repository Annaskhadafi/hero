'use client'

import dynamic from 'next/dynamic'
import type { SiteMapData } from './site-safety-map-inner'

const DynamicSiteSafetyMapInner = dynamic(
  () => import('./site-safety-map-inner').then((mod) => mod.SiteSafetyMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] w-full flex-col items-center justify-center rounded-2xl border border-border/80 bg-slate-100 animate-pulse text-muted-foreground gap-3">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-medium">Memuat Peta Interaktif Site K3...</p>
      </div>
    ),
  }
)

export function SiteSafetyMap({
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
  return (
    <DynamicSiteSafetyMapInner
      sites={sites}
      selectedMonthLabel={selectedMonthLabel}
      onOpenSiteDetail={onOpenSiteDetail}
      onOpenManageCoordinates={onOpenManageCoordinates}
    />
  )
}
export type { SiteMapData }
