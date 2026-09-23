import React from 'react'
import { cn } from '@/lib/utils'
import {
  EQUIPMENT_CHECKLIST_PER_TYPE,
  getPermitSubTypes,
  getActivePermitTypeKeys,
  getPtwColumnKeys,
  normalizePermitType,
  isItemChecked,
} from '@/lib/ptw-helpers'

export interface PtwColumnDef {
  key: string
  permitTypeKey: string
  title: string
  headerBg: string
  headerTextColor: string
}

export const PTW_COLUMNS: PtwColumnDef[] = [
  {
    key: 'HOT',
    permitTypeKey: 'Hot Work Permit',
    title: 'HOT WORK PERMIT',
    headerBg: 'bg-[#ef4444]',
    headerTextColor: 'text-white',
  },
  {
    key: 'CONFINED',
    permitTypeKey: 'Confined Space Permit',
    title: 'CONFINED SPACE PERMIT',
    headerBg: 'bg-[#eab308]',
    headerTextColor: 'text-slate-900',
  },
  {
    key: 'DIGGING',
    permitTypeKey: 'Digging Permit',
    title: 'DIGGING PERMIT',
    headerBg: 'bg-[#84cc16]',
    headerTextColor: 'text-slate-900',
  },
  {
    key: 'COLD',
    permitTypeKey: 'Cold Permit',
    title: 'COLD WORK PERMIT',
    headerBg: 'bg-[#06b6d4]',
    headerTextColor: 'text-white',
  },
  {
    key: 'ELECTRICAL',
    permitTypeKey: 'Electrical/Mechanical',
    title: 'ELECTRICAL / MECHANICAL',
    headerBg: 'bg-[#3b82f6]',
    headerTextColor: 'text-white',
  },
]

export interface PtwChecklistTableProps {
  permitType?: string
  subTypes?: Record<string, string[]> | null
  checkedEquipment?: string[]
  columnsToShow?: string[] // Optional filter: ['HOT', 'CONFINED', ...]
  showAllColumns?: boolean // If true, forces all 5 columns to be rendered
  className?: string
}

