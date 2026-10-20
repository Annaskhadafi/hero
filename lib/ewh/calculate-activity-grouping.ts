/**
 * Activity Grouping Calculation Engine
 * 
 * Mengelompokkan item aktivitas harian berdasarkan snapshotGroupName
 * dan snapshotLabel, serta menghitung agregasi jumlah ban (tireCount)
 * dan jumlah unit (unitNumber).
 */

export interface RawActivitySessionItem {
  sessionId: number
  snapshotGroupName: string | null
  snapshotLabel: string
  tireCount: number | null
  unitNumber: string | null
  actualPoints?: number | null
  isChecked?: boolean | null
}

export interface ActivityDetail {
  activityLabel: string
  tireCount: number
  unitCount: number
  itemCount: number
  units: string[]
}

export interface ActivityGroupSummary {
  groupName: string
  totalTireCount: number
  totalUnitCount: number
  itemCount: number
  units: string[]
  activities: ActivityDetail[]
}

export interface ActivityGroupingResult {
  groups: ActivityGroupSummary[]
  overall: {
    totalGroups: number
    totalTireCount: number
    totalUnitCount: number
    totalItems: number
    allUnits: string[]
  }
}

/**
 * Normalisasi nama group (fallback ke 'Lainnya' jika kosong)
 */
export function normalizeGroupName(rawName: string | null | undefined): string {
  const trimmed = (rawName ?? '').trim()
  return trimmed.length > 0 ? trimmed : 'Lainnya'
}

/**
 * Normalisasi nomor unit (menghapus spasi, case-insensitive check tapi simpan uppercase)
 */
export function cleanUnitNumber(rawUnit: string | null | undefined): string | null {
  if (!rawUnit) return null
  const cleaned = rawUnit.trim().toUpperCase()
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Menghitung agregasi grouping aktivitas dari raw items
 */
export function calculateActivityGrouping(
  items: RawActivitySessionItem[]
): ActivityGroupingResult {
  const groupMap = new Map<
    string,
    {
      groupName: string
      totalTireCount: number
      unitSet: Set<string>
      itemCount: number
      activityMap: Map<
        string,
        {
          activityLabel: string
          tireCount: number
          unitSet: Set<string>
          itemCount: number
        }
      >
    }
  >()

  const globalUnitSet = new Set<string>()
  let globalTireCount = 0
  let globalItemCount = 0

  for (const item of items) {
    const groupName = normalizeGroupName(item.snapshotGroupName)
    const label = (item.snapshotLabel || 'Aktivitas Tanpa Label').trim()
    const tires = Math.max(0, Number(item.tireCount) || 0)
    const unit = cleanUnitNumber(item.unitNumber)

    globalTireCount += tires
    globalItemCount += 1
    if (unit) globalUnitSet.add(unit)

    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, {
        groupName,
        totalTireCount: 0,
        unitSet: new Set<string>(),
        itemCount: 0,
        activityMap: new Map(),
      })
    }

    const group = groupMap.get(groupName)!
    group.totalTireCount += tires
    group.itemCount += 1
    if (unit) group.unitSet.add(unit)

    if (!group.activityMap.has(label)) {
      group.activityMap.set(label, {
        activityLabel: label,
        tireCount: 0,
        unitSet: new Set<string>(),
        itemCount: 0,
      })
    }

    const act = group.activityMap.get(label)!
    act.tireCount += tires
    act.itemCount += 1
    if (unit) act.unitSet.add(unit)
  }

  // Transform ke response format terurut (urutan total tireCount desc, lalu totalUnitCount desc)
  const groups: ActivityGroupSummary[] = Array.from(groupMap.values()).map((g) => {
    const activities: ActivityDetail[] = Array.from(g.activityMap.values())
      .map((a) => ({
        activityLabel: a.activityLabel,
        tireCount: a.tireCount,
        unitCount: a.unitSet.size,
        itemCount: a.itemCount,
        units: Array.from(a.unitSet).sort(),
      }))
      .sort((a, b) => b.tireCount - a.tireCount || b.unitCount - a.unitCount)

    return {
      groupName: g.groupName,
      totalTireCount: g.totalTireCount,
      totalUnitCount: g.unitSet.size,
      itemCount: g.itemCount,
      units: Array.from(g.unitSet).sort(),
      activities,
    }
  }).sort((a, b) => b.totalTireCount - a.totalTireCount || b.totalUnitCount - a.totalUnitCount)

  return {
    groups,
    overall: {
      totalGroups: groups.length,
      totalTireCount: globalTireCount,
      totalUnitCount: globalUnitSet.size,
      totalItems: globalItemCount,
      allUnits: Array.from(globalUnitSet).sort(),
    },
  }
}
