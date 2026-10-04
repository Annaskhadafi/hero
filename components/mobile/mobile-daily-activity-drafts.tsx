'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText,
  Clock,
  Calendar,
  Cloud,
  Smartphone,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Layers,
  Loader2,
  Camera,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  ACTIVITY_DRAFTS_CHANGED_EVENT,
  getActivityDraftIndex,
  removeActivityDraft,
  saveActivityDraftIndexEntry,
  writeDraft,
  type ActivityDraftIndexEntry,
  type ActivitySyncPayload,
} from '@/lib/offline-sync'
import {
  getEmployeeServerDraftsAction,
  deleteServerActivityDraftAction,
  loadActivityServerDraftAction,
} from '@/app/dashboard/activity-hub/actions'

function toDateTimeLocalValue(value?: string | Date | null) {
  if (!value) return ''
  const dateValue = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dateValue.getTime())) return ''
  const local = new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export type UnifiedDraftItem = {
  id: string
  source: 'local' | 'server' | 'both'
  localKey?: string
  serverId?: number
  title: string
  workDate: string
  shiftCode?: string
  itemCount: number
  summaryRemark?: string
  updatedAt: string
  photoUrls?: string[]
}

interface MobileDailyActivityDraftsProps {
  onSelectLocalDraft: (draftKey: string) => void
  onSelectServerDraft: (sessionId: number) => void
  onDraftCountChange?: (count: number) => void
}

