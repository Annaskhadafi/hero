'use client'

import React, { useState, useMemo, useTransition } from 'react'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  FileSpreadsheet,
  Search,
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
  Eye,
  Building2,
  Users,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Filter,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  updateSafetyInduction,
  deleteSafetyInduction,
} from '@/app/actions/safety-induction'
import type { SafetyInduction } from '@/db/schema/safety-induction'

interface SafetyInductionClientProps {
  initialData: SafetyInduction[]
}

type DatePreset = 'all' | 'today' | '7days' | 'this_month' | 'this_year' | 'custom'

export function SafetyInductionClient({ initialData }: SafetyInductionClientProps) {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Action Dialog States
  const [selectedInduction, setSelectedInduction] = useState<SafetyInduction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<SafetyInduction | null>(null)

  // Edit Form State
  const [editForm, setEditForm] = useState({
    fullName: '',
    companyOrigin: '',
    phoneNumber: '',
    purpose: '',
  })

  const [isPending, startTransition] = useTransition()
  const [isExporting, setIsExporting] = useState(false)

  // Unique companies list for dropdown
  const uniqueCompanies = useMemo(() => {
    const set = new Set(initialData.map((d) => d.companyOrigin).filter(Boolean))
    return Array.from(set).sort()
  }, [initialData])

  // Filter logic
  const filteredData = useMemo(() => {
    return initialData.filter((item) => {
      const itemDate = new Date(item.createdAt)

      // Search keyword match (name, company, phone, purpose)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchName = item.fullName?.toLowerCase().includes(query)
        const matchCompany = item.companyOrigin?.toLowerCase().includes(query)
        const matchPhone = item.phoneNumber?.toLowerCase().includes(query)
        const matchPurpose = item.purpose?.toLowerCase().includes(query)
        if (!matchName && !matchCompany && !matchPhone && !matchPurpose) {
          return false
        }
      }

      // Company filter
      if (selectedCompany !== 'all' && item.companyOrigin !== selectedCompany) {
        return false
      }

      // Date preset & custom filter
      const now = new Date()
      if (datePreset === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        if (itemDate < startOfToday || itemDate > endOfToday) return false
      } else if (datePreset === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        sevenDaysAgo.setHours(0, 0, 0, 0)
        if (itemDate < sevenDaysAgo) return false
      } else if (datePreset === 'this_month') {
        if (
          itemDate.getMonth() !== now.getMonth() ||
          itemDate.getFullYear() !== now.getFullYear()
        ) {
          return false
        }
      } else if (datePreset === 'this_year') {
        if (itemDate.getFullYear() !== now.getFullYear()) {
          return false
        }
      } else if (datePreset === 'custom') {
        if (startDate) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          if (itemDate < start) return false
        }
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (itemDate > end) return false
        }
      }

      return true
    })
  }, [initialData, searchTerm, selectedCompany, datePreset, startDate, endDate])

  // Sorted data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })
  }, [filteredData, sortOrder])

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  // KPI calculations
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const totalHariIni = useMemo(() => {
    return initialData.filter((i) => new Date(i.createdAt) >= today).length
  }, [initialData, today])

  const totalBulanIni = useMemo(() => {
    const now = new Date()
    return initialData.filter((i) => {
      const d = new Date(i.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
  }, [initialData])

  const totalPerusahaan = uniqueCompanies.length

  // Handlers for Filters
  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedCompany('all')
    setDatePreset('all')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  const isFilterActive =
    Boolean(searchTerm) ||
    selectedCompany !== 'all' ||
    datePreset !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate)

  // Export to Excel
  const handleExportExcel = () => {
    try {
      setIsExporting(true)
      if (sortedData.length === 0) {
        toast.error('Tidak ada data untuk diekspor')
        return
      }

      const rows = sortedData.map((item, index) => ({
        No: index + 1,
        'Waktu Masuk': new Date(item.createdAt).toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        'Nama Lengkap': item.fullName,
        'Instansi / Perusahaan': item.companyOrigin,
        'No. Telepon': item.phoneNumber,
        Tujuan: item.purpose,
        'Status Tanda Tangan': item.signatureUrl ? 'Tersedia' : 'Tidak Ada',
        'URL Tanda Tangan': item.signatureUrl || '-',
        'Waktu Disetujui': new Date(item.agreedAt).toLocaleString('id-ID'),
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)

      // Set column widths
      const colWidths = [
        { wch: 6 },
        { wch: 20 },
        { wch: 25 },
        { wch: 25 },
        { wch: 18 },
        { wch: 35 },
        { wch: 18 },
        { wch: 40 },
        { wch: 22 },
      ]
      worksheet['!cols'] = colWidths

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Safety Induction')

      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(workbook, `Safety_Induction_Export_${dateStr}.xlsx`)
      toast.success(`Berhasil mengekspor ${sortedData.length} data ke Excel!`)
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Gagal mengekspor data ke Excel')
    } finally {
      setIsExporting(false)
    }
  }

  // Open Edit Dialog
  const handleOpenEdit = (item: SafetyInduction) => {
    setSelectedInduction(item)
    setEditForm({
      fullName: item.fullName,
      companyOrigin: item.companyOrigin,
      phoneNumber: item.phoneNumber,
      purpose: item.purpose,
    })
    setDetailOpen(false)
    setEditOpen(true)
  }

  // Submit Edit
  const handleSaveEdit = () => {
    if (!selectedInduction) return

    if (
      !editForm.fullName.trim() ||
      !editForm.companyOrigin.trim() ||
      !editForm.phoneNumber.trim() ||
      !editForm.purpose.trim()
    ) {
      toast.error('Semua kolom formulir harus diisi')
      return
    }

    startTransition(async () => {
      const res = await updateSafetyInduction(selectedInduction.id, editForm)
      if (res.success) {
        toast.success('Data Safety Induction berhasil diperbarui!')
        setEditOpen(false)
        setSelectedInduction(null)
      } else {
        toast.error(res.error || 'Gagal memperbarui data')
      }
    })
  }

  // Open Delete Dialog
  const handleOpenDelete = (item: SafetyInduction) => {
    setItemToDelete(item)
    setDeleteOpen(true)
  }

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!itemToDelete) return

    startTransition(async () => {
      const res = await deleteSafetyInduction(itemToDelete.id)
      if (res.success) {
        toast.success('Data Safety Induction berhasil dihapus!')
        setDeleteOpen(false)
        setItemToDelete(null)
        if (selectedInduction?.id === itemToDelete.id) {
          setDetailOpen(false)
          setSelectedInduction(null)
        }
      } else {
        toast.error(res.error || 'Gagal menghapus data')
      }
    })
  }

  // Open Detail View
  const handleOpenDetail = (item: SafetyInduction) => {
    setSelectedInduction(item)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Induction Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Ringkasan data tamu dan pengunjung yang telah menyelesaikan formulir Safety Induction K3L.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportExcel}
            disabled={isExporting || sortedData.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Export Excel ({sortedData.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengunjung Hari Ini</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalHariIni}</div>
            <p className="text-xs text-muted-foreground mt-1">Total pengunjung hari ini</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengunjung Bulan Ini</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalBulanIni}</div>
            <p className="text-xs text-muted-foreground mt-1">Total pengunjung bulan ini</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instansi / Perusahaan</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalPerusahaan}</div>
            <p className="text-xs text-muted-foreground mt-1">Jumlah instansi/perusahaan terdaftar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Table Card */}
      <Card className="shadow-sm border-border/70">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Data Riwayat Safety Induction
              </CardTitle>
              <CardDescription>
                Menampilkan {sortedData.length} dari {initialData.length} data riwayat.
              </CardDescription>
            </div>
            {isFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reset Semua Filter
              </Button>
            )}
          </div>

          {/* Filter Bar Controls */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, instansi, telepon..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-8 h-9 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Company Select */}
            <Select
              value={selectedCompany}
              onValueChange={(val) => {
                setSelectedCompany(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Semua Instansi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Instansi</SelectItem>
                {uniqueCompanies.map((comp) => (
                  <SelectItem key={comp} value={comp}>
                    {comp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Preset Filter */}
            <Select
              value={datePreset}
              onValueChange={(val: DatePreset) => {
                setDatePreset(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Pilih Waktu" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="7days">7 Hari Terakhir</SelectItem>
                <SelectItem value="this_month">Bulan Ini</SelectItem>
                <SelectItem value="this_year">Tahun Ini</SelectItem>
                <SelectItem value="custom">Kustom Tanggal...</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs w-full flex items-center justify-between"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              >
                <span className="flex items-center gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  Urutan: {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
                </span>
                <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                  {sortOrder}
                </Badge>
              </Button>
            </div>
          </div>

          {/* Custom Date Range Picker Inputs */}
          {datePreset === 'custom' && (
            <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border/50 flex flex-wrap items-center gap-3 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Dari Tanggal:
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Sampai Tanggal:
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-8 text-xs w-36"
                />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="h-8 text-xs text-muted-foreground px-2"
                >
                  Clear Rentang
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-none border-t border-b overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead className="min-w-[150px]">Waktu Masuk</TableHead>
                  <TableHead className="min-w-[180px]">Nama Lengkap</TableHead>
                  <TableHead className="min-w-[180px]">Instansi / Perusahaan</TableHead>
                  <TableHead className="min-w-[140px]">No. Telepon</TableHead>
                  <TableHead className="min-w-[220px]">Tujuan</TableHead>
                  <TableHead className="text-center w-24">Tanda Tangan</TableHead>
                  <TableHead className="text-right min-w-[120px] pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium">Tidak ada data yang sesuai dengan filter.</p>
                        {isFilterActive && (
                          <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs mt-1">
                            Reset Filter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="text-center text-xs font-mono text-muted-foreground">
                          {rowNumber}
                        </TableCell>
                        <TableCell className="font-medium text-xs whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">
                          {item.fullName}
                        </TableCell>
                        <TableCell className="text-sm text-foreground/90">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.companyOrigin}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {item.phoneNumber}
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80 max-w-[240px] truncate" title={item.purpose}>
                          {item.purpose}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.signatureUrl ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                              Ada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Tidak Ada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Detail Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Lihat Detail"
                              onClick={() => handleOpenDetail(item)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Edit Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit Data"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Hapus Data"
                              onClick={() => handleOpenDelete(item)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Baris per halaman:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-18 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>
                Halaman {currentPage} dari {totalPages} ({sortedData.length} total baris)
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs"
              >
                Berikutnya
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETAIL MODAL */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detail Safety Induction
            </DialogTitle>
            <DialogDescription>
              Disetujui pada {selectedInduction?.agreedAt ? new Date(selectedInduction.agreedAt).toLocaleString('id-ID') : '-'}
            </DialogDescription>
          </DialogHeader>

          {selectedInduction && (
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-4 items-center gap-4 text-sm">
                <span className="font-semibold text-right text-muted-foreground">Waktu Masuk</span>
                <span className="col-span-3 font-medium">
                  {new Date(selectedInduction.createdAt).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 text-sm">
                <span className="font-semibold text-right text-muted-foreground">Nama Lengkap</span>
                <span className="col-span-3 font-medium">{selectedInduction.fullName}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 text-sm">
                <span className="font-semibold text-right text-muted-foreground">Instansi / PT</span>
                <span className="col-span-3 font-medium">{selectedInduction.companyOrigin}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 text-sm">
                <span className="font-semibold text-right text-muted-foreground">No. Telepon</span>
                <span className="col-span-3 font-mono">{selectedInduction.phoneNumber}</span>
              </div>
              <div className="grid grid-cols-4 items-start gap-4 text-sm">
                <span className="font-semibold text-right text-muted-foreground pt-1">Tujuan</span>
                <div className="col-span-3 p-3 bg-muted/50 rounded-md border text-foreground/90 whitespace-pre-wrap">
                  {selectedInduction.purpose}
                </div>
              </div>

              {/* Signature Section */}
              <div className="grid grid-cols-4 items-start gap-4 mt-2 border-t pt-4 text-sm">
                <span className="font-semibold text-right text-muted-foreground pt-2">Tanda Tangan</span>
                <div className="col-span-3 space-y-2">
                  {selectedInduction.signatureUrl ? (
                    <div className="space-y-2">
                      <div className="border rounded-md p-2 bg-white inline-block shadow-sm">
                        <Image
                          src={selectedInduction.signatureUrl}
                          alt="Tanda Tangan"
                          width={240}
                          height={120}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <a
                          href={selectedInduction.signatureUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Buka Gambar Asli <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-red-500 italic">Tidak ada tanda tangan</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Dengan tanda tangan ini, yang bersangkutan menyatakan telah membaca dan menyetujui seluruh ketentuan K3L PT. Chitra Paratama.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedInduction) {
                  handleOpenEdit(selectedInduction)
                }
              }}
              className="text-amber-600 hover:text-amber-700 flex items-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Data Ini
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDetailOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-amber-600" />
              Edit Data Safety Induction
            </DialogTitle>
            <DialogDescription>
              Perbarui informasi pengunjung atau tamu di bawah ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-fullName" className="text-xs font-semibold">
                Nama Lengkap <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-fullName"
                value={editForm.fullName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-companyOrigin" className="text-xs font-semibold">
                Instansi / Perusahaan <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-companyOrigin"
                value={editForm.companyOrigin}
                onChange={(e) => setEditForm((prev) => ({ ...prev, companyOrigin: e.target.value }))}
                placeholder="Contoh: PT. ABC / Tamu Pribadi"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-phoneNumber" className="text-xs font-semibold">
                No. Telepon <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-phoneNumber"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="Contoh: 08123456789"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-purpose" className="text-xs font-semibold">
                Tujuan Kunjungan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="edit-purpose"
                rows={3}
                value={editForm.purpose}
                onChange={(e) => setEditForm((prev) => ({ ...prev, purpose: e.target.value }))}
                placeholder="Jelaskan keperluan atau tujuan kunjungan..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Hapus Data Safety Induction?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data safety induction atas nama{' '}
              <strong className="text-foreground">{itemToDelete?.fullName}</strong> (
              {itemToDelete?.companyOrigin})? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Menghapus...
                </>
              ) : (
                'Hapus Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
