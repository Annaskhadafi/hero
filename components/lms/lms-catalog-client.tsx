'use client'

import { useState, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { LmsCourseGrid } from '@/components/lms/lms-course-grid'
import { type LmsCourseCardProps } from '@/components/lms/lms-course-card'
import { resolveClientUploadUrl } from '@/lib/client-url'

interface CatalogItem {
  course: LmsCourseCardProps['course']
  enrollment?: LmsCourseCardProps['enrollment']
  href: string
}

interface LmsCatalogClientProps {
  items: CatalogItem[]
  categories: string[]
}

export function LmsCatalogClient({ items, categories }: LmsCatalogClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Eagerly preload top catalog images into browser memory cache for instantaneous view
  useEffect(() => {
    if (typeof window === 'undefined') return
    items.slice(0, 16).forEach((item) => {
      if (item.course.coverImageUrl) {
        const img = new window.Image()
        img.src = resolveClientUploadUrl(item.course.coverImageUrl)
      }
    })
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'Semua' ||
        (item.course.category ?? '').toLowerCase() === selectedCategory.toLowerCase()

      const matchesSearch =
        !searchQuery.trim() ||
        item.course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.course.category ?? '').toLowerCase().includes(searchQuery.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [items, selectedCategory, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Katalog Kursus</h1>
          <p className="text-slate-500 mt-1 text-sm">Jelajahi semua kursus yang tersedia untuk Anda.</p>
        </div>

        {/* Live Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kursus..."
            className="pl-10 bg-slate-50 border-slate-200 focus:bg-white text-sm rounded-xl h-10"
          />
        </div>
      </div>

      {/* Category Tabs / Filter Chips */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
          <button
            onClick={() => setSelectedCategory('Semua')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedCategory === 'Semua'
                ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Semua ({items.length})
          </button>

          {categories.map((cat) => {
            const count = items.filter(
              (i) => (i.course.category ?? '').toLowerCase() === cat.toLowerCase()
            ).length

            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase()

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Course Grid */}
      <LmsCourseGrid
        courses={filteredItems}
        emptyStateTitle="Tidak Ada Kursus"
        emptyStateDescription={
          searchQuery || selectedCategory !== 'Semua'
            ? 'Tidak ada kursus yang sesuai dengan pencarian atau kategori ini.'
            : 'Belum ada kursus yang tersedia saat ini.'
        }
      />
    </div>
  )
}
