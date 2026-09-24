'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Download,
  Filter,
  History,
  MapPin,
  Search,
  UserCheck,
  Building2,
} from 'lucide-react'
import type { EmployeeLocationTransferRecord } from '@/lib/hero-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function exportTransfersToCsv(data: EmployeeLocationTransferRecord[]) {
  const headers = [
    'Tanggal Pindah',
    'Nama Karyawan',
    'SN / NIK',
    'Lokasi Asal',
    'Lokasi Tujuan',
    'Alasan',
    'Diubah Oleh',
  ]

  const rows = data.map((item) => [
    formatDate(item.transferDate),
    item.employeeName,
    item.employeeSn,
    item.fromSiteName || 'Belum Ditentukan',
    item.toSiteName,
    item.reason,
    item.actionByName,
  ])

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((val) => `"${(val || '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `riwayat-pemindahan-lokasi-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function SecurityLocationTransferHistory({
  transfers = [],
}: {
  transfers: EmployeeLocationTransferRecord[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedToSite, setSelectedToSite] = useState<string>('all')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const toSiteOptions = useMemo(() => {
    const siteNames = new Set<string>()
    transfers.forEach((t) => {
      if (t.toSiteName) siteNames.add(t.toSiteName)
    })
    return Array.from(siteNames).sort()
  }, [transfers])

  const filteredTransfers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return transfers.filter((item) => {
      const matchSearch =
        !q ||
        item.employeeName.toLowerCase().includes(q) ||
        item.employeeSn.toLowerCase().includes(q) ||
        (item.fromSiteName && item.fromSiteName.toLowerCase().includes(q)) ||
        item.toSiteName.toLowerCase().includes(q) ||
        item.actionByName.toLowerCase().includes(q)

      const matchSite = selectedToSite === 'all' || item.toSiteName === selectedToSite

      return matchSearch && matchSite
    })
  }, [searchQuery, selectedToSite, transfers])

  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginatedTransfers = filteredTransfers.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize
  )

  return (
    <div className="space-y-4">
      {/* Metric summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Mutasi Lokasi
            </span>
            <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
              <History className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {transfers.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Total pemindahan tugas yang tercatat
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Karyawan Termutasi
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <UserCheck className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {new Set(transfers.map((t) => t.employeeId)).size}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Jumlah individu karyawan yang pernah dimutasi
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Site Tujuan Terbanyak
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold tracking-tight text-foreground truncate">
            {toSiteOptions[0] || '-'}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Tujuan penempatan karyawan
          </p>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Cari nama karyawan, SN, site, atau admin..."
              className="pl-9 h-10 rounded-xl bg-slate-50/60 border-slate-200"
            />
          </div>

          <Select
            value={selectedToSite}
            onValueChange={(val) => {
              setSelectedToSite(val)
              setPage(0)
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[200px] rounded-xl bg-slate-50/60 border-slate-200">
              <SelectValue placeholder="Filter Site Tujuan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Site Tujuan</SelectItem>
              {toSiteOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={() => exportTransfersToCsv(filteredTransfers)}
          disabled={filteredTransfers.length === 0}
          className="h-10 rounded-xl gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <Download className="size-4" />
          Export CSV ({filteredTransfers.length})
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px] font-semibold text-slate-700 text-xs">
                Tanggal Pindah
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-xs">
                Nama Karyawan &amp; SN
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-xs">
                Lokasi Asal &rarr; Lokasi Tujuan
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-xs">
                Alasan
              </TableHead>
              <TableHead className="w-[180px] font-semibold text-slate-700 text-xs">
                Diubah Oleh
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <History className="size-8 stroke-[1.5] text-slate-300" />
                    <p className="text-sm font-medium">Belum ada riwayat pemindahan lokasi</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Saat lokasi karyawan diubah di User Management dengan alasan &quot;Pemindahan Lokasi&quot;, riwayat mutasi akan tercatat otomatis di sini.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransfers.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="text-xs font-medium text-slate-700 whitespace-nowrap">
                    {formatDate(item.transferDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900 leading-tight">
                        {item.employeeName}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {item.employeeSn || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 border border-slate-200/70">
                      <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <MapPin className="size-3.5 text-slate-400" />
                        <span>{item.fromSiteName || 'Site Awal'}</span>
                      </div>
                      <ArrowRight className="size-3.5 text-primary stroke-[2.5]" />
                      <div className="flex items-center gap-1 text-xs text-primary font-bold">
                        <MapPin className="size-3.5 text-primary" />
                        <span>{item.toSiteName}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-semibold text-xs">
                      {item.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{item.actionByName}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50/50">
            <span className="text-xs text-muted-foreground">
              Menampilkan {safePage * pageSize + 1} -{' '}
              {Math.min((safePage + 1) * pageSize, filteredTransfers.length)} dari{' '}
              {filteredTransfers.length} riwayat
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="h-8 rounded-lg text-xs"
              >
                Sebelumnya
              </Button>
              <span className="text-xs font-medium text-slate-600">
                {safePage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="h-8 rounded-lg text-xs"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
