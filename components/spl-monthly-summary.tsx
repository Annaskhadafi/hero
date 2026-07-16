'use client'

import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MinimalTableShell, exportRowsToFile } from '@/components/ui/minimal-table-shell'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type SummaryParticipant = {
  employeeId: number
  employeeName: string
  category: string
  shiftCode: string
  rosterType: string
  workStreakDays: number
  overtimeCreditMinutes: number | null
  replacementOffDate: Date | null
  workPeriod: string
  payrollPeriod: string
  evidenceStatus: string
}

type SummaryDocument = {
  id: number
  splNumber: string
  origin: string
  requestKind: string
  workDate: Date
  plannedStartAt: Date | null
  plannedEndAt: Date | null
  status: string
  participants: SummaryParticipant[]
}

function durationMinutes(start: Date | null, end: Date | null) {
  return start && end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)) : 0
}

export function SplMonthlySummary({ documents }: { documents: SummaryDocument[] }) {
  const currentMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [origin, setOrigin] = useState('all')

  const rows = useMemo(
    () =>
      documents.flatMap((document) =>
        document.participants.map((participant) => ({
          ...document,
          participant,
          plannedMinutes: durationMinutes(document.plannedStartAt, document.plannedEndAt),
        }))
      ).filter((row) =>
        (!month || row.participant.workPeriod === month) &&
        (status === 'all' || row.status === status) &&
        (category === 'all' || row.participant.category === category) &&
        (origin === 'all' || row.origin === origin)
      ),
    [category, documents, month, origin, status]
  )

  const exportRows = rows.map((row) => [
    row.splNumber,
    row.origin,
    row.requestKind,
    row.participant.employeeName,
    new Date(row.workDate).toLocaleDateString('id-ID'),
    row.participant.category,
    `${row.participant.shiftCode}/${row.participant.rosterType}`,
    row.plannedMinutes,
    row.participant.overtimeCreditMinutes ?? row.plannedMinutes,
    row.status,
    row.participant.evidenceStatus,
    row.participant.replacementOffDate
      ? new Date(row.participant.replacementOffDate).toLocaleDateString('id-ID')
      : '-',
    row.participant.workPeriod,
    row.participant.payrollPeriod,
  ])
  const columns = ['Nomor SPL', 'Asal', 'Jenis', 'Employee', 'Tanggal', 'Kategori', 'Shift/Roster', 'Plan Menit', 'Kredit OT Menit', 'Approval', 'Evidence', 'OFF Pengganti', 'Work Period', 'Payroll Period']

  function printPdf() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.opener = null
    const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
    const body = exportRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    printWindow.document.write(`<html><head><title>Summary SPL ${escapeHtml(month)}</title><style>body{font:12px Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px;text-align:left}h1{font-size:18px}</style></head><body><h1>Summary SPL ${escapeHtml(month)}</h1><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`)
    printWindow.document.close()
  }

  return (
    <div className="hidden md:block">
      <MinimalTableShell
        title="Summary SPL Bulanan"
        description="Rekap payroll-ready per employee. Search, pagination, dan export memakai tabel operasional bersama."
        label="summary SPL"
        fileName={`summary-spl-${month}`}
        searchPlaceholder="Cari nomor SPL, employee, kategori, atau period..."
        filters={
          <div className="flex flex-wrap gap-2">
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="border-input h-10 rounded-lg border bg-background px-3 text-sm" aria-label="Bulan SPL" />
            {[
              ['Status', status, setStatus, ['all', 'draft', 'submitted', 'approved', 'returned', 'rejected', 'closed']],
              ['Kategori', category, setCategory, ['all', 'break', 'off_day', 'after_mandatory_ot']],
              ['Asal', origin, setOrigin, ['all', 'employee_request', 'leader_command']],
            ].map(([label, value, setter, options]) => (
              <Select key={label as string} value={value as string} onValueChange={setter as (value: string) => void}>
                <SelectTrigger className="w-44"><SelectValue placeholder={label as string} /></SelectTrigger>
                <SelectContent>{(options as string[]).map((option) => <SelectItem key={option} value={option}>{option === 'all' ? `Semua ${label}` : option}</SelectItem>)}</SelectContent>
              </Select>
            ))}
          </div>
        }
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => exportRowsToFile({ columns, rows: exportRows, fileName: `summary-spl-${month}` })}><Download className="size-4" /> Excel</Button>
            <Button type="button" variant="outline" onClick={printPdf}><Printer className="size-4" /> PDF</Button>
          </div>
        }
      >
        <Table>
          <TableHeader><TableRow>{columns.map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {rows.length ? rows.map((row) => (
              <TableRow key={`${row.id}-${row.participant.employeeId}`}>
                <TableCell className="font-medium">{row.splNumber}</TableCell>
                <TableCell>{row.origin}</TableCell>
                <TableCell>{row.requestKind}</TableCell>
                <TableCell>{row.participant.employeeName}</TableCell>
                <TableCell>{new Date(row.workDate).toLocaleDateString('id-ID')}</TableCell>
                <TableCell>{row.participant.category}</TableCell>
                <TableCell>{row.participant.shiftCode}/{row.participant.rosterType}</TableCell>
                <TableCell>{row.plannedMinutes}</TableCell>
                <TableCell>{row.participant.overtimeCreditMinutes ?? row.plannedMinutes}</TableCell>
                <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                <TableCell>{row.participant.evidenceStatus}</TableCell>
                <TableCell>{row.participant.replacementOffDate ? new Date(row.participant.replacementOffDate).toLocaleDateString('id-ID') : '-'}</TableCell>
                <TableCell>{row.participant.workPeriod}</TableCell>
                <TableCell>{row.participant.payrollPeriod}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={14} className="h-24 text-center text-muted-foreground">Tidak ada SPL pada filter ini.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </div>
  )
}
