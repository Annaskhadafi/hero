'use client'

import { useState, Fragment } from "react"
import { ChevronDown, ChevronRight, CalendarClock, History } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminStatusBadge } from "@/components/admin-status-badge"
import { TrainingRowActions } from "@/components/operational-crud-panels"
import { Button } from "@/components/ui/button"

interface TrainingRow {
  id: number
  employeeId: number
  employeeName: string
  employeeSn: string | null
  role: string | null
  department: string | null
  trainingName: string
  provider: string
  completedYear: number
  expiresAt: Date | string | null
  status: string
}

interface EmployeeOption {
  id: number
  name: string
  role: string
  email: string
  siteId: number
}

interface TrainingGroupedTableProps {
  trainingRecords: TrainingRow[]
  employees: EmployeeOption[]
  categoryOptions?: any
}

const APP_TIME_ZONE = "Asia/Makassar"

function formatOptionalDate(value: Date | string | null) {
  if (!value) return "Tanpa expiry"
  const dateObj = value instanceof Date ? value : new Date(value)
  return dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  })
}

function daysUntilExpiry(value: Date | string | null, referenceDate: Date) {
  if (!value) return null
  const dateObj = value instanceof Date ? value : new Date(value)
  return Math.ceil((dateObj.getTime() - referenceDate.getTime()) / (24 * 60 * 60 * 1000))
}

function startOfDayInAppTimeZone(reference: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference)

  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"

  return new Date(`${year}-${month}-${day}T00:00:00+08:00`)
}

export function TrainingGroupedTable({
  trainingRecords,
  employees,
  categoryOptions,
}: TrainingGroupedTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const referenceDate = startOfDayInAppTimeZone(new Date())

  // Group training records by employeeId + trainingName
  const groups: Record<string, { latest: TrainingRow; history: TrainingRow[] }> = {}
  
  for (const row of trainingRecords) {
    const key = `${row.employeeId}-${row.trainingName.toLowerCase().trim()}`
    if (!groups[key]) {
      groups[key] = { latest: row, history: [] }
    } else {
      const currentLatest = groups[key].latest
      const rowYear = Number(row.completedYear)
      const latestYear = Number(currentLatest.completedYear)
      
      if (rowYear > latestYear) {
        groups[key].history.push(currentLatest)
        groups[key].latest = row
      } else {
        groups[key].history.push(row)
      }
    }
  }

  // Sort history for each group descending by completedYear
  for (const key in groups) {
    groups[key].history.sort((a, b) => Number(b.completedYear) - Number(a.completedYear))
  }

  const groupedRows = Object.values(groups).sort((a, b) => {
    const nameComp = a.latest.employeeName.localeCompare(b.latest.employeeName)
    if (nameComp !== 0) return nameComp
    return a.latest.trainingName.localeCompare(b.latest.trainingName)
  })

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-[240px]">Employee</TableHead>
          <TableHead className="min-w-[170px]">Department</TableHead>
          <TableHead className="min-w-[220px]">Training</TableHead>
          <TableHead className="min-w-[160px]">Provider</TableHead>
          <TableHead className="min-w-[110px]">Year</TableHead>
          <TableHead className="min-w-[160px]">Expiry</TableHead>
          <TableHead className="min-w-[120px]">Status</TableHead>
          <TableHead className="min-w-[240px]">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupedRows.length > 0 ? (
          groupedRows.map((group) => {
            const key = `${group.latest.employeeId}-${group.latest.trainingName.toLowerCase().trim()}`
            const isExpanded = expandedGroups[key]
            const hasHistory = group.history.length > 0
            const expiryDays = daysUntilExpiry(group.latest.expiresAt, referenceDate)

            return (
              <Fragment key={`group-${key}`}>
                {/* Parent Row (Latest Training Record) */}
                <TableRow className="hover:bg-surface-container-low/70">
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{group.latest.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.latest.employeeSn || "SN belum ada"} • {group.latest.role || "-"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-sm text-foreground">{group.latest.department}</TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-start gap-1.5">
                      {hasHistory && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 rounded-md p-0 hover:bg-surface-container-high/60 shrink-0 mt-0.5"
                          onClick={() => toggleGroup(key)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-foreground leading-tight">{group.latest.trainingName}</p>
                        {hasHistory && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                            <History className="size-3" />
                            {group.history.length} Tahun Lalu
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-sm text-foreground">{group.latest.provider}</TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{group.latest.completedYear}</p>
                      <p className="text-xs text-muted-foreground">Tahun terakhir</p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <p className="text-sm text-foreground">{formatOptionalDate(group.latest.expiresAt)}</p>
                      <p className="text-xs text-muted-foreground">
                        {expiryDays == null
                          ? "Tidak ada expiry"
                          : expiryDays >= 0
                            ? `${expiryDays} hari lagi`
                            : `${Math.abs(expiryDays)} hari lewat`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <AdminStatusBadge value={group.latest.status} />
                  </TableCell>
                  <TableCell className="align-top">
                    <TrainingRowActions
                      row={group.latest}
                      employees={employees}
                      categoryOptions={categoryOptions}
                    />
                  </TableCell>
                </TableRow>

                {/* Historical Nested Rows */}
                {isExpanded &&
                  group.history.map((histRow, idx) => {
                    const histExpiryDays = daysUntilExpiry(histRow.expiresAt, referenceDate)
                    return (
                      <TableRow
                        key={`history-${key}-${histRow.id}-${idx}`}
                        className="bg-transparent hover:bg-surface-container-lowest/50 border-l-2 border-primary/20"
                      >
                        <TableCell className="align-top pl-10 text-muted-foreground text-xs font-medium">
                          <span className="flex items-center gap-1.5">
                            <History className="size-3 text-muted-foreground/60" />
                            Riwayat Sebelumnya
                          </span>
                        </TableCell>
                        <TableCell className="align-top text-xs text-muted-foreground">{histRow.department}</TableCell>
                        <TableCell className="align-top text-xs font-semibold text-muted-foreground pl-6">
                          {histRow.trainingName}
                        </TableCell>
                        <TableCell className="align-top text-xs text-muted-foreground">{histRow.provider}</TableCell>
                        <TableCell className="align-top">
                          <p className="text-xs font-semibold text-muted-foreground">{histRow.completedYear}</p>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">{formatOptionalDate(histRow.expiresAt)}</p>
                            <p className="text-[10px] text-muted-foreground/80">
                              {histExpiryDays == null
                                ? ""
                                : histExpiryDays >= 0
                                  ? `${histExpiryDays} hari lagi`
                                  : `${Math.abs(histExpiryDays)} hari lewat`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <AdminStatusBadge value={histRow.status} />
                        </TableCell>
                        <TableCell className="align-top">
                          <TrainingRowActions
                            row={histRow}
                            employees={employees}
                            categoryOptions={categoryOptions}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </Fragment>
            )
          })
        ) : (
          <TableRow>
            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
              Tidak ada training record sesuai kombinasi filter saat ini.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
