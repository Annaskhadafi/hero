'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Check, ListFilter, Layers, Sparkles } from 'lucide-react'
import type { RouteFolder } from '@/lib/daily-activity'
import type { LibraryOption } from '@/components/mobile/mobile-daily-activity-form'

export function RouteFolderTree({
  routeFolders = [],
  availableLibraryMap,
  selectedLibraryIds,
  toggleLibrarySelection,
  toggleGroupSelection,
  librarySearch,
}: {
  routeFolders?: RouteFolder[]
  availableLibraryMap: Map<string, LibraryOption>
  selectedLibraryIds: string[]
  toggleLibrarySelection: (id: string) => void
  toggleGroupSelection?: (libraryIds: string[]) => void
  librarySearch: string
}) {
  const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set())

  const toggleRoute = (id: number) => {
    const next = new Set(expandedRoutes)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedRoutes(next)
  }

  const normalizedSearch = (librarySearch || '').toLowerCase().replace(/[^a-z0-9]/g, '')

  // 1. Calculate which library IDs belong to groups
  const groupedLibraryIdSet = useMemo(() => {
    const set = new Set<string>()
    for (const folder of routeFolders) {
      for (const group of folder.groups) {
        for (const item of group.items) {
          if (item.libraryActivityId != null) {
            set.add(String(item.libraryActivityId))
          }
        }
      }
    }
    return set
  }, [routeFolders])

  // 2. Calculate matching group folders
  const matchingRouteFolders = useMemo(() => {
    return routeFolders
      .map((route) => {
        const matchingGroups = route.groups
          .map((group) => {
            const matchingItems = group.items
              .map((i) => availableLibraryMap.get(String(i.libraryActivityId)))
              .filter((lib): lib is LibraryOption => Boolean(lib))
              .filter((lib) => {
                if (!normalizedSearch) return true
                return (
                  lib.activityCode.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch) ||
                  lib.activityName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch)
                )
              })
            return { ...group, matchingItems }
          })
          .filter((group) => (normalizedSearch ? group.matchingItems.length > 0 : true))

        return { ...route, matchingGroups }
      })
      .filter((route) => route.matchingGroups.length > 0)
  }, [routeFolders, availableLibraryMap, normalizedSearch])

  // 3. Calculate standalone / ungrouped libraries
  const standaloneLibraries = useMemo(() => {
    return Array.from(availableLibraryMap.values())
      .filter((lib) => !groupedLibraryIdSet.has(String(lib.id)))
      .filter((lib) => {
        if (!normalizedSearch) return true
        return (
          lib.activityCode.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch) ||
          lib.activityName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch)
        )
      })
      .sort((a, b) => (b.basePoints || 0) - (a.basePoints || 0))
  }, [availableLibraryMap, groupedLibraryIdSet, normalizedSearch])

  const totalMatchingCount =
    matchingRouteFolders.reduce(
      (sum, r) => sum + r.matchingGroups.reduce((gSum, g) => gSum + g.matchingItems.length, 0),
      0
    ) + standaloneLibraries.length

  if (totalMatchingCount === 0) {
    return (
      <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-[#f6fbff] px-4 py-8 text-center text-sm font-semibold text-[#486275]">
        Tidak ada kamus aktivitas yang cocok dengan pencarian &quot;{librarySearch}&quot;.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Grouped Folders */}
      {matchingRouteFolders.map((route) => {
        const isRouteExpanded = expandedRoutes.has(route.id) || Boolean(normalizedSearch)

        return (
          <div key={route.id} className="overflow-hidden rounded-2xl border border-[#eaf4fb] bg-white shadow-xs">
            <button
              type="button"
              onClick={() => toggleRoute(route.id)}
              className="flex w-full items-center justify-between bg-[#f6fbff] px-4 py-3.5 text-left font-bold text-[#003f78] hover:bg-[#eef7fd] transition"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Layers className="size-4 text-[#003f78] shrink-0" />
                <span className="truncate">{route.routeName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isRouteExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </div>
            </button>

            {isRouteExpanded && (
              <div className="space-y-2.5 p-2.5 bg-slate-50/50">
                {route.matchingGroups.map((group) => {
                  const groupLibraryIds = group.matchingItems.map((i) => `${i.id}`)
                  const selectedInGroupCount = groupLibraryIds.filter((id) => selectedLibraryIds.includes(id)).length
                  const isAllGroupSelected =
                    groupLibraryIds.length > 0 && selectedInGroupCount === groupLibraryIds.length

                  const handleBatchGroupToggle = (e: React.MouseEvent) => {
                    e.stopPropagation()
                    if (toggleGroupSelection) {
                      toggleGroupSelection(groupLibraryIds)
                    } else {
                      groupLibraryIds.forEach((id) => {
                        if (isAllGroupSelected) {
                          if (selectedLibraryIds.includes(id)) toggleLibrarySelection(id)
                        } else {
                          if (!selectedLibraryIds.includes(id)) toggleLibrarySelection(id)
                        }
                      })
                    }
                  }

                  return (
                    <div key={group.id} className="space-y-1.5 rounded-xl border border-gray-100 bg-white p-2.5 shadow-2xs">
                      <div className="flex w-full items-center justify-between px-1 text-left text-xs font-bold text-gray-700">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="truncate">{group.groupName}</span>
                          {group.matchingItems.length > 0 && (
                            <span className="text-[10px] font-bold text-[#003f78] bg-[#eaf4fb] px-1.5 py-0.5 rounded-full shrink-0">
                              {selectedInGroupCount}/{group.matchingItems.length}
                            </span>
                          )}
                        </div>
                        {group.matchingItems.length > 0 && (
                          <button
                            type="button"
                            onClick={handleBatchGroupToggle}
                            className={
                              isAllGroupSelected
                                ? 'text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-rose-100 text-rose-700 active:scale-95 transition shrink-0'
                                : 'text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-[#003f78] text-white active:scale-95 transition shadow-xs shrink-0'
                            }
                          >
                            {isAllGroupSelected ? 'Hapus Semua' : 'Pilih Group (Semua)'}
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {group.matchingItems.length === 0 ? (
                          <p className="px-2 py-1.5 text-xs italic text-gray-400">
                            Belum ada activity di group ini
                          </p>
                        ) : (
                          group.matchingItems.map((item) => {
                            const isSelected = selectedLibraryIds.includes(`${item.id}`)
                            const requirementBadges = [
                              item.requiresEquipmentNo ? 'Equipment' : null,
                              item.requiresDuration ? 'Duration' : null,
                              item.requiresTireCount ? 'Tire' : null,
                              item.requiresLocationGps ? 'GPS' : null,
                              item.requiresPhoto ? 'Photo' : null,
                            ].filter(Boolean)

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleLibrarySelection(`${item.id}`)}
                                className={
                                  isSelected
                                    ? 'flex w-full items-center justify-between rounded-xl bg-[#003f78] px-3 py-2.5 text-left shadow-[0_4px_12px_rgba(0,63,120,0.12)]'
                                    : 'flex w-full items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-2.5 text-left shadow-2xs hover:bg-slate-100/80 transition'
                                }
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={
                                        isSelected
                                          ? 'text-[11px] font-black tracking-[0.08em] text-white uppercase'
                                          : 'text-[11px] font-black tracking-[0.08em] text-[#003f78] uppercase'
                                      }
                                    >
                                      {item.activityCode}
                                    </span>
                                    {item.basePoints > 0 ? (
                                      <span
                                        className={
                                          isSelected
                                            ? 'rounded-md bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white'
                                            : 'rounded-md bg-[#eaf4fb] px-1.5 py-0.5 text-[9px] font-bold text-[#003f78]'
                                        }
                                      >
                                        +{item.basePoints} pts
                                      </span>
                                    ) : null}
                                  </div>
                                  <p
                                    className={
                                      isSelected
                                        ? 'mt-0.5 text-xs font-semibold text-white/95 truncate'
                                        : 'mt-0.5 text-xs font-semibold text-[#082033] truncate'
                                    }
                                  >
                                    {item.activityName}
                                  </p>
                                  {requirementBadges.length > 0 ? (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {requirementBadges.map((badge) => (
                                        <span
                                          key={badge}
                                          className={
                                            isSelected
                                              ? 'rounded-md bg-white/15 px-1.5 py-0.5 text-[8.5px] font-bold text-[#e9f6fd]'
                                              : 'rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[8.5px] font-bold text-[#475569]'
                                          }
                                        >
                                          {badge}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                                <span
                                  className={
                                    isSelected
                                      ? 'flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[#003f78]'
                                      : 'flex size-6 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-[#9eb6c5]'
                                  }
                                >
                                  {isSelected ? <Check className="size-3.5" /> : <ListFilter className="size-3.5" />}
                                </span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Standalone / Other Activities */}
      {standaloneLibraries.length > 0 && (
        <div className="space-y-2 pt-1">
          {matchingRouteFolders.length > 0 && (
            <div className="flex items-center gap-1.5 px-1 py-1 text-xs font-bold text-[#486275] uppercase tracking-wider">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Aktivitas Mandiri / Kamus Lainnya ({standaloneLibraries.length})</span>
            </div>
          )}

          <div className="space-y-1.5">
            {standaloneLibraries.map((item) => {
              const isSelected = selectedLibraryIds.includes(`${item.id}`)
              const requirementBadges = [
                item.requiresEquipmentNo ? 'Equipment' : null,
                item.requiresDuration ? 'Duration' : null,
                item.requiresTireCount ? 'Tire' : null,
                item.requiresLocationGps ? 'GPS' : null,
                item.requiresPhoto ? 'Photo' : null,
              ].filter(Boolean)

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleLibrarySelection(`${item.id}`)}
                  className={
                    isSelected
                      ? 'flex w-full items-center justify-between rounded-xl bg-[#003f78] px-3.5 py-3 text-left shadow-[0_4px_14px_rgba(0,63,120,0.14)]'
                      : 'flex w-full items-center justify-between rounded-xl bg-white border border-slate-200/80 px-3.5 py-3 text-left shadow-2xs hover:bg-slate-50 transition'
                  }
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          isSelected
                            ? 'text-[11px] font-black tracking-[0.08em] text-white uppercase'
                            : 'text-[11px] font-black tracking-[0.08em] text-[#003f78] uppercase'
                        }
                      >
                        {item.activityCode}
                      </span>
                      {item.basePoints > 0 ? (
                        <span
                          className={
                            isSelected
                              ? 'rounded-md bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white'
                              : 'rounded-md bg-[#eaf4fb] px-1.5 py-0.5 text-[9px] font-bold text-[#003f78]'
                          }
                        >
                          +{item.basePoints} pts
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={
                        isSelected
                          ? 'mt-0.5 text-xs font-bold text-white/95 truncate'
                          : 'mt-0.5 text-xs font-bold text-[#082033] truncate'
                      }
                    >
                      {item.activityName}
                    </p>
                    {requirementBadges.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {requirementBadges.map((badge) => (
                          <span
                            key={badge}
                            className={
                              isSelected
                                ? 'rounded-md bg-white/15 px-1.5 py-0.5 text-[8.5px] font-bold text-[#e9f6fd]'
                                : 'rounded-md bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-bold text-[#475569]'
                            }
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span
                    className={
                      isSelected
                        ? 'flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-[#003f78]'
                        : 'flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#9eb6c5]'
                    }
                  >
                    {isSelected ? <Check className="size-4" /> : <ListFilter className="size-4" />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
