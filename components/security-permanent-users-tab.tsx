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
  UserCheck,
  UserX,
  Search,
  Download,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Layers,
  Award,
} from 'lucide-react'
import { format, differenceInYears, differenceInMonths } from 'date-fns'

interface SecurityPermanentUsersTabProps {
  users: SecurityUserRecord[]
}

function isInternalHeroUser(user: SecurityUserRecord) {
  const loc = `${user.siteName || ''} ${user.workLocation || ''}`.toLowerCase()
  return !loc.includes('eksternal') && !loc.includes('external')
}

function isPermanentEmployee(user: SecurityUserRecord) {
  const s = (user.employeeStatusType || '').toLowerCase().trim()
  return s.includes('permanen') || s.includes('tetap') || s.includes('pkwtt') || s.includes('permanent')
}

function calculateTenure(startDateStr: string | null | undefined): string {
  if (!startDateStr) return '-'
  try {
    const start = new Date(startDateStr)
    if (isNaN(start.getTime())) return '-'
    const now = new Date()
    const years = differenceInYears(now, start)
    const months = differenceInMonths(now, start) % 12

    if (years === 0 && months === 0) return '< 1 bln'
    if (years === 0) return `${months} bln`
    if (months === 0) return `${years} thn`
    return `${years} thn ${months} bln`
  } catch {
    return '-'
  }
}

function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return 'U'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function SecurityPermanentUsersTab({ users }: SecurityPermanentUsersTabProps) {
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedSec, setSelectedSec] = useState<string>('all')
  const [selectedSite, setSelectedSite] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  // 1. Filter out external & filter permanent only
  const permanentUsers = useMemo(() => {
    return users.filter((u) => isInternalHeroUser(u) && isPermanentEmployee(u))
  }, [users])

  // Extract unique options for filter dropdowns
  const deptOptions = useMemo(() => {
    return Array.from(new Set(permanentUsers.map((u) => u.department?.trim()).filter(Boolean))).sort()
  }, [permanentUsers])

  const secOptions = useMemo(() => {
    return Array.from(new Set(permanentUsers.map((u) => u.section?.trim()).filter(Boolean))).sort()
  }, [permanentUsers])

  const siteOptions = useMemo(() => {
    return Array.from(
      new Set(permanentUsers.map((u) => (u.siteName || u.workLocation || '').trim()).filter(Boolean))
    ).sort()
  }, [permanentUsers])

  // Metrics
  const metrics = useMemo(() => {
    const total = permanentUsers.length
    const active = permanentUsers.filter((u) => u.isActive).length
    const inactive = total - active

    const currentYear = new Date().getFullYear()
    const joinedThisYear = permanentUsers.filter((u) => {
      if (!u.joinDate) return false
      return new Date(u.joinDate).getFullYear() === currentYear
    }).length

    return { total, active, inactive, joinedThisYear }
  }, [permanentUsers])

  // Search and filter
  const filteredUsers = useMemo(() => {
    return permanentUsers.filter((u) => {
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

      return matchSearch && matchDept && matchSec && matchSite
    })
  }, [permanentUsers, search, selectedDept, selectedSec, selectedSite])

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
      'Join Date',
      'Permanent Date',
      'Masa Kerja',
      'Status Akun',
    ]

    const rows = filteredUsers.map((u, idx) => [
      idx + 1,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.employeeSn}"`,
      `"${(u.department || '').replace(/"/g, '""')}"`,
      `"${(u.section || '').replace(/"/g, '""')}"`,
      `"${(u.jobTitle || '').replace(/"/g, '""')}"`,
      `"${(u.siteName || u.workLocation || '').replace(/"/g, '""')}"`,
      `"${(u.pointOfHire || '').replace(/"/g, '""')}"`,
      u.joinDate ? format(new Date(u.joinDate), 'yyyy-MM-dd') : '-',
      u.permanentDate ? format(new Date(u.permanentDate), 'yyyy-MM-dd') : '-',
      calculateTenure(u.permanentDate || u.joinDate),
      u.isActive ? 'Active' : 'Non Active',
    ])

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Karyawan_Permanen_${format(new Date(), 'yyyyMMdd')}.csv`)
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
              Total Karyawan Permanen
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {metrics.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Karyawan Tetap (PKWTT) internal non-eksternal
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status Akun Aktif
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {metrics.active.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((metrics.active / (metrics.total || 1)) * 100).toFixed(1)}% dari total karyawan permanen
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bergabung Tahun Ini
            </CardTitle>
            <Calendar className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {metrics.joinedThisYear.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Karyawan tetap yang join pada tahun {new Date().getFullYear()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-slate-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Akun Non-Aktif
            </CardTitle>
            <UserX className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
              {metrics.inactive.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Akun permanen ditangguhkan / dinonaktifkan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1">
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
            <Award className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold">
              Tabel Karyawan Permanen (PKWTT)
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
                <th className="py-3 px-3">Join Date</th>
                <th className="py-3 px-3">Tgl Tetap</th>
                <th className="py-3 px-3 text-center">Masa Kerja</th>
                <th className="py-3 px-3 text-center">Status Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-muted-foreground">
                    Tidak ada data karyawan permanen yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, index) => {
                  const itemIndex = (page - 1) * pageSize + index + 1
                  const siteName = u.siteName || u.workLocation || '-'
                  const tenure = calculateTenure(u.permanentDate || u.joinDate)

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
                        {u.joinDate ? format(new Date(u.joinDate), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                        {u.permanentDate ? format(new Date(u.permanentDate), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 bg-muted/20">
                          <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                          {tenure}
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
