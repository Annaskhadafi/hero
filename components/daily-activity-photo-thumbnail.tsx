'use client'

import { useState } from 'react'
import { formatPhotoDisplayUrl } from '@/lib/photo-url'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { ImageOff, Loader2, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DailyActivityPhotoThumbnailProps {
  url: string
  alt: string
  className?: string
  width?: number
  onClick?: () => void
}

export function DailyActivityPhotoThumbnail({
  url,
  alt,
  className,
  width = 400,
  onClick,
}: DailyActivityPhotoThumbnailProps) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'fallback' | 'error'>('loading')
  const [currentSrc, setCurrentSrc] = useState<string>(() => formatPhotoDisplayUrl(url, width))

  const handleImageError = () => {
    // If the optimized endpoint failed and we haven't tried the raw resolved URL yet, try raw fallback
    if (loadState !== 'fallback') {
      const fallbackUrl = resolveUploadUrl(url)
      if (fallbackUrl && fallbackUrl !== currentSrc) {
        setLoadState('fallback')
        setCurrentSrc(fallbackUrl)
        return
      }
    }
    setLoadState('error')
  }

  const handleImageLoad = () => {
    setLoadState('loaded')
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative w-28 h-20 sm:w-32 sm:h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-sky-500 shadow-2xs hover:shadow-md transition-all bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center cursor-pointer group select-none',
        className
      )}
    >
      {/* 1. Loading Skeleton / Spinner (Shown while downloading - Never pitch black!) */}
      {loadState === 'loading' || loadState === 'fallback' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 z-5 p-1 animate-pulse">
          <Loader2 className="w-4 h-4 text-sky-500 animate-spin mb-1" />
          <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
            {loadState === 'fallback' ? 'Mencoba raw...' : 'Memuat...'}
          </span>
        </div>
      ) : null}

      {/* 2. Error Fallback (Shown if image cannot be loaded) */}
      {loadState === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 text-center">
          <ImageOff className="w-5 h-5 text-slate-400 mb-1" />
          <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
            Foto tidak tersedia
          </span>
        </div>
      ) : (
        /* 3. The actual image */
        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            'w-full h-full object-contain group-hover:scale-105 transition-all duration-300',
            loadState === 'loaded' ? 'opacity-100' : 'opacity-0'
          )}
          loading="eager"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* 4. Zoom Hover Overlay (Only when loaded successfully) */}
      {loadState === 'loaded' && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
          <span className="bg-white/95 text-slate-900 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow-sm">
            <ZoomIn className="w-3 h-3 text-blue-600" /> Perbesar
          </span>
        </div>
      )}
    </div>
  )
}
