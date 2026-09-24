'use client'

import { useMemo, useState } from 'react'
import {
  Building2,
  Download,
  ExternalLink,
  MapPin,
  Search,
  ShieldAlert,
  Users2,
} from 'lucide-react'
import type { SecurityUserRecord } from '@/lib/hero-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function isExternalUserLocation(user: SecurityUserRecord): boolean {
  const loc = `${user.siteName || ''} ${user.workLocation || ''}`.toLowerCase()
  return loc.includes('eksternal') || loc.includes('external')
}

function exportExternalUsersCsv(data: SecurityUserRecord[]) {
  const headers = [
    'Nama',
    'SN / NIK',
    'Lokasi Site',
    'Departemen',
    'Seksi',
    'Jabatan',
    'Peran',
    'Status',
  ]

  const rows = data.map((u) => [
    u.name,
    u.employeeSn || '-',
    u.siteName || u.workLocation || '-',
    u.department || '-',
    u.section || '-',
    u.jobTitle || '-',
    u.accessRole || '-',
    u.isActive ? 'Active' : 'Inactive',
  ])

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((val) => `"${(val || '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `daftar-karyawan-eksternal-vendor-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function SecurityExternalUsersList({
  users = [],
}: {
  users: SecurityUserRecord[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 15

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return users.filter((u) => {
      if (!q) return true
      const haystack = `${u.name} ${u.employeeSn} ${u.siteName} ${u.workLocation} ${u.department} ${u.section} ${u.jobTitle}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [searchQuery, users])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)

  return (
    <div className="mt-8 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm space-y-4">
      {/* Header Info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100/70 p-2.5 text-amber-700 mt-0.5">
            <Building2 className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Daftar Karyawan Eksternal (Vendor)
              </h3>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300/60 font-bold text-xs">
                {users.length} Orang
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Karyawan dengan lokasi penempatan <strong>Eksternal / Vendor</strong> dipisahkan dari statistik dan grafik karyawan internal Chitra di atas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Cari karyawan eksternal..."
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50/70 border-slate-200"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExternalUsersCsv(filtered)}
            disabled={filtered.length === 0}
            className="h-9 rounded-xl gap-1.5 border-slate-200 text-slate-700 text-xs shrink-0"
          >
            <Download className="size-3.5" />
            Export CSV ({filtered.length})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200/70 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-slate-700 text-xs">
                Karyawan &amp; SN
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-xs">
                Lokasi Eksternal
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-xs">
                Departemen &amp; Seksi
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-xs">
                Jabatan / Role
              </TableHead>
              <TableHead className="w-[120px] font-semibold text-slate-700 text-xs text-center">
                Status Akun
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs">
                  {users.length === 0
                    ? 'Tidak ada data karyawan dengan lokasi Eksternal/Vendor.'
                    : 'Tidak ada karyawan yang sesuai dengan kata kunci pencarian.'}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">
                        {user.name}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {user.employeeSn || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 border border-amber-200/70 text-xs font-semibold text-amber-800">
                      <MapPin className="size-3 text-amber-600" />
                      <span>{user.siteName || user.workLocation || 'Eksternal'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    <div>{user.department || '-'}</div>
                    <div className="text-slate-400 text-[11px]">{user.section || '-'}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    <span className="font-medium text-slate-900">{user.jobTitle || '-'}</span>
                    <span className="text-slate-400 text-[11px] block">{user.accessRole}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        user.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold'
                          : 'bg-slate-100 text-slate-600 border-slate-200 text-xs'
                      }
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
            <span className="text-xs text-muted-foreground">
              Menampilkan {safePage * pageSize + 1} -{' '}
              {Math.min((safePage + 1) * pageSize, filtered.length)} dari{' '}
              {filtered.length} karyawan eksternal
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="h-7 text-xs rounded-lg"
              >
                Sebelumnya
              </Button>
              <span className="text-xs font-medium text-slate-600 px-2">
                {safePage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="h-7 text-xs rounded-lg"
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
