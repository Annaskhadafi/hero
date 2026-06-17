'use client'

import { useState, Fragment } from "react"
import { ChevronDown, ChevronRight, CalendarClock, User, BadgeCheck, AlertTriangle, FileSpreadsheet } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminStatusBadge } from "@/components/admin-status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SioRow {
  id: number
  employeeId: number
  employeeName: string | null
  employeeSn: string | null
  role: string | null
  department: string | null
  section: string | null
  certType: string
  certNumber: string | null
  certName: string
  issuingBody: string | null
  certDate: Date | string | null
  expiryDate: Date | string | null
  status: string
  notes: string | null
  lastSyncFrom: string | null
}

interface SioCertificationTableProps {
  rows: SioRow[]
  onEdit: (row: SioRow) => void
  onDelete: (row: SioRow) => void
}

function daysUntil(date: Date | string | null): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SioCertificationTable({ rows, onEdit, onDelete }: SioCertificationTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const grouped = groupByEmployee(rows)
  const groupKeys = Object.keys(grouped)

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="rounded-xl border-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-container-low/50">
            <TableHead className="w-8" />
            <TableHead>Nama</TableHead>
            <TableHead>SN</TableHead>
            <TableHead>Dept / Seksi</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Sertifikat</TableHead>
            <TableHead>Masa Berlaku</TableHead>
            <TableHead>Sisa Hari</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupKeys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-sm">
                Belum ada data sertifikasi SIO/POP/POM.
              </TableCell>
            </TableRow>
          ) : (
            groupKeys.map((key) => {
              const group = grouped[key]
              const emp = group[0]
              const isExpanded = expanded.has(key)
              const statusSummary = summarizeStatus(group)

              return (
                <Fragment key={key}>
                  <TableRow
                    className="cursor-pointer hover:bg-surface-container-low/30"
                    onClick={() => toggleGroup(key)}
                  >
                    <TableCell>
                      {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-primary" />
                        {emp.employeeName || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{emp.employeeSn || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[emp.department, emp.section].filter(Boolean).join(' / ') || '-'}
                    </TableCell>
                    <TableCell colSpan={3} className="text-xs text-muted-foreground">
                      {group.length} sertifikat
                    </TableCell>
                    <TableCell colSpan={2}>
                      <div className="flex gap-1">
                        {statusSummary.valid > 0 && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">{statusSummary.valid} Aktif</Badge>
                        )}
                        {statusSummary.expiring > 0 && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px]">{statusSummary.expiring} Segera</Badge>
                        )}
                        {statusSummary.expired > 0 && (
                          <Badge className="bg-rose-500/10 text-rose-600 border-0 text-[10px]">{statusSummary.expired} Expired</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  {isExpanded && group.map((row) => {
                    const days = daysUntil(row.expiryDate)
                    return (
                      <TableRow key={row.id} className="bg-surface-container-low/20">
                        <TableCell />
                        <TableCell colSpan={3} className="text-xs pl-10">
                          <span className="font-semibold">{row.certName}</span>
                          {row.certNumber && <span className="text-muted-foreground ml-2">#{row.certNumber}</span>}
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {[row.certType, row.issuingBody].filter(Boolean).join(' • ')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] border-muted">
                            {row.certType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(row.certDate)}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.expiryDate)}</TableCell>
                        <TableCell className="text-xs">
                          {days !== null ? (
                            <span className={days <= 0 ? 'text-rose-600 font-bold' : days <= 30 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                              {days <= 0 ? `${Math.abs(days)} hr lewat` : `${days} hr`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="size-7" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(row) }}>
                              <FileSpreadsheet className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7 text-rose-500 hover:text-rose-700" title="Hapus" onClick={(e) => { e.stopPropagation(); onDelete(row) }}>
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function groupByEmployee(rows: SioRow[]): Record<string, SioRow[]> {
  const map: Record<string, SioRow[]> = {}
  for (const r of rows) {
    const key = `${r.employeeId}`
    if (!map[key]) map[key] = []
    map[key].push(r)
  }
  return map
}

function summarizeStatus(group: SioRow[]) {
  let valid = 0, expiring = 0, expired = 0
  for (const r of group) {
    if (r.status === 'expired') expired++
    else if (r.status === 'expiring_soon') expiring++
    else valid++
  }
  return { valid, expiring, expired }
}
