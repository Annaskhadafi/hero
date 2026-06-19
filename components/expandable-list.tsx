'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ExpandableList({
  children, limit = 5, labelMore = 'Lihat Semua', labelLess = 'Tutup',
}: {
  children: React.ReactNode
  limit?: number
  labelMore?: string
  labelLess?: string
}) {
  const items = React.Children.toArray(children)
  const [showAll, setShowAll] = React.useState(false)

  if (items.length === 0) return null

  const visible = showAll ? items : items.slice(0, limit)
  const hasMore = items.length > limit

  return (
    <>
      {visible}
      {hasMore ? (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="flex w-full items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-blue-600 hover:bg-gray-50 transition rounded-b-xl"
        >
          {showAll ? (
            <><ChevronUp className="size-3.5" /> {labelLess}</>
          ) : (
            <><ChevronDown className="size-3.5" /> {labelMore} ({items.length})</>
          )}
        </button>
      ) : null}
    </>
  )
}
