'use client'

import React, { useState, useMemo } from 'react'
import { type HcTurnoverMovement } from '@/db/schema/hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  UserMinus,
  Search,
  Download,
  Trash2,
  Calendar,
  AlertTriangle,
  UserCheck,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createOutgoingMovementAction, deleteMovementAction } from '@/app/dashboard/hc/turnover/actions'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TurnoverOutgoingTableProps {
  outgoingList: HcTurnoverMovement[]
  options: {
    departments: { id: number; name: string }[]
    sections: { id: number; name: string }[]
    positions: { id: number; name: string }[]
    sites: { id: number; name: string }[]
    activeEmployees: any[]
  }
}

export function TurnoverOutgoingTable({
  outgoingList,
  options,
}: TurnoverOutgoingTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRemark, setSelectedRemark] = useState<string>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('manual')
  const [formName, setFormName] = useState('')
  const [formSn, setFormSn] = useState('')
  const [formPosition, setFormPosition] = useState('')
  const [formSection, setFormSection] = useState('')
  const [formPoh, setFormPoh] = useState('')
  const [formOutgoingDate, setFormOutgoingDate] = useState(new Date().toISOString().slice(0, 10))
  const [formRemark, setFormRemark] = useState('Resign')
  const [deactivateAccount, setDeactivateAccount] = useState(true)

  const [isComboboxOpen, setIsComboboxOpen] = useState(false)
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')

  const handleSelectEmployee = (val: string) => {
    setSelectedEmployeeId(val)
    if (val === 'manual') {
      return
    }
    const emp = options.activeEmployees.find((e) => String(e.id) === val)
    if (emp) {
      setFormName(emp.name || '')
      setFormSn(emp.employeeSn || '')
      setFormPosition(emp.jobTitle || '')
      setFormSection(emp.section || '')
      setFormPoh(emp.poh || emp.workLocation || 'Balikpapan')
    }
  }

  const filteredEmployeesForSelect = useMemo(() => {
    if (!employeeSearchQuery.trim()) {
      return options.activeEmployees.slice(0, 100)
    }
    const q = employeeSearchQuery.toLowerCase()
    return options.activeEmployees
      .filter((emp) => {
        const matchName = emp.name.toLowerCase().includes(q)
        const matchSn = (emp.employeeSn || '').toLowerCase().includes(q)
        const matchTitle = (emp.jobTitle || '').toLowerCase().includes(q)
        const matchSec = (emp.section || '').toLowerCase().includes(q)
        return matchName || matchSn || matchTitle || matchSec
      })
      .slice(0, 50)
  }, [options.activeEmployees, employeeSearchQuery])

  const selectedEmployeeLabel = useMemo(() => {
    if (selectedEmployeeId === 'manual') return '-- Input Manual / Bebas --'
    const found = options.activeEmployees.find((e) => String(e.id) === selectedEmployeeId)
    if (!found) return '-- Pilih Karyawan Aktif --'
    return `${found.name} (${found.employeeSn || 'No SN'}) - ${found.jobTitle || 'No Title'}`
  }, [selectedEmployeeId, options.activeEmployees])

  const filteredData = useMemo(() => {
    return outgoingList.filter((item) => {
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
  }, [outgoingList, searchTerm, selectedRemark])

  const handleCreateOutgoing = async () => {
    if (!formName.trim() || !formSn.trim() || !formPosition.trim() || !formSection.trim()) {
      toast.error('Mohon lengkapi Nama, SN, Jabatan, dan Seksi')
      return
    }

    setIsSubmitting(true)
    try {
      const empId = selectedEmployeeId !== 'manual' ? parseInt(selectedEmployeeId, 10) : null
      const res = await createOutgoingMovementAction({
        employeeId: empId,
        employeeName: formName,
        employeeSn: formSn,
        position: formPosition,
        section: formSection,
        poh: formPoh || 'Balikpapan',
        outgoingDate: formOutgoingDate,
        remark: formRemark,
        deactivateEmployeeAccount: deactivateAccount,
      })

      if (res.success) {
        toast.success(`Karyawan keluar ${formName} berhasil dicatat`)
        setIsAddOpen(false)
        // Reset form
        setSelectedEmployeeId('manual')
        setFormName('')
        setFormSn('')
        setFormPosition('')
        setFormSection('')
        setFormPoh('')
      } else {
        toast.error(res.error || 'Gagal menyimpan data karyawan keluar')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus catatan keluar untuk ${name}?`)) return

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
    const headers = ['No', 'Nama', 'SN', 'Position', 'Section', 'POH', 'Outgoing Date', 'Remark']
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
    link.setAttribute('download', `Karyawan_Keluar_${format(new Date(), 'yyyyMMdd')}.csv`)
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
            <SelectTrigger className="w-40 h-9 text-xs bg-card/80 border-border/70">
              <SelectValue placeholder="Remark" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Remark</SelectItem>
              <SelectItem value="Resign">Resign</SelectItem>
              <SelectItem value="Contract">Habis Kontrak</SelectItem>
              <SelectItem value="Terminate">Terminate / PHK</SelectItem>
              <SelectItem value="Pension">Pensiun</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCsv} className="h-9 text-xs gap-1.5 shadow-xs">
            <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export CSV
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 text-xs gap-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-xs">
                <UserMinus className="h-3.5 w-3.5" /> Tambah Karyawan Keluar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserMinus className="h-5 w-5 text-rose-600" />
                  Catat Karyawan Keluar (Outgoing)
                </DialogTitle>
                <DialogDescription>
                  Catat mutasi karyawan yang keluar (Resign, Habis Kontrak, PHK, atau Pensiun).
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 py-2 text-xs">
                <div className="col-span-2 space-y-1">
                  <label className="font-semibold text-foreground">
                    Pilih Dari User Management (Opsional)
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
                            setEmployeeSearchQuery('')
                          }}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/60 transition-colors flex items-center justify-between",
                            selectedEmployeeId === 'manual' && "bg-muted font-semibold text-primary"
                          )}
                        >
                          <span className="font-medium">-- Input Manual / Bebas --</span>
                          {selectedEmployeeId === 'manual' && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>

                        {filteredEmployeesForSelect.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground">
                            Tidak ada karyawan yang cocok dengan &quot;{employeeSearchQuery}&quot;
                          </div>
                        ) : (
                          filteredEmployeesForSelect.map((emp) => {
                            const isSelected = selectedEmployeeId === String(emp.id)
                            return (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => {
                                  handleSelectEmployee(String(emp.id))
                                  setIsComboboxOpen(false)
                                  setEmployeeSearchQuery('')
                                }}
                                className={cn(
                                  "w-full text-left px-2.5 py-2 text-xs rounded-md hover:bg-muted/60 transition-colors flex items-center justify-between gap-2",
                                  isSelected && "bg-primary/5 font-semibold text-primary"
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-foreground truncate">{emp.name}</div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono bg-muted px-1.5 py-0.2 rounded text-[10px]">
                                      {emp.employeeSn || 'No SN'}
                                    </span>
                                    <span>•</span>
                                    <span className="truncate">{emp.jobTitle || 'No Title'}</span>
                                    {emp.section && (
                                      <>
                                        <span>•</span>
                                        <span className="truncate text-muted-foreground/80">{emp.section}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="font-semibold text-foreground">Nama Karyawan *</label>
                  <Input
                    placeholder="Contoh: Akhmad Maulana"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Employee SN *</label>
                  <Input
                    placeholder="Contoh: 76950"
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
                  <label className="font-semibold text-foreground">Outgoing Date *</label>
                  <Input
                    type="date"
                    value={formOutgoingDate}
                    onChange={(e) => setFormOutgoingDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Remark *</label>
                  <Select value={formRemark} onValueChange={setFormRemark}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pilih Alasan Keluar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Resign">Resign</SelectItem>
                      <SelectItem value="Contract Complete">Habis Kontrak (Contract Complete)</SelectItem>
                      <SelectItem value="Terminate">Terminate / PHK</SelectItem>
                      <SelectItem value="Pension">Pensiun (Pension)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedEmployeeId !== 'manual' && (
                  <div className="col-span-2 pt-2 border-t border-border/50 flex items-center space-x-2">
                    <Checkbox
                      id="deactivateAccount"
                      checked={deactivateAccount}
                      onCheckedChange={(checked) => setDeactivateAccount(!!checked)}
                    />
                    <label
                      htmlFor="deactivateAccount"
                      className="text-xs text-foreground cursor-pointer flex items-center gap-1.5"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Otomatis nonaktifkan akun user di User Management
                    </label>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateOutgoing}
                  disabled={isSubmitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Karyawan Keluar'}
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
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <UserMinus className="h-4 w-4" />
              </div>
              Daftar Karyawan Keluar
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/40">
            {filteredData.length} Karyawan Keluar
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
                <th className="py-2.5 px-3">Outgoing Date</th>
                <th className="py-2.5 px-3">Remark</th>
                <th className="py-2.5 px-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    Tidak ada data karyawan keluar yang cocok dengan pencarian.
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
                          item.remark.toLowerCase().includes('contract')
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : item.remark.toLowerCase().includes('terminate')
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : item.remark.toLowerCase().includes('pension')
                            ? 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
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