export function PtwChecklistTable({
  permitType = '',
  subTypes,
  checkedEquipment = [],
  columnsToShow,
  showAllColumns = false,
  className,
}: PtwChecklistTableProps) {
  const activePermitKeys = React.useMemo(() => getActivePermitTypeKeys(permitType), [permitType])

  const activeCols = React.useMemo(() => {
    if (showAllColumns) return PTW_COLUMNS

    if (columnsToShow && columnsToShow.length > 0) {
      const filtered = PTW_COLUMNS.filter((col) => columnsToShow.includes(col.key))
      if (filtered.length > 0) return filtered
    }

    const colKeys = getPtwColumnKeys(permitType)
    const filtered = PTW_COLUMNS.filter((col) => colKeys.includes(col.key))
    return filtered.length > 0 ? filtered : [PTW_COLUMNS.find((c) => c.key === 'COLD') || PTW_COLUMNS[0]]
  }, [showAllColumns, columnsToShow, permitType])

  const isCheckedEquipmentProvided = checkedEquipment && checkedEquipment.length > 0

  return (
    <div className={cn('w-full overflow-x-auto border-b-2 border-slate-900', className)}>
      <table className="w-full table-fixed border-collapse text-[7pt] bg-white">
        <colgroup>
          {activeCols.map((col) => (
            <React.Fragment key={col.key}>
              <col style={{ width: `${(100 / activeCols.length) * 0.7}%` }} />
              <col style={{ width: `${(100 / activeCols.length) * 0.15}%` }} />
              <col style={{ width: `${(100 / activeCols.length) * 0.15}%` }} />
            </React.Fragment>
          ))}
        </colgroup>
        <thead>
          {/* Row 1: Header Titles with Permit Background Colors */}
          <tr>
            {activeCols.map((col, cIdx) => (
              <th
                key={col.key}
                colSpan={3}
                className={cn(
                  'py-1 px-1 text-center font-bold uppercase text-[7.5pt] border-b border-slate-900',
                  col.headerBg,
                  col.headerTextColor,
                  cIdx > 0 ? 'border-l-2 border-slate-900' : ''
                )}
              >
                {col.title}
              </th>
            ))}
          </tr>

          {/* Row 2: Sub-types list */}
          <tr>
            {activeCols.map((col, cIdx) => {
              const items = getPermitSubTypes(col.permitTypeKey, subTypes)
              return (
                <td
                  key={col.key}
                  colSpan={3}
                  className={cn(
                    'p-1 border-b border-slate-900 align-top text-[6.5pt] bg-white leading-tight',
                    cIdx > 0 ? 'border-l-2 border-slate-900' : ''
                  )}
                >
                  <div className={cn("grid gap-x-1.5 gap-y-0.5", items.length > 3 ? "grid-cols-2" : "grid-cols-1")}>
                    {items.map((st) => (
                      <div key={st} className="truncate">• {st}</div>
                    ))}
                  </div>
                </td>
              )
            })}
          </tr>

          {/* Row 3: Instruction Banner */}
          <tr>
            {activeCols.map((col, cIdx) => (
              <td
                key={col.key}
                colSpan={3}
                className={cn(
                  'p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight align-middle',
                  cIdx > 0 ? 'border-l-2 border-slate-900' : ''
                )}
              >
                Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
              </td>
            ))}
          </tr>

          {/* Row 4: Column Checklist Subheaders (Item Check, Ya, Tidak) */}
          <tr className="bg-slate-100 text-[6.5pt] text-center font-bold border-b border-slate-900">
            {activeCols.map((col, cIdx) => (
              <React.Fragment key={col.key}>
                <th className={cn('border-r border-slate-300 px-1 py-0.5 text-left', cIdx > 0 ? 'border-l-2 border-slate-900' : '')}>
                  Item Check
                </th>
                <th className="border-r border-slate-300 px-1 py-0.5 w-[15%]">Ya</th>
                <th className="px-1 py-0.5 w-[15%]">Tidak</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 7 Data Rows - perfectly aligned horizontally across all columns */}
          {Array.from({ length: 7 }).map((_, rIdx) => (
            <tr key={`row-${rIdx}`} className="border-b border-slate-300 last:border-b-0">
              {activeCols.map((col, cIdx) => {
                const normColKey = normalizePermitType(col.permitTypeKey)
                const items = EQUIPMENT_CHECKLIST_PER_TYPE[normColKey]?.items || EQUIPMENT_CHECKLIST_PER_TYPE[col.permitTypeKey]?.items || []
                const item = items[rIdx]
                const isColActive = activePermitKeys.some(
                  (k) => normalizePermitType(k).toLowerCase() === normColKey.toLowerCase()
                )
                const isChecked = item
                  ? isCheckedEquipmentProvided
                    ? isItemChecked(item.label, checkedEquipment)
                    : isColActive
                  : false

                if (!item) {
                  return (
                    <React.Fragment key={`${col.key}-${rIdx}`}>
                      <td
                        className={cn(
                          'border-r border-slate-300 px-1 py-0.5 text-transparent select-none',
                          cIdx > 0 ? 'border-l-2 border-slate-900' : ''
                        )}
                      >
                        &nbsp;
                      </td>
                      <td className="border-r border-slate-300 px-1 py-0.5 text-center text-transparent select-none">
                        &nbsp;
                      </td>
                      <td className="px-1 py-0.5 text-center text-transparent select-none">
                        &nbsp;
                      </td>
                    </React.Fragment>
                  )
                }

                return (
                  <React.Fragment key={`${col.key}-${rIdx}`}>
                    <td
                      className={cn(
                        'border-r border-slate-300 px-1 py-0.5 leading-tight text-[7pt] text-slate-900 font-normal align-middle',
                        cIdx > 0 ? 'border-l-2 border-slate-900' : ''
                      )}
                    >
                      {item.label}
                    </td>
                    <td className="border-r border-slate-300 px-1 py-0.5 text-center text-[7.5pt] font-bold align-middle">
                      {isChecked ? '☑' : '☐'}
                    </td>
                    <td className="px-1 py-0.5 text-center text-[7.5pt] font-bold align-middle">
                      {!isChecked ? '☑' : '☐'}
                    </td>
                  </React.Fragment>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
