'use client'

import React from 'react'
import Image from 'next/image'
import { findHero3dIcon, type Hero3dIconKey } from '@/lib/hero-3d-icons'
import { cn } from '@/lib/utils'

export type Hero3dIconProps = {
  title?: string | null
  url?: string | null
  iconKey?: Hero3dIconKey | null
  variant?: 'tile' | 'polos'
  className?: string
  fallback?: React.ReactNode
  alt?: string
  width?: number
  height?: number
  unoptimized?: boolean
}

export function Hero3dIcon({
  title,
  url,
  iconKey,
  variant = 'tile',
  className,
  fallback = null,
  alt,
  width = 48,
  height = 48,
  unoptimized = true,
}: Hero3dIconProps) {
  const iconInfo = findHero3dIcon({ title, url, key: iconKey })

  if (!iconInfo) {
    return fallback ? <>{fallback}</> : null
  }

  const src = variant === 'tile' ? iconInfo.tileUrl : iconInfo.polosUrl

  return (
    <Image
      src={src}
      alt={alt || iconInfo.title}
      width={width}
      height={height}
      unoptimized={unoptimized}
      className={cn('object-contain select-none pointer-events-none shrink-0', className)}
    />
  )
}
