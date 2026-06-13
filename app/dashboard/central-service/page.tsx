'use client'

import { useActionState, useEffect, useMemo, useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Plus,
  Check,
  X,
  Search,
  Upload,
  Download,
  RefreshCw,
  Filter,
  Users,
  MapPin,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  MoreVertical,
} from 'lucide-react'

import { AdminMetricGrid } from '@/components/admin-metric-grid'
import { AdminPageShell } from '@/components/admin-page-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  levelName: string
  employmentStatus: string
  gender: string
  religion: string
  education: string
  joinDate: string | null
  contractDurationStart: string | null
  contractDurationEnd: string | null
  permanentDate: string | null
  birthDate: string | null
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

const COLUMNS = [
  { key: 'sn', label: 'SN' },
  { key: 'name', label: 'Nama' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'section', label: 'Section' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'site', label: 'Site' },
  { key: 'status', label: 'Status' },
  { key: 'contractLeft', label: 'Contract Left' },
] as const

const DETAIL_COLUMNS = [
  { key: 'levelStaff', label: 'Level Staff' },
  { key: 'gender', label: 'Gender' },
  { key: 'agama', label: 'Agama' },
  { key: 'pendidikan', label: 'Pendidikan' },
  { key: 'joinDate', label: 'Join Date' },
  { key: 'contractStart', label: 'Contract Start' },
  { key: 'contractEnd', label: 'Contract End' },
  { key: 'permanentDate', label: 'Permanent Date' },
  { key: 'tglLahir', label: 'Tgl Lahir' },
] as const

const ALL_COLUMNS = [...COLUMNS, ...DETAIL_COLUMNS] as readonly { key: string; label: string }[]

function getContractLeftDays(contractEnd: string | null): number | null {
  if (!contractEnd) return null
  const end = new Date(contractEnd)
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function ContractLeftBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground text-sm">-</span>
  if (days <= 0) return <Badge variant="outline" className="bg-red-50 text-red-700 rounded-full border-0 px-2.5 py-0.5 text-[10px] font-semibold">Lewat {Math.abs(days)} hari</Badge>
  if (days <= 30) return <Badge variant="outline" className="bg-orange-50 text-orange-600 rounded-full border-0 px-2.5 py-0.5 text-[10px] font-semibold">{days} hari</Badge>
  if (days <= 90) return <Badge variant="outline" className="bg-amber-50 text-amber-600 rounded-full border-0 px-2.5 py-0.5 text-[10px] font-semibold">{days} hari</Badge>
  return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 rounded-full border-0 px-2.5 py-0.5 text-[10px] font-semibold">{days} hari</Badge>
}

