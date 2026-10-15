'use client'

import React, { useState, useMemo } from 'react'
import { SecurityUserRecord } from '@/lib/hero-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Search,
  Download,
  Building2,
  MapPin,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface SecurityContractUsersTabProps {
  users: SecurityUserRecord[]
}

function isInternalHeroUser(user: SecurityUserRecord) {
  const loc = `${user.siteName || ''} ${user.workLocation || ''}`.toLowerCase()
  return !loc.includes('eksternal') && !loc.includes('external')
}

function isContractEmployee(user: SecurityUserRecord) {
  const s = (user.employeeStatusType || '').toLowerCase().trim()
  return s.includes('kontrak') || s.includes('pkwt') || s.includes('contract')
}

interface ContractStatusInfo {
  type: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'UNSET'
  label: string
  diffDays: number | null
}

function evaluateContractStatus(endStr: string | null | undefined): ContractStatusInfo {
  if (!endStr) {
    return { type: 'UNSET', label: 'Belum Diatur', diffDays: null }
  }

  try {
    const end = new Date(endStr)
    if (isNaN(end.getTime())) {
      return { type: 'UNSET', label: 'Format Salah', diffDays: null }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    const diffDays = differenceInDays(end, today)

    if (diffDays < 0) {
      return { type: 'EXPIRED', label: 'Expired / Selesai', diffDays }
    }
    if (diffDays <= 30) {
      return { type: 'EXPIRING', label: 'Akan Berakhir', diffDays }
    }
    return { type: 'ACTIVE', label: 'Kontrak Aktif', diffDays }
  } catch {
    return { type: 'UNSET', label: 'Belum Diatur', diffDays: null }
  }
}

function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return 'U'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function SecurityContractUsersTab({ users }: SecurityContractUsersTabProps) {
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedSec, setSelectedSec] = useState<string>('all')
  const [selectedSite, setSelectedSite] = useState<string>('all')
  const [selectedContractStatus, setSelectedContractStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Filter internal + contract only
  const contractUsers = useMemo(() => {
    return users.filter((u) => isInternalHeroUser(u) && isContractEmployee(u))
  }, [users])

  // Extract unique options
  const deptOptions = useMemo(() => {
    return Array.from(new Set(contractUsers.map((u) => u.department?.trim()).filter(Boolean))).sort()
  }, [contractUsers])

  const secOptions = useMemo(() => {
    return Array.from(new Set(contractUsers.map((u) => u.section?.trim()).filter(Boolean))).sort()
  }, [contractUsers])

  const siteOptions = useMemo(() => {
    return Array.from(
      new Set(contractUsers.map((u) => (u.siteName || u.workLocation || '').trim()).filter(Boolean))
    ).sort()
  }, [contractUsers])

  // Metrics
  const metrics = useMemo(() => {
    let total = contractUsers.length
    let active = 0
    let expiring = 0
    let expired = 0

    contractUsers.forEach((u) => {
      const st = evaluateContractStatus(u.contractDurationEnd)
      if (st.type === 'ACTIVE') active++
      else if (st.type === 'EXPIRING') expiring++
      else if (st.type === 'EXPIRED') expired++
    })

    return { total, active, expiring, expired }
  }, [contractUsers])

  // Filter
  const filteredUsers = useMemo(() => {
    return contractUsers.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.employeeSn.toLowerCase().includes(search.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.section || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.jobTitle || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.siteName || u.workLocation || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.pointOfHire || '').toLowerCase().includes(search.toLowerCase())

      const matchDept = selectedDept === 'all' || u.department === selectedDept
      const matchSec = selectedSec === 'all' || u.section === selectedSec
      const siteName = u.siteName || u.workLocation || ''
      const matchSite = selectedSite === 'all' || siteName === selectedSite

      const status = evaluateContractStatus(u.contractDurationEnd)
      const matchContractStatus =
        selectedContractStatus === 'all' || status.type === selectedContractStatus

      return matchSearch && matchDept && matchSec && matchSite && matchContractStatus
    })
  }, [contractUsers, search, selectedDept, selectedSec, selectedSite, selectedContractStatus])

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, page])

  const exportToCsv = () => {
    const headers = [
      'No',
      'Nama',
      'SN',
      'Departemen',
      'Seksi',
      'Jabatan',
      'Lokasi Site',
      'POH',
      'Mulai Kontrak',
      'Selesai Kontrak',
      'Sisa Hari',
      'Status Kontrak',
      'Status Akun',
    ]

    const rows = filteredUsers.map((u, idx) => {
      const st = evaluateContractStatus(u.contractDurationEnd)
      return [
        idx + 1,
        `"${u.name.replace(/"/g, '""')}"`,
        `"${u.employeeSn}"`,
        `"${(u.department || '').replace(/"/g, '""')}"`,
        `"${(u.section || '').replace(/"/g, '""')}"`,
        `"${(u.jobTitle || '').replace(/"/g, '""')}"`,
        `"${(u.siteName || u.workLocation || '').replace(/"/g, '""')}"`,
        `"${(u.pointOfHire || '').replace(/"/g, '""')}"`,
        u.contractDurationStart ? format(new Date(u.contractDurationStart), 'yyyy-MM-dd') : '-',
        u.contractDurationEnd ? format(new Date(u.contractDurationEnd), 'yyyy-MM-dd') : '-',
        st.diffDays !== null ? `${st.diffDays} hari` : '-',
        st.label,
        u.isActive ? 'Active' : 'Non Active',
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Karyawan_Kontrak_${format(new Date(), 'yyyyMMdd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Karyawan Kontrak
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {metrics.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Karyawan Kontrak (PKWT) internal non-eksternal
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kontrak Aktif
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {metrics.active.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Masa kontrak &gt; 30 hari tersisa
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Akan Berakhir (≤ 30 Hari)
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {metrics.expiring.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Perlu evaluasi perpanjangan kontrak (Contract Review)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-rose-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Expired / Habis Kontrak
            </CardTitle>
            <XCircle className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              {metrics.expired.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tanggal akhir kontrak telah lewat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, SN, jabatan, departemen, seksi, site..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select
            value={selectedContractStatus}
            onValueChange={(val) => {
              setSelectedContractStatus(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36 sm:w-44 h-9 text-xs">
              <SelectValue placeholder="Status Kontrak" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="ACTIVE">Kontrak Aktif</SelectItem>
              <SelectItem value="EXPIRING">Akan Berakhir (≤30 Hari)</SelectItem>
              <SelectItem value="EXPIRED">Expired / Selesai</SelectItem>
              <SelectItem value="UNSET">Belum Diatur</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedDept}
            onValueChange={(val) => {
              setSelectedDept(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36 sm:w-44 h-9 text-xs">
              <SelectValue placeholder="Departemen" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="all">Semua Departemen</SelectItem>
              {deptOptions.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedSec}
            onValueChange={(val) => {
              setSelectedSec(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36 sm:w-44 h-9 text-xs">
              <SelectValue placeholder="Seksi" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="all">Semua Seksi</SelectItem>
              {secOptions.map((sec) => (
                <SelectItem key={sec} value={sec}>
                  {sec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedSite}
            onValueChange={(val) => {
              setSelectedSite(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36 sm:w-44 h-9 text-xs">
              <SelectValue placeholder="Lokasi Site" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="all">Semua Lokasi Site</SelectItem>
              {siteOptions.map((site) => (
                <SelectItem key={site} value={site}>
                  {site}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCsv} className="h-9 text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold">
              Tabel Karyawan Kontrak (PKWT)
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs bg-background">
            {filteredUsers.length} Karyawan Terlihat
          </Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3">Karyawan</th>
                <th className="py-3 px-3">SN</th>
                <th className="py-3 px-3">Departemen</th>
                <th className="py-3 px-3">Seksi</th>
                <th className="py-3 px-3">Jabatan</th>
                <th className="py-3 px-3">Lokasi Site</th>
                <th className="py-3 px-3">POH</th>
                <th className="py-3 px-3">Mulai Kontrak</th>
                <th className="py-3 px-3">Selesai Kontrak</th>
                <th className="py-3 px-3 text-center">Sisa Hari</th>
                <th className="py-3 px-3 text-center">Status Kontrak</th>
                <th className="py-3 px-3 text-center">Status Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center text-muted-foreground">
                    Tidak ada data karyawan kontrak yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, index) => {
                  const itemIndex = (page - 1) * pageSize + index + 1
                  const siteName = u.siteName || u.workLocation || '-'
                  const st = evaluateContractStatus(u.contractDurationEnd)

                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">
                        {itemIndex}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 rounded-lg">
                            <AvatarImage src={u.profileImage || undefined} alt={u.name} />
                            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700 font-bold">
                              {getUserInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[160px]">
                              {u.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                              {u.email || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-foreground/80">
                        {u.employeeSn}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                          <Building2 className="h-3 w-3" />
                          {u.department || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-violet-700 dark:text-violet-300 font-medium bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-md">
                          <Layers className="h-3 w-3" />
                          {u.section || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-foreground/85 font-medium">
                        {u.jobTitle || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                          <MapPin className="h-3 w-3" />
                          {siteName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {u.pointOfHire || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                        {u.contractDurationStart ? format(new Date(u.contractDurationStart), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                        {u.contractDurationEnd ? format(new Date(u.contractDurationEnd), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {st.diffDays !== null ? (
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] px-2 py-0.5 ${
                              st.diffDays < 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                : st.diffDays <= 30
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-muted/30 text-muted-foreground'
                            }`}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {st.diffDays < 0
                              ? `Expired (${Math.abs(st.diffDays)} hari)`
                              : `${st.diffDays} hari lagi`}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold px-2 py-0.5 ${
                            st.type === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : st.type === 'EXPIRING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : st.type === 'EXPIRED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          {st.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold px-2 py-0.5 ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Non Active'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="py-3 px-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Halaman {page} dari {totalPages} ({filteredUsers.length} data)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="h-7 text-xs px-2.5"
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="h-7 text-xs px-2.5"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