export function MobileDailyActivityDrafts({
  onSelectLocalDraft,
  onSelectServerDraft,
  onDraftCountChange,
}: MobileDailyActivityDraftsProps) {
  const [localDrafts, setLocalDrafts] = useState<ActivityDraftIndexEntry[]>([])
  const [serverDrafts, setServerDrafts] = useState<any[]>([])
  const [isLoadingServer, setIsLoadingServer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 1. Sync local drafts
  const refreshLocalDrafts = useCallback(() => {
    const list = getActivityDraftIndex()
    setLocalDrafts(list)
  }, [])

  // 2. Fetch server drafts
  const fetchServerDrafts = useCallback(async () => {
    setIsLoadingServer(true)
    try {
      const res = await getEmployeeServerDraftsAction()
      if (res.success) {
        setServerDrafts(res.drafts || [])
      }
    } catch (err: any) {
      console.warn('[MobileDailyActivityDrafts] Error loading server drafts:', err)
    } finally {
      setIsLoadingServer(false)
    }
  }, [])

  useEffect(() => {
    refreshLocalDrafts()
    fetchServerDrafts()

    const handleLocalChange = () => refreshLocalDrafts()
    window.addEventListener(ACTIVITY_DRAFTS_CHANGED_EVENT, handleLocalChange)
    return () => {
      window.removeEventListener(ACTIVITY_DRAFTS_CHANGED_EVENT, handleLocalChange)
    }
  }, [refreshLocalDrafts, fetchServerDrafts])

  // 3. Combine and deduplicate into unified list
  const unifiedDrafts: UnifiedDraftItem[] = useMemo(() => {
    const items: UnifiedDraftItem[] = []
    const matchedServerIds = new Set<number>()
    const usedLocalKeys = new Set<string>()

    const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

    // Step 1: Process each server draft and find all corresponding local drafts
    for (const sd of serverDrafts) {
      matchedServerIds.add(sd.id)

      // Find all local drafts corresponding to this server draft
      const matchingLocal = localDrafts.filter((d) => {
        if (d.serverDraftSessionId && d.serverDraftSessionId === sd.id) return true
        if (d.key.includes(`server-${sd.id}`)) return true
        const isSameDate = d.workDate === sd.workDate
        const isSameTitle = norm(d.title) === norm(sd.title)
        return isSameDate && isSameTitle
      })

      // Sort matching local drafts newest first
      matchingLocal.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      const activeLocal = matchingLocal[0]

      // Mark all matching local drafts as used, and clean up older stale duplicates
      for (let i = 0; i < matchingLocal.length; i++) {
        const ml = matchingLocal[i]
        usedLocalKeys.add(ml.key)
        if (i > 0) {
          try {
            removeActivityDraft(ml.key)
          } catch {}
        }
      }

      // Combine photo URLs (deduplicated)
      const photoList: string[] = []
      const addPhoto = (u?: string | null) => {
        if (typeof u === 'string' && u.trim() && !photoList.includes(u.trim())) {
          photoList.push(u.trim())
        }
      }
      if (Array.isArray(activeLocal?.photoUrls)) {
        activeLocal.photoUrls.forEach(addPhoto)
      }
      if (Array.isArray(sd.photoUrls)) {
        sd.photoUrls.forEach(addPhoto)
      }

      items.push({
        id: `unified:${sd.id}`,
        source: activeLocal ? 'both' : 'server',
        localKey: activeLocal?.key,
        serverId: sd.id,
        title: activeLocal?.title || sd.title || `Draft DAR #${sd.id}`,
        workDate: activeLocal?.workDate || sd.workDate,
        shiftCode: sd.shiftCode,
        itemCount: activeLocal?.itemCount || sd.itemCount || 1,
        summaryRemark: sd.summaryRemark,
        updatedAt:
          activeLocal && new Date(activeLocal.updatedAt).getTime() > new Date(sd.updatedAt).getTime()
            ? activeLocal.updatedAt
            : sd.updatedAt,
        photoUrls: photoList,
      })
    }

    // Step 2: Process remaining local drafts that did not match any server draft
    const remainingLocal = localDrafts.filter((d) => !usedLocalKeys.has(d.key))
    const localGroups = new Map<string, ActivityDraftIndexEntry[]>()
    for (const d of remainingLocal) {
      const groupKey = `${d.workDate}::${norm(d.title)}`
      if (!localGroups.has(groupKey)) {
        localGroups.set(groupKey, [])
      }
      localGroups.get(groupKey)!.push(d)
    }

    for (const [, group] of localGroups.entries()) {
      group.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      const newest = group[0]

      // Clean up older duplicate saves of the same draft
      for (let i = 1; i < group.length; i++) {
        try {
          removeActivityDraft(group[i].key)
        } catch {}
      }

      items.push({
        id: `local:${newest.key}`,
        source: 'local',
        localKey: newest.key,
        title: newest.title || 'Draft Aktivitas (Lokal)',
        workDate: newest.workDate,
        itemCount: newest.itemCount || 1,
        updatedAt: newest.updatedAt,
        photoUrls: newest.photoUrls || [],
      })
    }

    // Secondary deduplication guard ensuring strictly unique item ids
    const seenItemIds = new Set<string>()
    const deduplicated: UnifiedDraftItem[] = []
    for (const item of items) {
      if (seenItemIds.has(item.id)) continue
      seenItemIds.add(item.id)
      deduplicated.push(item)
    }

    // Sort newest first
    return deduplicated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [localDrafts, serverDrafts])

  // Notify parent of total count
  useEffect(() => {
    if (onDraftCountChange) {
      onDraftCountChange(unifiedDrafts.length)
    }
  }, [unifiedDrafts.length, onDraftCountChange])

  // Filtered by search
  const filteredDrafts = useMemo(() => {
    if (!searchQuery.trim()) return unifiedDrafts
    const q = searchQuery.toLowerCase()
    return unifiedDrafts.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.workDate.includes(q) ||
        (item.shiftCode && item.shiftCode.toLowerCase().includes(q)) ||
        (item.summaryRemark && item.summaryRemark.toLowerCase().includes(q))
    )
  }, [unifiedDrafts, searchQuery])

  // Handle Delete
  const handleDeleteDraft = async (item: UnifiedDraftItem) => {
    const confirmMsg = `Hapus draft "${item.title}"? Data yang belum disubmit akan dihapus permanen.`
    if (!window.confirm(confirmMsg)) return

    setDeletingId(item.id)
    try {
      if (item.localKey) {
        removeActivityDraft(item.localKey)
        refreshLocalDrafts()
      }
      if (item.serverId) {
        const res = await deleteServerActivityDraftAction(item.serverId)
        if (res.success) {
          fetchServerDrafts()
        }
      }
      toast.success('Draft berhasil dihapus.')
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menghapus draft.')
    } finally {
      setDeletingId(null)
    }
  }

  const [openingId, setOpeningId] = useState<string | null>(null)

  // Handle Open
  const handleOpenDraft = async (item: UnifiedDraftItem) => {
    // If local copy exists, open instantly
    if (item.localKey) {
      onSelectLocalDraft(item.localKey)
      return
    }

    if (item.serverId) {
      setOpeningId(item.id)
      try {
        toast.loading('Mengunduh draft dari server...', { id: 'load-draft-server' })
        const res = await loadActivityServerDraftAction(item.serverId)
        if (!res.success) {
          toast.error(res.error || 'Gagal memuat draft dari server.', { id: 'load-draft-server' })
          return
        }

        const srvDraft = res.draft
        if (!srvDraft) {
          toast.error('Draft tidak ditemukan di server.', { id: 'load-draft-server' })
          return
        }

        const isCustom =
          srvDraft.submissionSource === 'custom' ||
          (!srvDraft.items?.some((it: any) => it.libraryActivityId) && srvDraft.items.length > 0)

        const payload: ActivitySyncPayload = {
          employeeId: 0,
          workDate: srvDraft.workDate,
          routeShiftCode: srvDraft.shiftCode || 'ALL',
          sourceMode: isCustom ? 'custom' : 'self_input',
          assignmentId: '',
          libraryActivityId: srvDraft.items[0]?.libraryActivityId ? String(srvDraft.items[0].libraryActivityId) : '',
          selectedLibraryActivityIds: isCustom
            ? []
            : srvDraft.items.map((it: any) => String(it.libraryActivityId)).filter(Boolean),
          selfInputActivities: isCustom
            ? []
            : srvDraft.items.map((it: any) => {
                const photos =
                  it.photos && it.photos.length > 0 ? it.photos : it.photoUrl ? [it.photoUrl] : []
                return {
                  libraryActivityId: String(it.libraryActivityId),
                  equipmentNo: it.unitNumber || '',
                  startTime: it.startedAt ? toDateTimeLocalValue(it.startedAt) : '',
                  endTime: it.endedAt ? toDateTimeLocalValue(it.endedAt) : '',
                  materialUsed: it.materialUsed || '',
                  tireCount: it.tireCount || 0,
                  notes: it.remark || '',
                  photoName: photos.length > 0 ? `${photos.length} foto terlampir` : '',
                  photoUrl: photos[0] || null,
                  previewUrls: photos,
                }
              }),
          customActivityName: isCustom ? (srvDraft.items[0]?.label || '') : '',
          customActivityDescription: isCustom ? (srvDraft.items[0]?.remark || '') : '',
          equipmentNo: isCustom ? (srvDraft.items[0]?.unitNumber || '') : '',
          startTime: isCustom && srvDraft.items[0]?.startedAt ? toDateTimeLocalValue(srvDraft.items[0].startedAt) : '',
          endTime: isCustom && srvDraft.items[0]?.endedAt ? toDateTimeLocalValue(srvDraft.items[0].endedAt) : '',
          materialUsed: isCustom ? (srvDraft.items[0]?.materialUsed || '') : '',
          notes: srvDraft.notes || '',
          photoUrls: isCustom
            ? (srvDraft.items[0]?.photos || (srvDraft.items[0]?.photoUrl ? [srvDraft.items[0].photoUrl] : []))
            : [],
          photoName:
            isCustom && (srvDraft.items[0]?.photos?.length || srvDraft.items[0]?.photoUrl)
              ? 'Foto terlampir'
              : '',
          routeTemplateId: '',
          overtimeCommandLetterId: '',
          routeSummaryRemark: '',
          routeSessionItems: [],
          manualLocation: '',
          locationName: '',
          gpsLat: '',
          gpsLng: '',
          gpsValid: false,
          boundaryStatus: 'unknown',
          boundaryMessage: '',
          photo: null,
          serverDraftSessionId: item.serverId,
        }

        const localKey = `hero:draft:activity:server-${item.serverId}`
        writeDraft(localKey, payload)
        saveActivityDraftIndexEntry(localKey, payload)

        toast.success('Draft server berhasil dimuat ✓', { id: 'load-draft-server' })
        onSelectLocalDraft(localKey)
      } catch (err: any) {
        toast.error(err.message || 'Gagal memuat draft dari server.', { id: 'load-draft-server' })
      } finally {
        setOpeningId(null)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Info Banner */}
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 via-white to-sky-50/40 p-4 shadow-[0_8px_24px_rgba(8,32,51,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#003461] text-white shadow-xs">
              <FolderOpen className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#003461]">
                Draft Tersimpan
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="border-0 bg-[#003461] text-white font-bold text-xs px-2.5 py-1">
              {unifiedDrafts.length} Draft
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                refreshLocalDrafts()
                fetchServerDrafts()
                toast.info('Menyegarkan daftar draft...')
              }}
              disabled={isLoadingServer}
              className="size-8 p-0 rounded-xl border-sky-200 text-sky-700 hover:bg-sky-100 cursor-pointer"
              title="Segarkan data draft"
            >
              <RefreshCw className={`size-3.5 ${isLoadingServer ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Search Bar */}
      {unifiedDrafts.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari draft berdasarkan judul atau tanggal..."
            className="h-11 rounded-xl pl-10 pr-4 text-xs font-semibold bg-white border-slate-200 focus-visible:ring-[#003461]"
          />
        </div>
      )}

      {/* Drafts List */}
      {filteredDrafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-3">
            <FileText className="size-7" />
          </div>
          <p className="text-sm font-extrabold text-slate-700">
            {searchQuery ? 'Tidak ada draft yang cocok' : 'Belum Ada Draft Tersimpan'}
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
            {searchQuery
              ? 'Coba gunakan kata kunci pencarian yang lain.'
              : 'Saat mengisi formulir Daily Activity, klik tombol "Save Draft" di bagian bawah untuk menyimpan progres Anda kapan saja.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrafts.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_16px_rgba(8,32,51,0.04)] transition-all hover:border-[#003461]/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {item.source === 'both' ? (
                      <Badge className="border-0 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 gap-1 flex items-center">
                        <Cloud className="size-3" />
                        Tersinkron Cloud
                      </Badge>
                    ) : item.source === 'local' ? (
                      <Badge className="border-0 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 gap-1 flex items-center">
                        <Smartphone className="size-3" />
                        Di Perangkat
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 gap-1 flex items-center">
                        <Cloud className="size-3" />
                        Di Server Cloud
                      </Badge>
                    )}
                    {item.shiftCode && (
                      <Badge className="border-0 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5">
                        Shift {item.shiftCode}
                      </Badge>
                    )}
                    <Badge className="border-0 bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 gap-1 flex items-center">
                      <Layers className="size-3" />
                      {item.itemCount} Item
                    </Badge>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug">
                    {item.title}
                  </h3>

                  {item.summaryRemark && (
                    <p className="mt-1 text-xs text-slate-600 line-clamp-1 italic">
                      &quot;{item.summaryRemark}&quot;
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-slate-400" />
                      {item.workDate || 'Tanggal belum diisi'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5 text-slate-400" />
                      {new Date(item.updatedAt).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Delete Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteDraft(item)}
                  disabled={deletingId === item.id}
                  className="size-8 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0 transition-colors"
                  title="Hapus draft"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {/* Photo Evidence Gallery */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                {item.photoUrls && item.photoUrls.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Camera className="size-3.5 text-[#003461]" />
                        Foto Evidence ({item.photoUrls.length})
                      </span>
                      {item.photoUrls.some((u) => u.startsWith('/api/uploads/') || u.startsWith('http')) ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          {item.photoUrls.filter((u) => u.startsWith('/api/uploads/') || u.startsWith('http')).length} Terunggah Cloud
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                          <Smartphone className="size-3 text-amber-600" />
                          Tersimpan di Perangkat
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                      {item.photoUrls.map((url, idx) => {
                        const isCloud = url.startsWith('/api/uploads/') || url.startsWith('http')
                        const resolved = resolveUploadUrl(url)
                        return (
                          <div
                            key={idx}
                            className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolved || url}
                              alt={`Foto evidence ${idx + 1}`}
                              className="size-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-0.5 px-1 flex items-center justify-between text-[9px] text-white font-bold">
                              <span>#{idx + 1}</span>
                              {isCloud ? (
                                <span className="text-[8px] text-emerald-300 font-extrabold">
                                  ✓ Cloud
                                </span>
                              ) : (
                                <span className="text-[8px] text-amber-300 font-extrabold">
                                  Device
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-50/70 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-200">
                    <Camera className="size-3.5 text-slate-400" />
                    <span>Belum ada foto evidence pada draft ini</span>
                  </div>
                )}
              </div>

              {/* Action: Open Draft */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleOpenDraft(item)}
                  disabled={openingId === item.id || deletingId === item.id}
                  className="h-9 px-4 rounded-xl bg-[#003461] hover:bg-[#00284d] text-white text-xs font-bold gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-70"
                >
                  {openingId === item.id ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Memuat...</span>
                    </>
                  ) : (
                    <>
                      <span>Buka &amp; Lanjutkan</span>
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
