'use client'

import React, { useState, useMemo } from 'react'
import { type HcTurnoverMovement } from '@/db/schema/hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  UserPlus,
  Search,
  Download,
  Trash2,
  Calendar,
  Building2,
  MapPin,
  Briefcase,
  FileSpreadsheet,
  ChevronsUpDown,
  Check,
} from 'lucide-react'
import { createIncomingMovementAction, deleteMovementAction } from '@/app/dashboard/hc/turnover/actions'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TurnoverIncomingTableProps {
  incomingList: HcTurnoverMovement[]
  options: {
    departments: { id: number; name: string }[]
    sections: { id: number; name: string }[]
    positions: { id: number; name: string }[]
    sites: { id: number; name: string }[]
    activeEmployees: any[]
  }
}

export function TurnoverIncomingTable({
  incomingList,
  options,
}: TurnoverIncomingTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRemark, setSelectedRemark] = useState<string>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Employee Selection State with live search
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('manual')
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [isComboboxOpen, setIsComboboxOpen] = useState(false)

  // Form State
  const [formName, setFormName] = useState('')
  const [formSn, setFormSn] = useState('')
  const [formPosition, setFormPosition] = useState('')
  const [formSection, setFormSection] = useState('')
  const [formPoh, setFormPoh] = useState('')
  const [formJoinDate, setFormJoinDate] = useState(new Date().toISOString().slice(0, 10))
  const [formRemark, setFormRemark] = useState('New Hire')

  // Filtered employees for combobox search
  const searchableEmployees = useMemo(() => {
    const list = options.activeEmployees || []
    if (!employeeSearchQuery.trim()) return list
    const q = employeeSearchQuery.toLowerCase()
    return list.filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.employeeSn && emp.employeeSn.toLowerCase().includes(q)) ||
        (emp.jobTitle && emp.jobTitle.toLowerCase().includes(q)) ||
        (emp.section && emp.section.toLowerCase().includes(q))
    )
  }, [options.activeEmployees, employeeSearchQuery])

  const selectedEmployeeLabel = useMemo(() => {
    if (selectedEmployeeId === 'manual') {
      return formName ? `${formName} (Input Manual)` : '-- Pilih Karyawan dari Database / Input Baru --'
    }
    const found = options.activeEmployees.find((e) => e.id.toString() === selectedEmployeeId)
    return found ? `${found.employeeSn || '-'} - ${found.name} (${found.jobTitle || 'No Title'})` : 'Pilih Karyawan...'
  }, [selectedEmployeeId, formName, options.activeEmployees])

  const handleSelectEmployee = (empIdStr: string) => {
    setSelectedEmployeeId(empIdStr)
    if (empIdStr === 'manual') {
      setFormName('')
      setFormSn('')
      setFormPosition('')
      setFormSection('')
      setFormPoh('')
      return
    }

    const emp = options.activeEmployees.find((e) => e.id.toString() === empIdStr)
    if (emp) {
      setFormName(emp.name || '')
      setFormSn(emp.employeeSn || '')
      setFormPosition(emp.jobTitle || '')
      setFormSection(emp.section || '')
      setFormPoh(emp.pointOfHire || 'Balikpapan')
    }
  }

  const filteredData = useMemo(() => {
    return incomingList.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employeeSn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pointOfHire.toLowerCase().includes(searchTerm.toLowerCase())

      const matchRemark =
        selectedRemark === 'all' ||
        item.remark.toLowerCase().includes(selectedRemark.toLowerCase())

      return matchSearch && matchRemark
    })
  }, [incomingList, searchTerm, selectedRemark])

  const handleCreateIncoming = async () => {
    if (!formName.trim() || !formSn.trim() || !formPosition.trim() || !formSection.trim()) {
      toast.error('Mohon lengkapi Nama, SN, Jabatan, dan Seksi')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createIncomingMovementAction({
        employeeName: formName,
        employeeSn: formSn,
        position: formPosition,
        section: formSection,
        poh: formPoh || 'Balikpapan',
        joinDate: formJoinDate,
        remark: formRemark,
      })

      if (res.success) {
        toast.success(`Karyawan masuk ${formName} berhasil dicatat`)
        setIsAddOpen(false)
        // Reset form
        setFormName('')
        setFormSn('')
        setFormPosition('')
        setFormSection('')
        setFormPoh('')
      } else {
        toast.error(res.error || 'Gagal menyimpan data karyawan masuk')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus catatan masuk untuk ${name}?`)) return

    try {
      const res = await deleteMovementAction(id)
      if (res.success) {
        toast.success(`Catatan ${name} berhasil dihapus`)
      } else {
        toast.error(res.error || 'Gagal menghapus catatan')
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus')
    }
  }

  const exportToCsv = () => {
    const headers = ['No', 'Nama', 'SN', 'Position', 'Section', 'POH', 'Join Date', 'Remark']
    const rows = filteredData.map((item, idx) => [
      idx + 1,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.employeeSn}"`,
      `"${item.position.replace(/"/g, '""')}"`,
      `"${item.section.replace(/"/g, '""')}"`,
      `"${item.pointOfHire.replace(/"/g, '""')}"`,
      item.movementDate ? format(new Date(item.movementDate), 'yyyy-MM-dd') : '-',
      `"${item.remark}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Karyawan_Masuk_${format(new Date(), 'yyyyMMdd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4 w-full">
      {/* Action and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama, SN, jabatan, seksi, POH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-card/80 border-border/70"
            />
          </div>
          <Select value={selectedRemark} onValueChange={setSelectedRemark}>
            <SelectTrigger className="w-36 h-9 text-xs bg-card/80 border-border/70">
              <SelectValue placeholder="Remark" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Remark</SelectItem>
              <SelectItem value="New Hire">New Hire</SelectItem>
              <SelectItem value="Transfer">Transfer</SelectItem>
              <SelectItem value="Re Hire">Re Hire</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCsv} className="h-9 text-xs gap-1.5 shadow-xs">
            <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export CSV
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 text-xs gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs">
                <UserPlus className="h-3.5 w-3.5" /> Tambah Karyawan Masuk
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-emerald-600" />
                  Catat Karyawan Masuk (Incoming)
                </DialogTitle>
                <DialogDescription>
                  Tambahkan karyawan baru yang masuk (New Hire, Transfer, atau Re-Hire) untuk memperbarui headcount otomatis.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 py-2 text-xs">
                <div className="col-span-2 space-y-1">
                  <label className="font-semibold text-foreground">
                    Pilih Dari User Management (Opsional / Otomatisasi)
                  </label>
                  <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={isComboboxOpen}
                        className="w-full justify-between h-8.5 text-xs font-normal bg-background px-3"
                      >
                        <span className="truncate text-left">{selectedEmployeeLabel}</span>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] sm:w-[460px] p-0 shadow-lg" align="start">
                      <div className="p-2 border-b border-border/60">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Cari nama karyawan, SN, jabatan..."
                            value={employeeSearchQuery}
                            onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs bg-muted/20"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-border/30 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectEmployee('manual')
                            setIsComboboxOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-accent rounded-sm flex items-center justify-between ${
                            selectedEmployeeId === 'manual' ? 'bg-accent/60 font-medium' : ''
                          }`}
                        >
                          <span className="text-muted-foreground italic">-- Input Manual (Karyawan Baru) --</span>
                          {selectedEmployeeId === 'manual' && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                        </button>
                        {searchableEmployees.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            Tidak ditemukan karyawan dengan kata kunci &quot;{employeeSearchQuery}&quot;
                          </div>
                        ) : (
                          searchableEmployees.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                handleSelectEmployee(emp.id.toString())
                                setIsComboboxOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-accent rounded-sm flex items-start justify-between gap-2 transition-colors ${
                                selectedEmployeeId === emp.id.toString() ? 'bg-accent/80 font-medium' : ''
                              }`}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-foreground truncate">
                                  {emp.name}{' '}
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    ({emp.employeeSn || 'No SN'})
                                  </span>
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {emp.jobTitle || 'No Title'} • {emp.section || 'No Section'}
                                </span>
                              </div>
                              {selectedEmployeeId === emp.id.toString() && (
                                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-[10px] text-muted-foreground">
                    Cari nama karyawan untuk mengisi otomatis, atau ketik manual jika karyawan belum terdaftar di sistem.
                  </p>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="font-semibold text-foreground">Nama Karyawan *</label>
                  <Input
                    placeholder="Contoh: Budi Santoso"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Employee SN *</label>
                  <Input
                    placeholder="Contoh: 78120"
                    value={formSn}
                    onChange={(e) => setFormSn(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">POH (Point of Hire)</label>
                  <Input
                    placeholder="Contoh: Balikpapan"
                    value={formPoh}
                    onChange={(e) => setFormPoh(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Jabatan / Position *</label>
                  <Input
                    placeholder="Contoh: Serviceman"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Seksi / Section *</label>
                  <Input
                    placeholder="Contoh: Service Operation MVC"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Join Date *</label>
                  <Input
                    type="date"
                    value={formJoinDate}
                    onChange={(e) => setFormJoinDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Remark *</label>
                  <Select value={formRemark} onValueChange={setFormRemark}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pilih Jenis Masuk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Hire">New Hire</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                      <SelectItem value="Re Hire">Re Hire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateIncoming}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Karyawan Masuk'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-border/70 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-muted/40 via-muted/20 to-transparent border-b border-border/50 py-3.5 px-5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <UserPlus className="h-4 w-4" />
              </div>
              Daftar Karyawan Masuk
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40">
            {filteredData.length} Karyawan Masuk
          </Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">Nama Karyawan</th>
                <th className="py-2.5 px-3">SN</th>
                <th className="py-2.5 px-3">Position</th>
                <th className="py-2.5 px-3">Section</th>
                <th className="py-2.5 px-3">POH</th>
                <th className="py-2.5 px-3">Join Date</th>
                <th className="py-2.5 px-3">Remark</th>
                <th className="py-2.5 px-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    Tidak ada data karyawan masuk yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 text-center text-muted-foreground font-mono">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-foreground">
                      {item.name}
                    </td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">
                      {item.employeeSn}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {item.position}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {item.section}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {item.pointOfHire}
                    </td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">
                      {item.movementDate
                        ? format(new Date(item.movementDate), 'dd/MM/yyyy')
                        : '-'}
                    </td>
                    <td className="py-2 px-3">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-medium ${
                          item.remark.toLowerCase().includes('transfer')
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : item.remark.toLowerCase().includes('re')
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {item.remark}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        onClick={() => handleDelete(item.id, item.name)}
                        title="Hapus data"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