// ─── MultiSelectDropdown ──────────────────────────────────────────────────────

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  label,
}: {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} dipilih`

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option))
      return
    }
    onChange([...selected, option])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="bg-surface-container-lowest text-muted-foreground hover:bg-surface-container-lowest h-9 min-w-[160px] justify-between rounded-xl border-0 px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
        >
          <span className="truncate">{displayText}</span>
          <Filter className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`Cari ${label.toLowerCase()}...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          <CommandList className="max-h-[220px]">
            <CommandEmpty>Tidak ada {label.toLowerCase()}.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  onSelect={() => toggleOption(option)}
                  className="flex items-center gap-2 px-2 py-2"
                >
                  <Checkbox checked={selected.includes(option)} />
                  <span className="flex-1 truncate text-sm">{option}</span>
                  {selected.includes(option) ? <Check className="text-primary size-4" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 ? (
            <div className="border-border/70 border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                className="text-muted-foreground h-8 w-full justify-center text-xs"
              >
                Bersihkan pilihan
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <Badge
      variant="secondary"
      className="surface-chip text-foreground flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium"
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:bg-surface-container-low grid size-4 place-items-center rounded-full transition"
        aria-label="Hapus filter"
      >
        <X className="size-3" />
      </button>
    </Badge>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CentralServicePage() {
  const router = useRouter()
  const [isRefreshing, startRefreshTransition] = useTransition()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [syncFilter, setSyncFilter] = useState('all')
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ ...EMPTY_NEW_EMPLOYEE })
  const [saving, setSaving] = useState(false)

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    sn: true, name: true, email: true, department: true, section: true,
    jobTitle: true, site: true, status: true, contractLeft: true,
    levelStaff: false, gender: false, agama: false, pendidikan: false,
    joinDate: false, contractStart: false, contractEnd: false,
    permanentDate: false, tglLahir: false,
  })
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<string>('contractLeft')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    fetchEmployees()
  }, [search, syncFilter, page, pageSize])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', String(pageSize))
      params.append('page', String(page))
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
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalCount(data.pagination?.total || parsed.length)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const sectionOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.section).filter(Boolean))).sort(),
    [employees]
  )
  const siteOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.site).filter(Boolean))).sort(),
    [employees]
  )
  const statusOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.employmentStatus).filter(Boolean))).sort(),
    [employees]
  )

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = employees.filter((emp) => {
      const haystack = [emp.employeeSn, emp.fullName, emp.email, emp.section, emp.site, emp.department, emp.position]
        .join(' ')
        .toLowerCase()
      const matchesKeyword = !query || haystack.includes(query)
      const matchesSection = selectedSections.length === 0 || selectedSections.includes(emp.section)
      const matchesSite = selectedSites.length === 0 || selectedSites.includes(emp.site)
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(emp.employmentStatus)
      const matchesSync =
        syncFilter === 'all' ||
        (syncFilter === 'synced' && emp.isSyncedToUserManagement) ||
        (syncFilter === 'unsynced' && !emp.isSyncedToUserManagement)
      return matchesKeyword && matchesSection && matchesSite && matchesStatus && matchesSync
    })

    if (!sortKey) return filtered

    const getSortVal = (e: Employee): string => {
      switch (sortKey) {
        case 'sn': return e.employeeSn
        case 'name': return e.fullName
        case 'email': return e.email ?? ''
        case 'department': return e.department
        case 'section': return e.section
        case 'jobTitle': return e.position
        case 'levelStaff': return e.levelName ?? ''
        case 'site': return e.site
        case 'status': return e.employmentStatus
        case 'gender': return e.gender ?? ''
        case 'agama': return e.religion ?? ''
        case 'pendidikan': return e.education ?? ''
        case 'joinDate': return e.joinDate ?? ''
        case 'contractStart': return e.contractDurationStart ?? ''
        case 'contractEnd': return e.contractDurationEnd ?? ''
        case 'contractLeft': return String(getContractLeftDays(e.contractDurationEnd) ?? 999999)
        case 'permanentDate': return e.permanentDate ?? ''
        case 'tglLahir': return e.birthDate ?? ''
        default: return ''
      }
    }

    return [...filtered].sort((a, b) => {
      const va = getSortVal(a)
      const vb = getSortVal(b)
      const cmp = va.localeCompare(vb)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [employees, search, selectedSections, selectedSites, selectedStatuses, syncFilter, sortKey, sortDir])

  const dynamicStats = useMemo(() => {
    const total = filteredEmployees.length
    const active = filteredEmployees.filter((e) => e.employmentStatus === 'active').length
    const synced = filteredEmployees.filter((e) => e.isSyncedToUserManagement).length
    const unsynced = total - synced
    const sitesCount = filteredEmployees.reduce(
      (acc, emp) => {
        if (!emp.site) return acc
        acc[emp.site] = (acc[emp.site] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    const topSite = Object.entries(sitesCount).sort((a, b) => b[1] - a[1])[0] || ['-', 0]
    return { total, active, synced, unsynced, topSite }
  }, [filteredEmployees])

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedSections.length > 0 ||
    selectedSites.length > 0 ||
    selectedStatuses.length > 0 ||
    syncFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setSelectedSections([])
    setSelectedSites([])
    setSelectedStatuses([])
    setSyncFilter('all')
  }

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

  function exportVisibleEmployees() {
    if (filteredEmployees.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }
    const headers = ['SN', 'Nama', 'Email', 'Department', 'Section', 'Job Title', 'Level Staff', 'Site', 'Status', 'Gender', 'Agama', 'Pendidikan', 'Join Date', 'Contract Start', 'Contract End', 'Contract Left', 'Permanent Date', 'Tgl Lahir']
    const rows = filteredEmployees.map((emp) => [
      emp.employeeSn, emp.fullName, emp.email || '', emp.department, emp.section || '',
      emp.position, emp.levelName || '-', emp.site || '', emp.employmentStatus,
      emp.gender || '-', emp.religion || '-', emp.education || '-', emp.joinDate || '-',
      emp.contractDurationStart || '-', emp.contractDurationEnd || '-',
      getContractLeftDays(emp.contractDurationEnd) ?? '-', emp.permanentDate || '-',
      emp.birthDate || '-',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(';'),
      ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `central-service-employees_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Berhasil mengunduh data!')
  }

  return (
    <AdminPageShell
      eyebrow="Central Services"
      title="Central Service Employees"
      description="Kelola semua karyawan Central Service dalam satu workspace table-first."
      badge={`${filteredEmployees.length}/${totalCount} visible`}
      actions={
        <>
          <input
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
            className="bg-surface-container-lowest text-muted-foreground h-10 rounded-xl border-0 px-4 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
            onClick={() => document.getElementById('import-file')?.click()}
          >
            <Upload className="size-4" />
            Import Excel
          </Button>
          <Button
            variant="outline"
            className="bg-surface-container-lowest text-muted-foreground h-10 rounded-xl border-0 px-4 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
            onClick={() => window.location.href = '/dashboard/hc/contract-review/form'}
          >
            <FileText className="size-4" />
            Contract Review
          </Button>
          <Button
            variant="outline"
            className="bg-surface-container-lowest text-muted-foreground h-10 rounded-xl border-0 px-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
            onClick={() => startRefreshTransition(() => router.refresh())}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-primary text-primary-foreground h-10 rounded-xl px-4 text-sm font-semibold"
          >
            <Plus className="mr-1.5 size-4" />
            Tambah Karyawan
          </Button>
        </>
      }
    >
      <AdminMetricGrid
        items={[
          {
            label: 'Total Karyawan',
            value: dynamicStats.total.toLocaleString(),
            meta: 'Semua karyawan Central Service.',
          },
          {
            label: 'Active',
            value: dynamicStats.active.toLocaleString(),
            meta: 'Karyawan dengan status aktif.',
          },
          {
            label: 'Not Synced',
            value: dynamicStats.unsynced.toLocaleString(),
            meta: 'Belum sync ke User Management.',
          },
          {
            label: 'Top Site',
            value: String(dynamicStats.topSite[0]),
            meta: `${dynamicStats.topSite[1]} karyawan`,
          },
        ]}
      />

      {hasActiveFilters ? (
        <div className="surface-muted-card rounded-[1rem] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {search.trim() ? (
              <FilterChip onRemove={() => setSearch('')}>
                Cari: {search.trim()}
              </FilterChip>
            ) : null}
            {selectedSections.map((section) => (
              <FilterChip
                key={section}
                onRemove={() => setSelectedSections((c) => c.filter((s) => s !== section))}
              >
                Section: {section}
              </FilterChip>
            ))}
            {selectedSites.map((site) => (
              <FilterChip
                key={site}
                onRemove={() => setSelectedSites((c) => c.filter((s) => s !== site))}
              >
                Site: {site}
              </FilterChip>
            ))}
            {selectedStatuses.map((status) => (
              <FilterChip
                key={status}
                onRemove={() => setSelectedStatuses((c) => c.filter((s) => s !== status))}
              >
                Status: {status}
              </FilterChip>
            ))}
            {syncFilter !== 'all' ? (
              <FilterChip onRemove={() => setSyncFilter('all')}>
                Sync: {syncFilter === 'synced' ? 'Synced' : 'Not Synced'}
              </FilterChip>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground h-8 rounded-full px-3 text-xs"
            >
              Reset semua
            </Button>
          </div>
        </div>
      ) : null}

      <div className="surface-module-card rounded-[1.2rem] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-foreground text-sm font-semibold">Daftar Karyawan</p>
            <p className="text-muted-foreground text-xs">Filter, cari, dan kelola data karyawan Central Service.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[220px] sm:flex-none">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Cari nama, SN, atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-surface-container-lowest h-9 rounded-xl border-0 pl-9 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
              />
            </div>
            <MultiSelectDropdown
              options={sectionOptions}
              selected={selectedSections}
              onChange={setSelectedSections}
              placeholder="Semua section"
              label="Section"
            />
            <MultiSelectDropdown
              options={siteOptions}
              selected={selectedSites}
              onChange={setSelectedSites}
              placeholder="Semua site"
              label="Site"
            />
            <MultiSelectDropdown
              options={statusOptions}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Semua status"
              label="Status"
            />
            <Select value={syncFilter} onValueChange={setSyncFilter}>
              <SelectTrigger className="bg-surface-container-lowest text-muted-foreground h-9 min-w-[160px] rounded-xl border-0 px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]">
                <SelectValue placeholder="Semua sync" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sync</SelectItem>
                <SelectItem value="synced">Synced Only</SelectItem>
                <SelectItem value="unsynced">Not Synced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (expandedRows.size === filteredEmployees.length) {
                setExpandedRows(new Set())
              } else {
                setExpandedRows(new Set(filteredEmployees.map((e) => e.id)))
              }
            }}
            className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
          >
            {expandedRows.size === filteredEmployees.length ? (
              <><ChevronDown className="mr-1.5 size-3.5" /> Collapse All</>
            ) : (
              <><ChevronRight className="mr-1.5 size-3.5" /> Expand All</>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
              >
                <Eye className="mr-1.5 size-3.5" />
                Kolom
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              {ALL_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={columnVisibility[col.key]}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, [col.key]: checked }))
                  }
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={exportVisibleEmployees}
            className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
          >
            <Download className="mr-1.5 size-3.5" />
            Export
          </Button>
        </div>

        <div className="bg-surface-container-low overflow-x-auto rounded-[1rem] p-2">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8" />
                {COLUMNS.map((col) => {
                  const widths: Record<string, string> = { sn: 'w-16', name: 'w-44', email: 'w-36', department: 'w-32', section: 'w-36', jobTitle: 'w-36', site: 'w-32', status: 'w-20', contractLeft: 'w-24' }
                  return columnVisibility[col.key] ? (
                    <TableHead
                      key={col.key}
                      className={['cursor-pointer select-none', widths[col.key] || ''].join(' ')}
                      onClick={() => {
                        if (sortKey === col.key) {
                          setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortKey(col.key)
                          setSortDir('asc')
                        }
                      }}
                    >
                      {col.label}
                    </TableHead>
                  ) : null
                })}
                <TableHead className="w-16">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-muted-foreground py-12 text-center text-sm">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const isExpanded = expandedRows.has(emp.id)
                  return (
                    <Fragment key={emp.id}>
                      <TableRow className="hover:bg-white/55">
                        <TableCell className="py-3.5 w-8">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground rounded p-0.5 transition"
                            onClick={() => {
                              setExpandedRows((prev) => {
                                const next = new Set(prev)
                                if (next.has(emp.id)) next.delete(emp.id)
                                else next.add(emp.id)
                                return next
                              })
                            }}
                          >
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </button>
                        </TableCell>
                        {columnVisibility.sn ? (
                          <TableCell className="py-3.5">
                            <span className="text-foreground/80 font-mono text-sm">{emp.employeeSn}</span>
                          </TableCell>
                        ) : null}
                        {columnVisibility.name ? (
                          <TableCell className="py-3.5">
                            <div className="min-w-0">
                              <p className="text-foreground truncate font-medium">{emp.fullName}</p>
                              <p className="text-muted-foreground truncate text-sm">{emp.phoneNumber || '-'}</p>
                            </div>
                          </TableCell>
                        ) : null}
                        {columnVisibility.email ? (
                          <TableCell className="py-3.5">
                            {emp.email ? (
                              <span className="text-foreground/85 text-sm truncate block">{emp.email}</span>
                            ) : (
                              <Badge variant="outline" className="text-xs">No Email</Badge>
                            )}
                          </TableCell>
                        ) : null}
                        {columnVisibility.department ? (
                          <TableCell className="py-3.5">
                            <span className="text-muted-foreground text-sm truncate block">{emp.department}</span>
                          </TableCell>
                        ) : null}
                        {columnVisibility.section ? (
                          <TableCell className="text-foreground/85 py-3.5 text-sm truncate max-w-0">{emp.section || '-'}</TableCell>
                        ) : null}
                        {columnVisibility.jobTitle ? (
                          <TableCell className="py-3.5">
                            <span className="text-foreground/85 text-sm truncate block">{emp.position || '-'}</span>
                          </TableCell>
                        ) : null}
                        {columnVisibility.site ? (
                          <TableCell className="text-foreground/85 py-3.5 text-sm truncate max-w-0">{emp.site || '-'}</TableCell>
                        ) : null}
                        {columnVisibility.status ? (
                          <TableCell className="py-3.5">
                            <Badge
                              variant={emp.employmentStatus === 'active' ? 'default' : 'secondary'}
                              className="rounded-full"
                            >
                              {emp.employmentStatus}
                            </Badge>
                          </TableCell>
                        ) : null}
                        {columnVisibility.contractLeft ? (
                          <TableCell className="py-3.5">
                            <ContractLeftBadge days={getContractLeftDays(emp.contractDurationEnd)} />
                          </TableCell>
                        ) : null}
                        <TableCell className="py-3.5 text-right w-[100px]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[160px]">
                              <DropdownMenuItem onClick={() => setViewEmployee(emp)}>
                                <Eye className="mr-2 h-4 w-4" /> Detail
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.location.href = `/dashboard/hc/contract-review/form?employeeSn=${emp.employeeSn}`}>
                                <FileText className="mr-2 h-4 w-4" /> Contract Review
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditEmployee(emp)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(emp.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell colSpan={1 + COLUMNS.filter(c => columnVisibility[c.key]).length} className="py-1.5 px-4">
                            <div className="flex flex-wrap gap-x-6 gap-y-0.5 text-xs">
                              <div className="w-36"><span className="text-muted-foreground font-semibold uppercase">Level Staff</span><p className="truncate">{emp.levelName || '-'}</p></div>
                              <div className="w-20"><span className="text-muted-foreground font-semibold uppercase">Gender</span><p className="truncate">{emp.gender || '-'}</p></div>
                              <div className="w-20"><span className="text-muted-foreground font-semibold uppercase">Agama</span><p className="truncate">{emp.religion || '-'}</p></div>
                              <div className="w-28"><span className="text-muted-foreground font-semibold uppercase">Pendidikan</span><p className="truncate">{emp.education || '-'}</p></div>
                              <div className="w-24"><span className="text-muted-foreground font-semibold uppercase">Join Date</span><p className="truncate">{emp.joinDate || '-'}</p></div>
                              <div className="w-24"><span className="text-muted-foreground font-semibold uppercase">Contract Start</span><p className="truncate">{emp.contractDurationStart || '-'}</p></div>
                              <div className="w-24"><span className="text-muted-foreground font-semibold uppercase">Contract End</span><p className="truncate">{emp.contractDurationEnd || '-'}</p></div>
                              <div className="w-24"><span className="text-muted-foreground font-semibold uppercase">Permanent</span><p className="truncate">{emp.permanentDate || '-'}</p></div>
                              <div className="w-24"><span className="text-muted-foreground font-semibold uppercase">Tgl Lahir</span><p className="truncate">{emp.birthDate || '-'}</p></div>
                            </div>
                          </TableCell>
                          <TableCell className="w-16" />
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="text-muted-foreground py-12 text-center text-sm">
                    Tidak ada karyawan yang cocok dengan filter saat ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Menampilkan halaman {page} dari {totalPages} ({totalCount} total karyawan)
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-4" /> Sebelumnya
            </Button>
            <span className="text-muted-foreground text-xs">Halaman {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Selanjutnya <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(1) }}>
              <SelectTrigger className="h-8 w-28 rounded-lg border-0 bg-white text-xs shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 baris</SelectItem>
                <SelectItem value="25">25 baris</SelectItem>
                <SelectItem value="50">50 baris</SelectItem>
                <SelectItem value="100">100 baris</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="surface-muted-card rounded-[1rem] p-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
              <Users className="size-4" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase">Total scope</p>
              <p className="text-foreground text-sm font-medium">
                {totalCount.toLocaleString()} karyawan terdaftar
              </p>
            </div>
          </div>
        </div>
        <div className="surface-muted-card rounded-[1rem] p-4">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-100 text-emerald-700 grid size-10 place-items-center rounded-xl">
              <CheckCircle className="size-4" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase">Synced</p>
              <p className="text-foreground text-sm font-medium">
                {dynamicStats.synced.toLocaleString()} sudah sync
              </p>
            </div>
          </div>
        </div>
        <div className="surface-muted-card rounded-[1rem] p-4">
          <div className="flex items-center gap-3">
            <span className="bg-orange-100 text-orange-600 grid size-10 place-items-center rounded-xl">
              <MapPin className="size-4" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase">Current view</p>
              <p className="text-foreground text-sm font-medium">
                {filteredEmployees.length.toLocaleString()} karyawan ditampilkan
              </p>
            </div>
          </div>
        </div>
      </div>

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
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
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
                <Badge variant={viewEmployee.employmentStatus === 'active' ? 'default' : 'secondary'}>
                  {viewEmployee.employmentStatus}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Sync Status</Label>
                <div className="mt-1">
                  {viewEmployee.isSyncedToUserManagement ? (
                    <Badge className="bg-emerald-50 text-emerald-700">
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
            <Button variant="outline" onClick={() => setViewEmployee(null)}>Tutup</Button>
            <Button onClick={() => { setEditEmployee(viewEmployee); setViewEmployee(null) }}>Edit</Button>
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
                  onChange={(e) => setEditEmployee({ ...editEmployee, phoneNumber: e.target.value })}
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
                  onChange={(e) => setEditEmployee({ ...editEmployee, site: e.target.value, siteName: e.target.value })}
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
            <Button variant="outline" onClick={() => setEditEmployee(null)}>Batal</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
