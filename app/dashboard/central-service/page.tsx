'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Plus,
  Check,
  ChevronDown,
  X,
  Search,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  id: number
  employeeSn: string
  fullName: string
  email: string | null
  phoneNumber: string | null
  siteName: string
  section: string
  site: string
  department: string
  position: string
  employmentStatus: string
  isSyncedToUserManagement: boolean
}

const EMPTY_NEW_EMPLOYEE = {
  employeeSn: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  siteName: '',
  section: '',
  department: 'Central Services',
  position: '',
  employmentStatus: 'active',
  employmentType: 'permanent',
}

// ─── MultiSelectFilter ────────────────────────────────────────────────────────

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  }, [options, query])

  const displayLabel =
    selected.length === 0
      ? `Semua ${label}`
      : selected.length === 1
        ? selected[0]
        : `${selected.length} ${label}`

  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="border-border/70 hover:bg-muted/40 h-9 w-[200px] justify-between rounded-lg bg-white px-3 text-[13px] font-medium shadow-none"
        >
          <span className="truncate text-left">{displayLabel}</span>
          <div className="flex items-center gap-1">
            {selected.length > 0 && (
              <X
                className="text-muted-foreground hover:text-foreground size-3.5"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
              />
            )}
            <ChevronDown className="text-muted-foreground size-4" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="border-border/80 w-[260px] rounded-xl border bg-white p-2 shadow-lg"
      >
        <div className="relative mb-2">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cari ${label.toLowerCase()}...`}
            className="border-border/70 bg-muted/30 h-9 rounded-lg pl-9 shadow-none"
            autoFocus
          />
        </div>
        <div className="border-border/60 max-h-64 overflow-auto rounded-lg border bg-white p-1">
          <button
            type="button"
            className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm"
            onClick={() => onChange([])}
          >
            <span>Semua {label}</span>
            {selected.length > 0 && <X className="text-muted-foreground size-4" />}
          </button>
          {filtered.length === 0 && (
            <p className="text-muted-foreground px-3 py-2 text-sm">Tidak ditemukan</p>
          )}
          {filtered.map((opt) => {
            const isSelected = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm"
                onClick={() => toggle(opt)}
              >
                <span
                  className={cn(
                    'border-border/80 grid size-4 flex-shrink-0 place-items-center rounded border bg-white',
                    isSelected && 'border-primary bg-primary text-primary-foreground'
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                </span>
                <span className="truncate">{opt}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CentralServicePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [syncFilter, setSyncFilter] = useState('all')
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [stats, setStats] = useState({ total: 0, synced: 0, unsynced: 0 })

  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ ...EMPTY_NEW_EMPLOYEE })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [search, syncFilter])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', '10000') // unlimited scroll
      if (search) params.append('search', search)
      if (syncFilter !== 'all') params.append('syncStatus', syncFilter)
      const response = await fetch(`/api/central-service/employees?${params}`)
      const data = await response.json()
      if (data.success) {
        const parsed = data.data.map((emp: Employee) => ({
          ...emp,
          site: emp.siteName,
        }))
        setEmployees(parsed)
        setStats(data.stats)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Unique options derived from loaded data
  const sectionOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.section).filter(Boolean))).sort(),
    [employees]
  )
  const siteOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.site).filter(Boolean))).sort(),
    [employees]
  )

  // Client-side filter
  const visibleEmployees = useMemo(
    () =>
      employees.filter((emp) => {
        if (selectedSections.length > 0 && !selectedSections.includes(emp.section)) return false
        if (selectedSites.length > 0 && !selectedSites.includes(emp.site)) return false
        return true
      }),
    [employees, selectedSections, selectedSites]
  )

  const dynamicStats = useMemo(() => {
    const total = visibleEmployees.length
    const active = visibleEmployees.filter((e) => e.employmentStatus === 'active').length
    const inactive = total - active
    const synced = visibleEmployees.filter((e) => e.isSyncedToUserManagement).length
    const unsynced = total - synced

    const sitesCount = visibleEmployees.reduce(
      (acc, emp) => {
        if (!emp.site) return acc
        acc[emp.site] = (acc[emp.site] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    const topSite = Object.entries(sitesCount).sort((a, b) => b[1] - a[1])[0] || ['-', 0]

    return { total, active, inactive, synced, unsynced, topSite }
  }, [visibleEmployees])

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus karyawan ini?')) return
    try {
      const res = await fetch(`/api/central-service/employees/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchEmployees()
        toast.success('Karyawan berhasil dihapus')
      } else toast.error('Gagal menghapus')
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  const handleSaveEdit = async () => {
    if (!editEmployee) return
    setSaving(true)
    try {
      const res = await fetch(`/api/central-service/employees/${editEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEmployee),
      })
      if (res.ok) {
        fetchEmployees()
        setEditEmployee(null)
        toast.success('Data berhasil diperbarui')
      } else toast.error('Gagal menyimpan')
    } catch {
      toast.error('Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.employeeSn || !newEmployee.fullName) {
      toast.error('SN dan Nama wajib diisi')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/central-service/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEmployee,
          email: newEmployee.email || null,
          phoneNumber: newEmployee.phoneNumber || null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        fetchEmployees()
        setAddOpen(false)
        setNewEmployee({ ...EMPTY_NEW_EMPLOYEE })
        toast.success('Karyawan berhasil ditambahkan')
      } else {
        toast.error(data.error || 'Gagal menambahkan karyawan')
      }
    } catch {
      toast.error('Gagal menambahkan karyawan')
    } finally {
      setSaving(false)
    }
  }
  const handleExportExcel = () => {
    if (visibleEmployees.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }

    const headers = [
      'SN',
      'Nama',
      'Email',
      'Section',
      'Site',
      'Department',
      'Position',
      'Status',
      'Sync',
    ]

    const rows = visibleEmployees.map((emp) => [
      emp.employeeSn,
      emp.fullName,
      emp.email || '',
      emp.section || '',
      emp.site || '',
      emp.department || '',
      emp.position || '',
      emp.employmentStatus,
      emp.isSyncedToUserManagement ? 'Synced' : 'Not Synced',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        headers.join(';'),
        ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')),
      ].join('\r\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `employee_central_service_${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Berhasil mengunduh data!')
  }

  return (
    <div className="container mx-auto space-y-5 py-5">
      <div className="admin-daily-card rounded-[1.1rem] px-5 py-4">
        <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight">
          Central Service Employees
        </h1>
        <p className="text-muted-foreground text-sm">Kelola semua karyawan Central Service</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="surface-module-card border-0 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm font-medium">Total Karyawan</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-foreground text-2xl font-bold">{dynamicStats.total}</h2>
                  <span className="text-muted-foreground text-xs font-medium">Karyawan</span>
                </div>
              </div>
              <div className="bg-primary/10 text-primary rounded-xl p-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-module-card border-0 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm font-medium">Active Employees</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-foreground text-2xl font-bold">{dynamicStats.active}</h2>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <CheckCircle className="size-3" /> Aktif
                  </span>
                </div>
              </div>
              <div className="bg-primary/10 text-primary rounded-xl p-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-module-card border-0 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm font-medium">Not Synced</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-foreground text-2xl font-bold">{dynamicStats.unsynced}</h2>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    Butuh Sync
                  </span>
                </div>
              </div>
              <div className="bg-primary/10 text-primary rounded-xl p-3" />
            </div>
            {dynamicStats.total > 0 && (
              <div className="bg-surface-container-low mt-4 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${(dynamicStats.synced / dynamicStats.total) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-module-card border-0 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm font-medium">Top Site</p>
                <div className="flex flex-col">
                  <h2
                    className="text-foreground max-w-[120px] truncate text-xl font-bold"
                    title={String(dynamicStats.topSite[0])}
                  >
                    {dynamicStats.topSite[0]}
                  </h2>
                  <span className="text-muted-foreground text-xs font-medium">
                    {dynamicStats.topSite[1]} Karyawan
                  </span>
                </div>
              </div>
              <div className="bg-primary/10 text-primary rounded-xl p-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="surface-module-card rounded-[1.1rem] border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employee List</CardTitle>
              <CardDescription>Import dari Excel atau tambah manual</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                id="import-file"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const formData = new FormData()
                  formData.append('file', file)
                  formData.append('userId', 'current-user-id')
                  try {
                    const res = await fetch('/api/central-service/employees/import', {
                      method: 'POST',
                      body: formData,
                    })
                    const result = await res.json()
                    if (result.success) {
                      fetchEmployees()
                      toast.success(`Import selesai! ${result.successCount} berhasil`)
                    } else toast.error('Import gagal')
                  } catch {
                    toast.error('Import gagal')
                  }
                  e.target.value = ''
                }}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Excel
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Karyawan
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="bg-surface-container-low flex flex-wrap items-center gap-2 rounded-xl p-2">
            <Input
              placeholder="Cari nama, SN, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 max-w-[240px] bg-white"
            />
            <MultiSelectFilter
              label="Section"
              options={sectionOptions}
              selected={selectedSections}
              onChange={setSelectedSections}
            />
            <MultiSelectFilter
              label="Site"
              options={siteOptions}
              selected={selectedSites}
              onChange={setSelectedSites}
            />
            <Select value={syncFilter} onValueChange={setSyncFilter}>
              <SelectTrigger className="h-9 w-[160px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="synced">Synced Only</SelectItem>
                <SelectItem value="unsynced">Not Synced</SelectItem>
              </SelectContent>
            </Select>
            {(selectedSections.length > 0 || selectedSites.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setSelectedSections([])
                  setSelectedSites([])
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Reset Filter
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="ring-border/60 scrollbar-thin scrollbar-thumb-accent relative max-h-[600px] overflow-y-auto rounded-xl bg-white ring-1">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
                <TableRow>
                  <TableHead>SN</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Level Staff</TableHead>
                  <TableHead>Site/Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Agama</TableHead>
                  <TableHead>Pendidikan</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Contract Start</TableHead>
                  <TableHead>Contract End</TableHead>
                  <TableHead>Permanent Date</TableHead>
                  <TableHead>Tgl Lahir</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={19} className="text-muted-foreground py-10 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : visibleEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={19} className="text-muted-foreground py-10 text-center">
                      Tidak ada karyawan ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleEmployees.map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm">{emp.employeeSn}</TableCell>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell>
                        {emp.email || (
                          <Badge variant="outline" className="text-xs">
                            No Email
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>
                        {emp.section || (
                          <Badge variant="outline" className="text-xs">
                            -
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell>{emp.levelName || '-'}</TableCell>
                      <TableCell>
                        {emp.site || (
                          <Badge variant="outline" className="text-xs">
                            -
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={emp.employmentStatus === 'active' ? 'default' : 'secondary'}
                        >
                          {emp.employmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{emp.gender || '-'}</TableCell>
                      <TableCell>{emp.religion || '-'}</TableCell>
                      <TableCell>{emp.education || '-'}</TableCell>
                      <TableCell>{emp.joinDate || '-'}</TableCell>
                      <TableCell>{emp.contractDurationStart || '-'}</TableCell>
                      <TableCell>{emp.contractDurationEnd || '-'}</TableCell>
                      <TableCell>{emp.permanentDate || '-'}</TableCell>
                      <TableCell>{emp.birthDate || '-'}</TableCell>
                      <TableCell>
                        {emp.isSyncedToUserManagement ? (
                          <Badge className="bg-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Synced
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Not Synced
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewEmployee(emp)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditEmployee(emp)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(emp.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground text-xs">
            Menampilkan {visibleEmployees.length} dari {employees.length} karyawan
          </p>
        </CardContent>
      </Card>

      {/* ── Add Employee Dialog ── */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o)
          if (!o) setNewEmployee({ ...EMPTY_NEW_EMPLOYEE })
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Karyawan</DialogTitle>
            <DialogDescription>Isi data karyawan baru. SN dan Nama wajib diisi.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employee SN *</Label>
              <Input
                placeholder="51468"
                value={newEmployee.employeeSn}
                onChange={(e) => setNewEmployee({ ...newEmployee, employeeSn: e.target.value })}
              />
            </div>
            <div>
              <Label>Full Name *</Label>
              <Input
                placeholder="Nama lengkap"
                value={newEmployee.fullName}
                onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@company.com (opsional)"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
              />
            </div>
            <div>
              <Label>No. HP</Label>
              <Input
                placeholder="+62..."
                value={newEmployee.phoneNumber}
                onChange={(e) => setNewEmployee({ ...newEmployee, phoneNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Section</Label>
              <Input
                placeholder="Service Operation, Repair, dll"
                value={newEmployee.section}
                onChange={(e) => setNewEmployee({ ...newEmployee, section: e.target.value })}
              />
            </div>
            <div>
              <Label>Site / Lokasi</Label>
              <Input
                placeholder="Gresik, Balikpapan, dll"
                value={newEmployee.siteName}
                onChange={(e) => setNewEmployee({ ...newEmployee, siteName: e.target.value })}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                value={newEmployee.department}
                onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
              />
            </div>
            <div>
              <Label>Position / Jabatan</Label>
              <Input
                placeholder="Technician, Staff, dll"
                value={newEmployee.position}
                onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
              />
            </div>
            <div>
              <Label>Employment Status</Label>
              <Select
                value={newEmployee.employmentStatus}
                onValueChange={(v) => setNewEmployee({ ...newEmployee, employmentStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select
                value={newEmployee.employmentType}
                onValueChange={(v) => setNewEmployee({ ...newEmployee, employmentType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="outsource">Outsource</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddEmployee} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ── */}
      <Dialog open={!!viewEmployee} onOpenChange={(o) => !o && setViewEmployee(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Karyawan</DialogTitle>
            <DialogDescription>Informasi lengkap karyawan</DialogDescription>
          </DialogHeader>
          {viewEmployee && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Employee SN</Label>
                <p className="font-mono">{viewEmployee.employeeSn}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Full Name</Label>
                <p className="font-medium">{viewEmployee.fullName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p>{viewEmployee.email || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Phone</Label>
                <p>{viewEmployee.phoneNumber || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Section</Label>
                <p>{viewEmployee.section || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Site</Label>
                <p>{viewEmployee.site || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Department</Label>
                <p>{viewEmployee.department}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Position</Label>
                <p>{viewEmployee.position}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <Badge
                  variant={viewEmployee.employmentStatus === 'active' ? 'default' : 'secondary'}
                >
                  {viewEmployee.employmentStatus}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Sync Status</Label>
                <div className="mt-1">
                  {viewEmployee.isSyncedToUserManagement ? (
                    <Badge className="bg-green-600">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Synced to User Management
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Not Synced
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewEmployee(null)}>
              Tutup
            </Button>
            <Button
              onClick={() => {
                setEditEmployee(viewEmployee)
                setViewEmployee(null)
              }}
            >
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editEmployee} onOpenChange={(o) => !o && setEditEmployee(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Karyawan</DialogTitle>
            <DialogDescription>Perbarui informasi karyawan</DialogDescription>
          </DialogHeader>
          {editEmployee && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employee SN</Label>
                <Input value={editEmployee.employeeSn} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={editEmployee.fullName}
                  onChange={(e) => setEditEmployee({ ...editEmployee, fullName: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editEmployee.email || ''}
                  onChange={(e) => setEditEmployee({ ...editEmployee, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={editEmployee.phoneNumber || ''}
                  onChange={(e) =>
                    setEditEmployee({ ...editEmployee, phoneNumber: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Section</Label>
                <Input
                  value={editEmployee.section}
                  onChange={(e) => setEditEmployee({ ...editEmployee, section: e.target.value })}
                />
              </div>
              <div>
                <Label>Site / Lokasi</Label>
                <Input
                  value={editEmployee.site}
                  onChange={(e) =>
                    setEditEmployee({
                      ...editEmployee,
                      site: e.target.value,
                      siteName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Position</Label>
                <Input
                  value={editEmployee.position}
                  onChange={(e) => setEditEmployee({ ...editEmployee, position: e.target.value })}
                />
              </div>
              <div>
                <Label>Employment Status</Label>
                <Select
                  value={editEmployee.employmentStatus}
                  onValueChange={(v) => setEditEmployee({ ...editEmployee, employmentStatus: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmployee(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
