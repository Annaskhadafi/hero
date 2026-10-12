'use client'

import dynamic from 'next/dynamic'

const DynamicPicker = dynamic(
  () => import('./site-coordinate-picker-modal').then((mod) => mod.SiteCoordinatePickerInner),
  {
    ssr: false,
    loading: () => null,
  }
)

export function SiteCoordinatePicker({
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
  if (!isOpen) return null

  return (
    <DynamicPicker
      siteName={siteName}
      initialLat={initialLat}
      initialLng={initialLng}
      isOpen={isOpen}
      onClose={onClose}
      onSelectCoordinates={onSelectCoordinates}
    />
  )
}
