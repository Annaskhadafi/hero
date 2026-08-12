'use client'

import { useState, useMemo } from 'react'
import { Search, CheckSquare, Square, Layers } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export type MinimalActivityOption = {
  id: number
  activityCode: string
  activityName: string
  category?: string | null
}

export function ActivityGroupMemberSelector({
  existingActivities = [],
  currentActivityId,
  initialChildIds = [],
}: {
  existingActivities: MinimalActivityOption[]
  currentActivityId?: number
  initialChildIds?: number[]
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>(initialChildIds)
  const [search, setSearch] = useState('')

  // Exclude current activity from self-referencing
  const availableOptions = useMemo(() => {
    return existingActivities.filter((a) => a.id !== currentActivityId)
  }, [existingActivities, currentActivityId])

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return availableOptions
    const q = search.toLowerCase().trim()
    return availableOptions.filter(
      (a) =>
        a.activityCode.toLowerCase().includes(q) ||
        a.activityName.toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q)
    )
  }, [availableOptions, search])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOptions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredOptions.map((o) => o.id))
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 font-bold text-sm text-primary">
            <Layers className="size-4 text-primary" />
            <span>Pilih Kamus Aktivitas Anggota (Group List)</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-4">
            Pilih aktivitas yang sudah ada untuk dijadikan anggota group ini. Di mobile, memilih group ini akan otomatis mengeluarkan seluruh aktivitas di bawah ini.
          </p>
        </div>
        <Badge variant="outline" className="bg-white border-primary/30 text-primary font-bold text-xs">
          {selectedIds.length} Aktivitas Dipilih
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="size-3.5 absolute left-2.5 top-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama kamus aktivitas..."
            className="pl-8 h-9 text-xs bg-white border-primary/20"
          />
        </div>
        {filteredOptions.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="h-9 px-3 text-xs font-semibold rounded-lg bg-white border border-primary/20 text-primary hover:bg-primary/10 transition shrink-0"
          >
            {selectedIds.length === filteredOptions.length && filteredOptions.length > 0
              ? 'Batal Semua'
              : 'Pilih Semua'}
          </button>
        )}
      </div>

      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 pt-1">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((item) => {
            const isSelected = selectedIds.includes(item.id)
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                  isSelected
                    ? 'bg-primary/10 border-primary/40 font-semibold text-primary shadow-2xs'
                    : 'bg-white border-border/70 text-foreground hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isSelected ? (
                    <CheckSquare className="size-4 text-primary shrink-0" />
                  ) : (
                    <Square className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-bold shrink-0">{item.activityCode}</span>
                  <span className="truncate">{item.activityName}</span>
                </div>
                {item.category ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 ml-2">
                    {item.category}
                  </span>
                ) : null}
              </div>
            )
          })
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground italic bg-white rounded-lg border border-dashed">
            {availableOptions.length === 0
              ? 'Belum ada kamus aktivitas lain yang tersedia.'
              : 'Tidak ada kamus aktivitas yang cocok dengan pencarian.'}
          </div>
        )}
      </div>

      <input type="hidden" name="childActivityIds" value={selectedIds.join(',')} />
    </div>
  )
}
