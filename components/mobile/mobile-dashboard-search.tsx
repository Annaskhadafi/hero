'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  X,
  ArrowRight,
  Sparkles,
  Command,
  ChevronRight,
  Folder,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export type SearchableMenuItem = {
  title: string
  url: string
  section?: string
  iconName?: string
  icon?: any
  bg?: string
  description?: string
  isRequestGroup?: boolean
}

type MobileDashboardSearchProps = {
  items: SearchableMenuItem[]
  onOpenRequests?: () => void
  onOpenLainnya?: () => void
}

export function MobileDashboardSearch({
  items,
  onOpenRequests,
  onOpenLainnya,
}: MobileDashboardSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setSearchQuery('')
      setSelectedCategory('Semua')
    }
  }, [open])

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => {
      if (item.section) {
        set.add(item.section)
      }
    })
    return ['Semua', ...Array.from(set)]
  }, [items])

  // Filter items based on query & category
  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'Semua' && item.section !== selectedCategory) {
        return false
      }
      if (!q) return true

      const matchTitle = item.title.toLowerCase().includes(q)
      const matchSection = item.section ? item.section.toLowerCase().includes(q) : false
      const matchDesc = item.description ? item.description.toLowerCase().includes(q) : false
      return matchTitle || matchSection || matchDesc
    })
  }, [items, searchQuery, selectedCategory])

  // Highlights matching query in text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text
    const parts = text.split(new RegExp(`(${query.trim()})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.trim().toLowerCase() ? (
        <span key={i} className="rounded bg-amber-100 font-extrabold text-[#003f78] px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  return (
    <>
      {/* Search Trigger Bar on Dashboard */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 shadow-[0_8px_20px_rgba(8,32,51,0.04)] backdrop-blur-md transition-all duration-200 hover:border-[#003f78]/30 hover:shadow-[0_10px_24px_rgba(0,63,120,0.08)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5 text-slate-400 group-hover:text-slate-600">
            <div className="flex size-6 items-center justify-center rounded-lg bg-slate-100/80 text-slate-500 group-hover:bg-[#003f78]/10 group-hover:text-[#003f78] transition-colors">
              <Search className="size-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Cari menu, layanan, atau laporan...
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5 rounded-lg border border-slate-200/90 bg-slate-50/80 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              <Command className="size-2.5" />
              <span>K</span>
            </span>
          </div>
        </button>
      </div>

      {/* Instant Search Drawer / Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] space-y-4 rounded-t-[2.2rem] border-t border-slate-100/90 bg-[#f8fbfe] px-5 pt-3 pb-8 shadow-[0_-20px_50px_rgba(8,32,51,0.15)]"
        >
          {/* Top Grabber Indicator */}
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />

          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#003f78]">
                  Pencarian Cepat Menu
                </p>
                <SheetTitle className="text-lg font-black tracking-tight text-[#082033]">
                  Temukan Layanan HERO
                </SheetTitle>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>
          </SheetHeader>

          {/* Interactive Search Input */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="size-4 text-[#003f78]" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama menu, misal: SPL, Kerusakan Ban, HSE..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-10 text-sm font-semibold text-[#082033] shadow-[0_4px_16px_rgba(8,32,51,0.04)] placeholder:text-slate-400 focus:border-[#003f78] focus:ring-2 focus:ring-[#003f78]/20 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Category Chips Horizontal Scroll */}
          <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 py-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-tight transition-all duration-150 active:scale-95',
                  selectedCategory === category
                    ? 'bg-[#003f78] text-white shadow-[0_4px_12px_rgba(0,63,120,0.25)]'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {filteredResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {filteredResults.map((item, index) => {
                  const Icon = item.icon || Folder

                  if (item.isRequestGroup) {
                    return (
                      <button
                        key={`search-res-${index}`}
                        type="button"
                        onClick={() => {
                          setOpen(false)
                          if (onOpenRequests) onOpenRequests()
                        }}
                        className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_4px_14px_rgba(8,32,51,0.03)] transition-all hover:border-[#003f78]/30 hover:bg-slate-50 active:scale-[0.98] text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex size-11 shrink-0 items-center justify-center rounded-xl',
                              item.bg || 'bg-blue-500/10 text-blue-600'
                            )}
                          >
                            <Icon className="size-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#082033]">
                              {highlightMatch(item.title, searchQuery)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.section && (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                  {item.section}
                                </span>
                              )}
                              <span className="text-[10px] font-medium text-slate-400">
                                APD, Material, Tools, ATK
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-slate-300 group-hover:text-[#003f78] transition-colors" />
                      </button>
                    )
                  }

                  return (
                    <Link
                      key={`search-res-${index}`}
                      href={item.url}
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_4px_14px_rgba(8,32,51,0.03)] transition-all hover:border-[#003f78]/30 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-xl',
                            item.bg || 'bg-sky-500/10 text-sky-600'
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#082033] leading-tight">
                            {highlightMatch(item.title, searchQuery)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {item.section && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                {item.section}
                              </span>
                            )}
                            {item.description && (
                              <span className="truncate text-[10px] font-medium text-slate-400">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-slate-300 group-hover:text-[#003f78] transition-colors" />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
                  <Search className="size-6" />
                </div>
                <p className="text-sm font-bold text-[#082033]">Menu tidak ditemukan</p>
                <p className="mt-1 text-xs text-slate-500 max-w-[260px]">
                  Coba kata kunci lain atau buka seluruh katalog di tombol &quot;Lainnya&quot;.
                </p>
                {onOpenLainnya && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onOpenLainnya()
                    }}
                    className="mt-4 flex h-9 items-center gap-1.5 rounded-xl bg-[#003f78] px-4 text-xs font-bold text-white shadow-xs active:scale-95 transition-all"
                  >
                    <span>Buka Semua Menu</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
