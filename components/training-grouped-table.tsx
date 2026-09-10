'use client'

import { useState, Fragment } from "react"
import {
  ChevronDown,
  ChevronRight,
  CalendarClock,
  History,
  User,
  BookOpen,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminStatusBadge } from "@/components/admin-status-badge"
import { TrainingRowActions } from "@/components/operational-crud-panels"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface TrainingRow {
  id: number
  employeeId: number
  employeeName: string
  employeeSn: string | null
  role: string | null
  department: string | null
  section: string | null
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
  canEdit?: boolean
  canDelete?: boolean
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
  canEdit = true,
  canDelete = true,
}: TrainingGroupedTableProps) {
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({})
  const referenceDate = startOfDayInAppTimeZone(new Date())

  // ── Group by employee ─────────────────────────────────────────────────────
  const employeeGroups: Record<
    string,
    {
      employeeId: number
      employeeName: string
      employeeSn: string | null
      role: string | null
      department: string | null
      records: TrainingRow[]
    }
  > = {}

  for (const row of trainingRecords) {
    const key = `${row.employeeId}`
    if (!employeeGroups[key]) {
      employeeGroups[key] = {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        employeeSn: row.employeeSn,
        role: row.role,
        department: row.department,
        records: [],
      }
    }
    employeeGroups[key].records.push(row)
  }

  // Sort records within each employee: newest year first
  for (const key in employeeGroups) {
    employeeGroups[key].records.sort((a, b) => Number(b.completedYear) - Number(a.completedYear))
  }

  // Sort employees alphabetically by name
  const sortedGroups = Object.values(employeeGroups || {}).sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  )

  const toggleEmployee = (empId: string) => {
    setExpandedEmployees((prev) => ({ ...prev, [empId]: !prev[empId] }))
  }

  // Helper: status summary for an employee
  function getStatusSummary(records: TrainingRow[]) {
    let valid = 0
    let expiringSoon = 0
    let expired = 0
    for (const r of records) {
      if (!r.expiresAt) { valid++; continue }
      const days = daysUntilExpiry(r.expiresAt, referenceDate)
      if (days == null) { valid++; continue }
      if (days < 0) expired++
      else if (days <= 30) expiringSoon++
      else valid++
    }
    return { valid, expiringSoon, expired }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-[280px]">Karyawan</TableHead>
          <TableHead className="min-w-[160px]">Departemen</TableHead>
          <TableHead className="min-w-[100px] text-center">Total</TableHead>
          <TableHead className="min-w-[280px]">Ringkasan Status</TableHead>
          <TableHead className="min-w-[60px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedGroups.length > 0 ? (
          sortedGroups.map((group) => {
            const key = `${group.employeeId}`
            const isExpanded = expandedEmployees[key]
            const { valid, expiringSoon, expired } = getStatusSummary(group.records)

            return (
              <Fragment key={`emp-${key}`}>
                {/* ── Employee Summary Row ──────────────────────────────── */}
                <TableRow
                  className="cursor-pointer hover:bg-surface-container-low/70 transition-colors"
                  onClick={() => toggleEmployee(key)}
                >
                  <TableCell className="align-middle py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">
                          {group.employeeName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group.employeeSn || "SN –"} • {group.role || "-"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-middle text-sm text-foreground">
                    {group.department || "–"}
                  </TableCell>
                  <TableCell className="align-middle text-center">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground">
                      <BookOpen className="size-4 text-primary" />
                      {group.records.length}
                    </span>
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {valid > 0 && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-0 hover:bg-emerald-500/10 text-[10px] font-bold px-2 py-0.5 gap-1">
                          <BadgeCheck className="size-3" />
                          {valid} Valid
                        </Badge>
                      )}
                      {expiringSoon > 0 && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-0 hover:bg-amber-500/10 text-[10px] font-bold px-2 py-0.5 gap-1">
                          <CalendarClock className="size-3" />
                          {expiringSoon} Segera Exp
                        </Badge>
                      )}
                      {expired > 0 && (
                        <Badge className="bg-rose-500/10 text-rose-600 border-0 hover:bg-rose-500/10 text-[10px] font-bold px-2 py-0.5 gap-1">
                          <AlertTriangle className="size-3" />
                          {expired} Expired
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-middle text-right pr-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-lg hover:bg-surface-container-high/60"
                      onClick={(e) => { e.stopPropagation(); toggleEmployee(key) }}
                    >
                      {isExpanded
                        ? <ChevronDown className="size-4 text-muted-foreground" />
                        : <ChevronRight className="size-4 text-muted-foreground" />}
                    </Button>
                  </TableCell>
                </TableRow>

                {/* ── Detail Rows (per training) ────────────────────────── */}
                {isExpanded && (
                  <>
                    {/* Sub-header */}
                    <TableRow className="bg-surface-container-low/30 hover:bg-surface-container-low/30">
                      <TableCell
                        colSpan={5}
                        className="py-1.5 pl-16 pr-4"
                      >
                        <div className="grid grid-cols-[1fr_160px_90px_160px_120px_160px_auto] gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span>Nama Pelatihan</span>
                          <span>Provider</span>
                          <span>Tahun</span>
                          <span>Expiry</span>
                          <span>Status</span>
                          <span>Sisa Hari</span>
                          <span />
                        </div>
                      </TableCell>
                    </TableRow>

                    {group.records.map((rec, idx) => {
                      const days = daysUntilExpiry(rec.expiresAt, referenceDate)
                      const isLastRow = idx === group.records.length - 1
                      return (
                        <TableRow
                          key={`rec-${rec.id}-${idx}`}
                          className={`bg-surface-container-lowest/50 hover:bg-surface-container-low/40 transition-colors ${
                            !isLastRow ? "border-b border-dashed border-border/40" : "border-b border-border/70"
                          }`}
                        >
                          <TableCell colSpan={5} className="py-2.5 pl-16 pr-4">
                            <div className="grid grid-cols-[1fr_160px_90px_160px_120px_160px_auto] gap-2 items-center">
                              {/* Training Name */}
                              <div className="flex items-start gap-2 min-w-0">
                                <History className="size-3.5 mt-0.5 text-muted-foreground/50 shrink-0" />
                                <span className="text-sm font-semibold text-foreground leading-tight break-words whitespace-normal">
                                  {rec.trainingName}
                                </span>
                              </div>

                              {/* Provider */}
                              <span className="text-xs text-muted-foreground truncate">
                                {rec.provider}
                              </span>

                              {/* Year */}
                              <span className="text-sm font-bold text-foreground">
                                {rec.completedYear}
                              </span>

                              {/* Expiry Date */}
                              <span className="text-xs text-muted-foreground">
                                {formatOptionalDate(rec.expiresAt)}
                              </span>

                              {/* Status */}
                              <div>
                                <AdminStatusBadge value={rec.status} />
                              </div>

                              {/* Days remaining */}
                              <span
                                className={`text-xs font-semibold ${
                                  days == null
                                    ? "text-muted-foreground"
                                    : days < 0
                                    ? "text-rose-600"
                                    : days <= 30
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {days == null
                                  ? "Tidak ada"
                                  : days < 0
                                  ? `${Math.abs(days)} hr lewat`
                                  : `${days} hr lagi`}
                              </span>

                              {/* Actions */}
                              <div>
                                <TrainingRowActions
                                  row={rec}
                                  employees={employees}
                                  categoryOptions={categoryOptions}
                                  canEdit={canEdit}
                                  canDelete={canDelete}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </>
                )}
              </Fragment>
            )
          })
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              Tidak ada training record sesuai kombinasi filter saat ini.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
