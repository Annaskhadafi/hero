import { useState } from 'react'
import { ChevronDown, ChevronRight, Check, ListFilter } from 'lucide-react'
import type { RouteFolder } from '@/lib/daily-activity'
import type { LibraryOption } from '@/components/mobile/mobile-daily-activity-form'

export function RouteFolderTree({
  routeFolders,
  availableLibraryMap,
  selectedLibraryIds,
  toggleLibrarySelection,
  toggleGroupSelection,
  librarySearch,
}: {
  routeFolders: RouteFolder[]
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

  return (
    <div className="space-y-2">
      {routeFolders.map((route) => {
        const matchingGroups = route.groups.map(group => {
          const matchingItems = group.items.map(i => availableLibraryMap.get(String(i.libraryActivityId))).filter(Boolean)
            .filter(lib => {
              if (!normalizedSearch) return true
              return lib!.activityCode.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch) ||
                     lib!.activityName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch)
            }) as LibraryOption[]
          return { ...group, matchingItems }
        }).filter(group => (normalizedSearch ? group.matchingItems.length > 0 : true))

        if (matchingGroups.length === 0) return null
        const isRouteExpanded = expandedRoutes.has(route.id) || !!normalizedSearch

        return (
          <div key={route.id} className="overflow-hidden rounded-2xl border border-[#eaf4fb] bg-white">
            <button
              type="button"
              onClick={() => toggleRoute(route.id)}
              className="flex w-full items-center justify-between bg-[#f6fbff] px-4 py-3 text-left font-bold text-[#003f78]"
            >
              <div className="flex items-center gap-2">
                {isRouteExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <span>{route.routeName}</span>
              </div>
            </button>

            {isRouteExpanded && (
              <div className="space-y-2.5 p-2">
                {matchingGroups.map(group => {
                  const groupLibraryIds = group.matchingItems.map(i => `${i.id}`)
                  const selectedInGroupCount = groupLibraryIds.filter(id => selectedLibraryIds.includes(id)).length
                  const isAllGroupSelected = groupLibraryIds.length > 0 && selectedInGroupCount === groupLibraryIds.length

                  const handleBatchGroupToggle = (e: React.MouseEvent) => {
                    e.stopPropagation()
                    if (toggleGroupSelection) {
                      toggleGroupSelection(groupLibraryIds)
                    } else {
                      groupLibraryIds.forEach(id => {
                        if (isAllGroupSelected) {
                          if (selectedLibraryIds.includes(id)) toggleLibrarySelection(id)
                        } else {
                          if (!selectedLibraryIds.includes(id)) toggleLibrarySelection(id)
                        }
                      })
                    }
                  }

                  return (
                    <div key={group.id} className="space-y-1.5 rounded-xl border border-gray-100 bg-gray-50/60 p-2.5">
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
                                ? "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-rose-100 text-rose-700 active:scale-95 transition shrink-0"
                                : "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-[#003f78] text-white active:scale-95 transition shadow-xs shrink-0"
                            }
                          >
                            {isAllGroupSelected ? "Hapus Semua" : "Pilih Group (Semua)"}
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 pt-1">
                        {group.matchingItems.length === 0 ? (
                          <p className="px-2 py-1.5 text-xs italic text-gray-400">
                            Belum ada activity di group ini
                          </p>
                        ) : (
                          group.matchingItems.map((item) => {
                            const isSelected = selectedLibraryIds.includes(`${item.id}`)
                            const requirementBadges = [
                              item.requiresEquipmentNo ? 'Equipment' : null,
                              item.requiresTireCount ? 'Tire' : null,
                              item.requiresLocationGps ? 'GPS' : null,
                            ].filter(Boolean)

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleLibrarySelection(`${item.id}`)}
                                className={
                                  isSelected
                                    ? 'flex w-full items-center justify-between rounded-xl bg-[#003f78] px-3 py-2 text-left shadow-[0_4px_12px_rgba(0,63,120,0.12)]'
                                    : 'flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left shadow-[0_2px_8px_rgba(8,32,51,0.04)]'
                                }
                              >
                                <div>
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
                                        ? 'mt-0.5 text-xs font-semibold text-white/90'
                                        : 'mt-0.5 text-xs font-semibold text-[#082033]'
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
                                              ? 'rounded-md bg-[#ffffff1a] px-1.5 py-0.5 text-[9px] font-bold text-[#e9f6fd]'
                                              : 'rounded-md bg-[#f1f5f9] px-1.5 py-0.5 text-[9px] font-bold text-[#64748b]'
                                          }
                                        >
                                          + {badge}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                                <span
                                  className={
                                    isSelected
                                      ? 'flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[#003f78]'
                                      : 'flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[#9eb6c5]'
                                  }
                                >
                                  {isSelected ? (
                                    <Check className="size-3" />
                                  ) : (
                                    <ListFilter className="size-3" />
                                  )}
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
    </div>
  )
}
