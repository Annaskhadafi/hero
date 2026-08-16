'use client'

import { Fragment, useActionState, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BriefcaseBusiness,
  Building2,
  Check,
  Download,
  EyeOff,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  Users2,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import {
  importSecurityUsersAction,
  importUpdateUsersAction,
  type ImportUsersActionState,
} from '@/app/dashboard/admin-actions'
import { AdminMetricGrid } from '@/components/admin-metric-grid'
import { AdminPageShell } from '@/components/admin-page-shell'
import { SecurityUserCreateDialog } from '@/components/security-user-create-dialog'
import { SecurityUserRowActions } from '@/components/security-user-row-actions'
import { SecurityUserDashboard } from '@/components/security-user-dashboard'
import { SecurityServicemanDashboard } from '@/components/security-serviceman-dashboard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { MinimalTableShell, exportRowsToFile } from '@/components/ui/minimal-table-shell'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type { SecurityUserRecord } from '@/lib/hero-admin'
import {
  USER_IMPORT_FIELDS,
  autoMapHeaders,
  parseCsvToRecords,
  type UserImportMapping,
} from '@/lib/security-user-import'
import { cn } from '@/lib/utils'

import { SecurityUserBulkActions } from '@/components/security-user-bulk-actions'

function getSiteDisplayName(user: Pick<SecurityUserRecord, 'siteName' | 'workLocation'>): string {
  return user.siteName || user.workLocation || '-'
}

const INITIAL_IMPORT_STATE: ImportUsersActionState = {
  status: 'idle',
  message: '',
}

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'sn', label: 'SN' },
  { key: 'department', label: 'Department' },
  { key: 'section', label: 'Section' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'levelStaff', label: 'Level Staff' },
  { key: 'peran', label: 'Peran' },
  { key: 'lokasiSite', label: 'Lokasi Site' },
  { key: 'tipeStatus', label: 'Tipe Status' },
  { key: 'gender', label: 'Gender' },
  { key: 'agama', label: 'Agama' },
  { key: 'pendidikan', label: 'Pendidikan' },
  { key: 'maritalStatus', label: 'Marital Status' },
  { key: 'poh', label: 'POH' },
  { key: 'joinDate', label: 'Join Date' },
  { key: 'contractStart', label: 'Contract Start' },
  { key: 'contractEnd', label: 'Contract End' },
  { key: 'permanentDate', label: 'Permanent Date' },
  { key: 'tglLahir', label: 'Tgl Lahir' },
  { key: 'statusAkun', label: 'Status Akun' },
] as const

function getUniqueOptions(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right)
  )
}

function toHeaderPreview(mapping: UserImportMapping) {
  return USER_IMPORT_FIELDS.map(
    (field) => `${field.label}: ${mapping[field.key] || 'belum dipilih'}`
  ).join('\n')
}

function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)

  if (parts.length === 0) {
    return 'U'
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

const getContractStatus = (endStr: string | null | undefined) => {
  if (!endStr) return { label: 'Belum Diatur', type: 'NONE' }
  
  const today = new Date()
  const end = new Date(endStr)
  const diffTime = end.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return { label: 'Contract Completed', type: 'COMPLETED' }
  if (diffDays <= 30) return { label: 'Will Expired', type: 'EXPIRING' }
  return { label: 'Contract Active', type: 'ACTIVE' }
}

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

export function SecurityUserManagement({
  users,
  roleOptions,
  sections,
  departments,
  positions,
  sites,
  canEdit = true,
  canDelete = true,
}: {
  users: SecurityUserRecord[]
  roleOptions: Array<{ id: number; name: string }>
  sections: Array<{ id: number; code: string; name: string; departmentId: number | null }>
  departments: Array<{ id: number; code: string; name: string }>
  positions: Array<{
    id: number
    code: string
    name: string
    siteLocation: string
    level: number
    departmentId: number | null
  }>
  sites: Array<{ id: number; name: string; location: string }>
  canEdit?: boolean
  canDelete?: boolean
}) {
  const router = useRouter()
  const [isRefreshing, startRefreshTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'directory' | 'dashboard' | 'serviceman-dashboard'>('directory')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedStatusTypes, setSelectedStatusTypes] = useState<string[]>([])
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [showUnlinkedLokasi, setShowUnlinkedLokasi] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    name: true, sn: true, department: true, section: true, jobTitle: true,
    levelStaff: false, peran: true, lokasiSite: true, tipeStatus: false,
    gender: false, agama: false, pendidikan: false, maritalStatus: false,
    poh: false, joinDate: false, contractStart: false, contractEnd: false,
    permanentDate: false, tglLahir: false, statusAkun: true,
  })
  const [expandedRowIds, setExpandedRowIds] = useState<number[]>([])
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [rawCsv, setRawCsv] = useState('')
  const [mapping, setMapping] = useState<UserImportMapping>({})
  const [actionState, formAction, isPending] = useActionState(
    importSecurityUsersAction,
    INITIAL_IMPORT_STATE
  )
  const [isImportUpdateOpen, setIsImportUpdateOpen] = useState(false)
  const [importUpdateRawCsv, setImportUpdateRawCsv] = useState('')
  const [importUpdateActionState, importUpdateFormAction] = useActionState(
    importUpdateUsersAction,
    INITIAL_IMPORT_STATE
  )

  const parsedImport = useMemo(() => parseCsvToRecords(rawCsv), [rawCsv])
  const parsedImportUpdate = useMemo(() => parseCsvToRecords(importUpdateRawCsv), [importUpdateRawCsv])
  const managerOptions = useMemo(
    () => users.map((user) => ({ id: user.id, name: user.name })),
    [users]
  )
  const departmentFilterOptions = useMemo(
    () => getUniqueOptions(users.map((user) => user.department)),
    [users]
  )
  const sectionFilterOptions = useMemo(
    () => getUniqueOptions(users.map((user) => user.section)),
    [users]
  )
  const roleNames = useMemo(
    () => getUniqueOptions(roleOptions.map((item) => item.name)),
    [roleOptions]
  )
  const statusTypeOptions = useMemo(
    () => getUniqueOptions(users.map((user) => user.employeeStatusType)),
    [users]
  )
  const siteOptions = useMemo(
    () =>
      getUniqueOptions(
        users.map((user) => getSiteDisplayName(user)).filter((s) => s !== '-')
      ),
    [users]
  )

  useEffect(() => {
    const autoMapped = autoMapHeaders(parsedImport.headers)

    setMapping((currentMapping) => {
      const nextMapping: UserImportMapping = {}

      for (const field of USER_IMPORT_FIELDS) {
        const currentHeader = currentMapping[field.key]
        nextMapping[field.key] =
          currentHeader && parsedImport.headers.includes(currentHeader)
            ? currentHeader
            : (autoMapped[field.key] ?? '')
      }

      return nextMapping
    })
  }, [parsedImport.headers])

  useEffect(() => {
    if (actionState.status === 'success') {
      setIsImportOpen(false)
      setRawCsv('')
      setMapping({})
      startRefreshTransition(() => router.refresh())
    }
  }, [actionState.status, router, startRefreshTransition])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const filtered = users.filter((user) => {
      const haystack = [
        user.employeeSn,
        user.name,
        user.birthPlaceDate,
        user.domicile,
        user.directManagerName ?? '',
        user.section,
        user.department,
        user.jobTitle,
        user.accessRole,
        user.siteName,
        user.workLocation,
        user.phoneNumber,
        user.email,
        user.status,
      ]
        .join(' ')
        .toLowerCase()

      const matchesKeyword = !query || haystack.includes(query)
      const matchesDepartment =
        selectedDepartments.length === 0 || selectedDepartments.includes(user.department)
      const matchesSection =
        selectedSections.length === 0 || selectedSections.includes(user.section)
      const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(user.accessRole)
      const matchesStatusType =
        selectedStatusTypes.length === 0 || selectedStatusTypes.includes(user.employeeStatusType)
      const matchesSite =
        selectedSites.length === 0 || selectedSites.includes(getSiteDisplayName(user))
      const matchesUnlinkedLokasi = !showUnlinkedLokasi || !user.siteId

      return matchesKeyword && matchesDepartment && matchesSection && matchesRole && matchesStatusType && matchesSite && matchesUnlinkedLokasi
    })

    if (!sortKey) return filtered

    const getSortVal = (u: typeof users[number]): string => {
      switch (sortKey) {
        case 'name': return u.name
        case 'sn': return u.employeeSn
        case 'department': return u.department
        case 'section': return u.section
        case 'jobTitle': return u.jobTitle
        case 'levelStaff': return u.levelName
        case 'peran': return u.accessRole
        case 'lokasiSite': return getSiteDisplayName(u)
        case 'tipeStatus': return u.employeeStatusType
        case 'gender': return u.gender
        case 'agama': return u.religion
        case 'pendidikan': return u.education
        case 'maritalStatus': return u.maritalStatus
        case 'poh': return u.pointOfHire
        case 'joinDate': return u.joinDate ?? ''
        case 'contractStart': return u.contractDurationStart ?? ''
        case 'contractEnd': return u.contractDurationEnd ?? ''
        case 'permanentDate': return u.permanentDate ?? ''
        case 'tglLahir': return u.birthDate ?? ''
        case 'statusAkun': return u.isActive ? 'Active' : 'Non Active'
        default: return ''
      }
    }

    return [...filtered].sort((a, b) => {
      const va = getSortVal(a)
      const vb = getSortVal(b)
      const cmp = va.localeCompare(vb)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [searchQuery, selectedDepartments, selectedSections, selectedRoles, selectedStatusTypes, selectedSites, showUnlinkedLokasi, users, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginatedUsers = filteredUsers.slice(safePage * pageSize, (safePage + 1) * pageSize)

  useEffect(() => { setPage(0) }, [searchQuery, selectedDepartments, selectedSections, selectedRoles, selectedStatusTypes, selectedSites])

  const currentYear = new Date().getFullYear()
  const activeUsersCount = users.filter((user) => user.status === 'active').length
  const newHiresCount = users.filter((user) => user.joinYear === currentYear).length
  const visiblePercentage =
    users.length > 0 ? Math.round((filteredUsers.length / users.length) * 100 * 10) / 10 : 0
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedDepartments.length > 0 ||
    selectedSections.length > 0 ||
    selectedRoles.length > 0 ||
    selectedStatusTypes.length > 0 ||
    selectedSites.length > 0 ||
    showUnlinkedLokasi
  const missingRequiredMappings = USER_IMPORT_FIELDS.filter(
    (field) => field.required && !mapping[field.key]
  )

  function resetFilters() {
    setSearchQuery('')
    setSelectedDepartments([])
    setSelectedSections([])
    setSelectedRoles([])
    setSelectedStatusTypes([])
    setSelectedSites([])
    setShowUnlinkedLokasi(false)
  }

  function exportVisibleUsers() {
    exportRowsToFile({
      columns: ['Nama', 'SN', 'Departemen', 'Section', 'Job Title', 'Level Staff', 'Peran', 'Lokasi Site', 'Tipe Status', 'Gender', 'Agama', 'Pendidikan', 'Marital Status', 'POH', 'Join Date', 'Contract Start', 'Contract End', 'Permanent Date', 'Tgl Lahir', 'Status Akun'],
      rows: filteredUsers.map((user) => [
        user.name,
        user.employeeSn,
        user.department,
        user.section,
        user.jobTitle,
        user.levelName,
        user.accessRole,
        getSiteDisplayName(user),
        user.employeeStatusType,
        user.gender,
        user.religion,
        user.education,
        user.maritalStatus,
        user.pointOfHire,
        user.joinDate,
        user.contractDurationStart,
        user.contractDurationEnd,
        user.permanentDate,
        user.birthDate,
        user.isActive ? 'Active' : 'Non Active',
      ]),
      fileName: 'security-users',
    })
  }

  function exportAllUsers() {
    exportRowsToFile({
      columns: ['Nama', 'SN', 'Departemen', 'Section', 'Job Title', 'Level Staff', 'Peran', 'Lokasi Site', 'Tipe Status', 'Gender', 'Agama', 'Pendidikan', 'Marital Status', 'POH', 'Join Date', 'Contract Start', 'Contract End', 'Permanent Date', 'Tgl Lahir', 'Status Akun', 'Email', 'Phone Number', 'Domisili'],
      rows: users.map((user) => [
        user.name,
        user.employeeSn,
        user.department,
        user.section,
        user.jobTitle,
        user.levelName,
        user.accessRole,
        getSiteDisplayName(user),
        user.employeeStatusType,
        user.gender || '-',
        user.religion || '-',
        user.education || '-',
        user.maritalStatus || '-',
        user.pointOfHire || '-',
        user.joinDate || '-',
        user.contractDurationStart || '-',
        user.contractDurationEnd || '-',
        user.permanentDate || '-',
        user.birthDate || '-',
        user.isActive ? 'Active' : 'Non Active',
        user.email || '-',
        user.phoneNumber || '-',
        user.domicile || '-',
      ]),
      fileName: 'all-security-users',
    })
  }

  return (
    <AdminPageShell
      eyebrow="Security"
      title="Manajemen Pengguna"
      description="Kelola akses akun, struktur HC, dan status karyawan dalam satu workspace table-first yang lebih cepat dipindai."
      badge={`${filteredUsers.length}/${users.length} visible`}
      actions={
        <>
          {canEdit && (
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-surface-container-lowest text-muted-foreground h-10 rounded-xl border-0 px-4 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
                >
                  <Upload className="size-4" />
                  Import Pengguna
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Daftar Pengguna</DialogTitle>
                  <DialogDescription>
                    Upload atau tempel CSV/Excel, cocokkan kolom, lalu simpan ke master user.
                  </DialogDescription>
                </DialogHeader>

                <form action={formAction} className="space-y-5">
                  <input type="hidden" name="rawCsv" value={rawCsv} />
                  <input type="hidden" name="mappingJson" value={JSON.stringify(mapping)} />

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="space-y-4">
                      <div className="surface-muted-card rounded-[1rem] p-4">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <p className="text-foreground text-sm font-semibold">
                              File daftar pengguna
                            </p>
                            <Input
                              type="file"
                              accept=".csv,.xls,.xlsx,text/csv"
                              onChange={async (event) => {
                                const file = event.target.files?.[0]
                                if (!file) return
                                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                                  const XLSX = await import('xlsx')
                                  const buffer = await file.arrayBuffer()
                                  const workbook = XLSX.read(buffer, { type: 'array' })
                                  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                                  const rows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 })
                                  const normalized = rows.map((r: any[]) => r.map((c: any) => `${c ?? ''}`.trim())).filter((r: string[]) => r.some((c: string) => c.length > 0))
                                  const csv = normalized.map((r: string[]) => r.join(',')).join('\n')
                                  setRawCsv(csv)
                                } else {
                                  setRawCsv(await file.text())
                                }
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <p className="text-foreground text-sm font-semibold">
                              Tempel daftar manual
                            </p>
                            <Textarea
                              value={rawCsv}
                              onChange={(event) => setRawCsv(event.target.value)}
                              className="min-h-56 text-xs"
                              placeholder="Tempel data pengguna di sini bila tidak mengunggah file..."
                            />
                          </div>
                        </div>
                      </div>

                      <div className="surface-module-card rounded-[1rem] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-foreground text-sm font-semibold">Pratinjau data</p>
                            <p className="text-muted-foreground text-xs">
                              {parsedImport.records.length} baris, {parsedImport.headers.length} kolom
                              terdeteksi.
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="bg-surface-container-low rounded-full border-0 px-3 py-1"
                          >
                            {missingRequiredMappings.length === 0
                              ? 'Siap import'
                              : `${missingRequiredMappings.length} kolom wajib`}
                          </Badge>
                        </div>

                        <div className="bg-surface-container-low mt-4 overflow-x-auto rounded-[0.95rem] p-2">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                {parsedImport.headers.length > 0 ? (
                                  parsedImport.headers.map((header) => (
                                    <TableHead key={header}>{header}</TableHead>
                                  ))
                                ) : (
                                  <TableHead>Tidak ada header</TableHead>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedImport.records.slice(0, 5).map((record, index) => (
                                <TableRow key={`preview-${index}`} className="hover:bg-transparent">
                                  {parsedImport.headers.map((header) => (
                                    <TableCell key={`${header}-${index}`}>
                                      {record[header] || '-'}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="surface-module-card rounded-[1rem] p-4">
                        <p className="text-foreground text-sm font-semibold">Cocokkan Kolom</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Semua kolom wajib harus diisi sebelum import dijalankan.
                        </p>
                        <div className="mt-4 grid gap-3">
                          {USER_IMPORT_FIELDS.map((field) => (
                            <div key={field.key} className="grid gap-2">
                              <div className="flex items-center gap-2">
                                <p className="text-foreground text-sm font-medium">{field.label}</p>
                                {field.required ? (
                                  <Badge
                                    variant="secondary"
                                    className="bg-surface-container-low rounded-full"
                                  >
                                    Wajib
                                  </Badge>
                                ) : null}
                              </div>
                              <Command className="bg-surface-container-lowest rounded-xl border-0 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]">
                                <CommandInput
                                  placeholder="Pilih kolom sumber"
                                  value={mapping[field.key] || ''}
                                  onValueChange={(value) =>
                                    setMapping((current) => ({
                                      ...current,
                                      [field.key]: value,
                                    }))
                                  }
                                />
                                <CommandList className="max-h-[120px]">
                                  <CommandEmpty>Tidak ada kolom yang cocok</CommandEmpty>
                                  <CommandGroup>
                                    {parsedImport.headers.map((header) => (
                                      <CommandItem
                                        key={`${field.key}-${header}`}
                                        onSelect={() =>
                                          setMapping((current) => ({
                                            ...current,
                                            [field.key]: header,
                                          }))
                                        }
                                      >
                                        {header}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="surface-muted-card rounded-[1rem] p-4">
                        <p className="text-foreground text-sm font-semibold">Ringkasan Kolom</p>
                        <p className="text-muted-foreground mt-2 font-mono text-xs leading-6 whitespace-pre-line">
                          {toHeaderPreview(mapping)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {actionState.status !== 'idle' ? (
                    <Alert
                      className={cn(
                        'border-0 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]',
                        actionState.status === 'error'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-emerald-50 text-emerald-700'
                      )}
                    >
                      <AlertDescription>
                        {actionState.message}
                        {actionState.status === 'success' ? (
                          <span>
                            {' '}
                            Baru: {actionState.importedCount ?? 0}, diperbarui:{' '}
                            {actionState.updatedCount ?? 0}, dilewati: {actionState.skippedCount ?? 0}
                            .
                          </span>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
                      Tutup
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isPending ||
                        !rawCsv.trim() ||
                        parsedImport.records.length === 0 ||
                        missingRequiredMappings.length > 0
                      }
                    >
                      {isPending ? 'Mengimpor...' : 'Import ke Manajemen Pengguna'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Button
            variant="outline"
            className="bg-surface-container-lowest text-muted-foreground h-10 rounded-xl border-0 px-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
            onClick={() => startRefreshTransition(() => router.refresh())}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
          </Button>

          {canEdit && (
            <SecurityUserCreateDialog
              roleOptions={roleOptions}
              managerOptions={managerOptions}
              sections={sections}
              departments={departments}
              positions={positions}
              sites={sites}
            />
          )}
        </>
      }
    >
      <div className="mb-6 flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 px-4 -mb-px transition-all duration-200 cursor-pointer",
            activeTab === 'directory'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Direktori Pengguna
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 px-4 -mb-px transition-all duration-200 cursor-pointer",
            activeTab === 'dashboard'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Dashboard Demografis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('serviceman-dashboard')}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 px-4 -mb-px transition-all duration-200 cursor-pointer",
            activeTab === 'serviceman-dashboard'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Dashboard Karyawan
        </button>
      </div>

      {activeTab === 'serviceman-dashboard' ? (
        <SecurityServicemanDashboard users={users} />
      ) : activeTab === 'dashboard' ? (
        <SecurityUserDashboard users={filteredUsers} />
      ) : (
        <>
          <AdminMetricGrid
            items={[
              {
                label: 'Total User',
                value: users.length.toLocaleString(),
                meta: 'Semua akun yang terdaftar di HERO.',
              },
              {
                label: 'Active Access',
                value: activeUsersCount.toLocaleString(),
                meta: 'Akun dengan akses aktif dan siap dipakai.',
              },
              {
                label: `Bergabung ${currentYear}`,
                value: newHiresCount.toLocaleString(),
                meta: 'Karyawan baru pada tahun berjalan.',
              },
              {
                label: 'Cakupan Visible',
                value: `${visiblePercentage}%`,
                meta: 'Proporsi data yang masih tampil setelah filter diterapkan.',
              },
            ]}
          />

          {hasActiveFilters ? (
            <div className="surface-muted-card rounded-[1rem] p-3">
              <div className="flex flex-wrap items-center gap-2">
                {searchQuery.trim() ? (
                  <FilterChip onRemove={() => setSearchQuery('')}>
                    Cari: {searchQuery.trim()}
                  </FilterChip>
                ) : null}
                {selectedDepartments.map((department) => (
                  <FilterChip
                    key={department}
                    onRemove={() =>
                      setSelectedDepartments((current) => current.filter((item) => item !== department))
                    }
                  >
                    Departemen: {department}
                  </FilterChip>
                ))}
                {selectedSections.map((section) => (
                  <FilterChip
                    key={section}
                    onRemove={() =>
                      setSelectedSections((current) => current.filter((item) => item !== section))
                    }
                  >
                    Section: {section}
                  </FilterChip>
                ))}
                {selectedRoles.map((role) => (
                  <FilterChip
                    key={role}
                    onRemove={() =>
                      setSelectedRoles((current) => current.filter((item) => item !== role))
                    }
                  >
                    Peran: {role}
                  </FilterChip>
                ))}
                {selectedStatusTypes.map((statusType) => (
                  <FilterChip
                    key={statusType}
                    onRemove={() =>
                      setSelectedStatusTypes((current) => current.filter((item) => item !== statusType))
                    }
                  >
                    Status: {statusType}
                  </FilterChip>
                ))}
                {showUnlinkedLokasi ? (
                  <FilterChip onRemove={() => setShowUnlinkedLokasi(false)}>
                    Tanpa Lokasi
                  </FilterChip>
                ) : null}
                {selectedSites.map((site) => (
                  <FilterChip
                    key={site}
                    onRemove={() =>
                      setSelectedSites((current) => current.filter((item) => item !== site))
                    }
                  >
                    Site: {site}
                  </FilterChip>
                ))}
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

          {/* Collapsible Import Update Data */}
          <div className="surface-module-card rounded-[1.2rem] mb-5 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsImportUpdateOpen((prev) => !prev)}
              className="flex w-full items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-surface-container-low/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Upload className="text-muted-foreground size-4" />
                <span className="text-foreground text-sm font-semibold">Import Update Data Pengguna</span>
              </div>
              <ChevronDown
                className={cn(
                  'text-muted-foreground size-4 transition-transform duration-200',
                  isImportUpdateOpen && 'rotate-180'
                )}
              />
            </button>

            {isImportUpdateOpen ? (
              <div className="border-border/50 border-t px-5 pb-5 pt-4">
                <div className="mb-4 space-y-2">
                  <p className="text-muted-foreground text-xs">
                    Download semua data pengguna, edit di Excel, lalu upload kembali. Data akan
                    dicocokkan berdasarkan <strong>SN</strong> dan diperbarui otomatis.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={exportAllUsers}
                    className="bg-surface-container-lowest text-foreground h-9 rounded-xl border-0 px-4 text-xs font-semibold shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
                  >
                    <Download className="mr-2 size-3.5" />
                    Download All Users Excel
                  </Button>
                </div>

                <form action={importUpdateFormAction} className="space-y-4">
                  <input type="hidden" name="rawCsv" value={importUpdateRawCsv} />

                  <div className="space-y-2">
                    <p className="text-foreground text-xs font-semibold">Upload File Excel/CSV</p>
                    <Input
                      type="file"
                      accept=".csv,.xls,.xlsx,text/csv"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        const lowerName = file.name.toLowerCase()
                        if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
                          const buffer = await file.arrayBuffer()
                          const XLSX = await import('xlsx')
                          const workbook = XLSX.read(buffer, { type: 'array' })
                          const firstSheet = workbook.SheetNames[0]
                          const worksheet = workbook.Sheets[firstSheet]
                          const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
                            worksheet,
                            { header: 1, raw: false, defval: '', blankrows: false }
                          )
                          const normalized = rows
                            .map((r: any[]) => r.map((c: any) => `${c ?? ''}`.trim()))
                            .filter((r: string[]) => r.some((c: string) => c.length > 0))
                          const csv = normalized.map((r: string[]) => r.join(',')).join('\n')
                          setImportUpdateRawCsv(csv)
                        } else {
                          setImportUpdateRawCsv(await file.text())
                        }
                      }}
                      className="bg-surface-container-lowest h-9 rounded-xl border-0 text-xs shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-foreground text-xs font-semibold">Pratinjau ({parsedImportUpdate.records.length} baris)</p>
                    {parsedImportUpdate.records.length > 0 ? (
                      <div className="bg-surface-container-low overflow-x-auto rounded-[0.95rem] p-2">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              {parsedImportUpdate.headers.map((header) => (
                                <TableHead key={header} className="whitespace-nowrap text-[10px]">{header}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedImportUpdate.records.slice(0, 5).map((record, idx) => (
                              <TableRow key={idx} className="hover:bg-transparent">
                                {parsedImportUpdate.headers.map((header) => (
                                  <TableCell key={header} className="text-[11px]">{record[header] || '-'}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">Upload file untuk melihat pratinjau.</p>
                    )}
                  </div>

                  {importUpdateActionState.status !== 'idle' ? (
                    <Alert
                      className={
                        importUpdateActionState.status === 'error'
                          ? 'border-destructive/30 bg-destructive/10 text-destructive'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                      }
                    >
                      <AlertDescription className="text-xs">{importUpdateActionState.message}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImportUpdateRawCsv('')
                        setIsImportUpdateOpen(false)
                      }}
                      className="h-9 rounded-xl px-4 text-xs"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={parsedImportUpdate.records.length === 0}
                      className="h-9 rounded-xl px-4 text-xs"
                    >
                      {importUpdateActionState.status === 'error' ? 'Coba Lagi' : 'Update Data'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>

          <div className="surface-module-card rounded-[1.2rem] p-4 sm:p-5">
            <SecurityUserBulkActions
              selectedIds={selectedIds}
              onClearSelection={() => setSelectedIds([])}
              roleOptions={roleOptions}
              sections={sections}
              sites={sites}
            />

            <MinimalTableShell
              title="Direktori Pengguna"
              description="Fokus utama halaman ini: cari orang, sempitkan departemen/peran/status, lalu buka aksi per baris."
              label="users"
              fileName="security-users"
              searchEnabled={false}
              showImport={false}
              disableDomManipulation
              filters={
                <>
                  <div className="relative w-full sm:w-[220px] sm:flex-none">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      placeholder="Cari pengguna..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="bg-surface-container-lowest h-9 rounded-xl border-0 pl-9 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
                    />
                  </div>
                  <MultiSelectDropdown
                    options={departmentFilterOptions}
                    selected={selectedDepartments}
                    onChange={setSelectedDepartments}
                    placeholder="Semua departemen"
                    label="Departemen"
                  />
                  <MultiSelectDropdown
                    options={sectionFilterOptions}
                    selected={selectedSections}
                    onChange={setSelectedSections}
                    placeholder="Semua section"
                    label="Section"
                  />
                  <MultiSelectDropdown
                    options={roleNames}
                    selected={selectedRoles}
                    onChange={setSelectedRoles}
                    placeholder="Semua peran"
                    label="Peran"
                  />
                  <MultiSelectDropdown
                    options={statusTypeOptions}
                    selected={selectedStatusTypes}
                    onChange={setSelectedStatusTypes}
                    placeholder="All status types"
                    label="Tipe status"
                  />
                  <MultiSelectDropdown
                    options={siteOptions}
                    selected={selectedSites}
                    onChange={setSelectedSites}
                    placeholder="Semua site"
                    label="Site"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUnlinkedLokasi(!showUnlinkedLokasi)}
                    className={cn(
                      "h-9 rounded-xl border-0 px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]",
                      showUnlinkedLokasi
                        ? "bg-amber-100 text-amber-800"
                        : "bg-surface-container-lowest text-muted-foreground"
                    )}
                  >
                    <MapPin className="mr-1.5 size-3.5" />
                    {showUnlinkedLokasi ? 'Filter: Tanpa Lokasi' : 'Tanpa Lokasi'}
                  </Button>
                </>
              }
              actions={
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
                      >
                        <EyeOff className="mr-1.5 size-3.5" />
                        Kolom
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                      {COLUMNS.map((col) => (
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
                    onClick={exportVisibleUsers}
                    className="bg-surface-container-lowest h-9 rounded-xl border-0 px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
                  >
                    Export Terfilter
                  </Button>
                </>
              }
              dateFilter={false}
            >
              <div className="bg-surface-container-low overflow-x-auto rounded-[1rem] p-2">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10" />
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedIds.length === filteredUsers.length && filteredUsers.length > 0
                          }
                          onCheckedChange={(checked) => {
                            setSelectedIds(checked ? filteredUsers.map((u: any) => u.id) : [])
                          }}
                        />
                      </TableHead>
                      {COLUMNS.map((col) =>
                        columnVisibility[col.key] ? (
                          <TableHead
                            key={col.key}
                            className="cursor-pointer select-none"
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
                      )}
                      <TableHead className="w-[120px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user, index) => {
                        const isExpanded = expandedRowIds.includes(user.id);
                        return (
                          <Fragment key={user.id}>
                        <TableRow className="hover:bg-white/55">
                          <TableCell className="py-3.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? 'Tutup' : 'Buka'} detail ${user.name}`}
                              className={cn(
                                "size-7 rounded-lg",
                                isExpanded
                                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedRowIds((currentIds) =>
                                  currentIds.includes(user.id)
                                    ? currentIds.filter((id) => id !== user.id)
                                    : [...currentIds, user.id]
                                )
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Checkbox
                              checked={selectedIds.includes(user.id)}
                              onCheckedChange={(checked) => {
                                setSelectedIds(
                                  checked
                                    ? [...selectedIds, user.id]
                                    : selectedIds.filter((id: number) => id !== user.id)
                                )
                              }}
                            />
                          </TableCell>
                          {columnVisibility.name ? (
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-11 rounded-xl shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]">
                                  <AvatarImage src={user.profileImage || undefined} alt={user.name} className="object-cover" />
                                  <AvatarFallback className="bg-primary/10 text-primary rounded-xl text-sm font-semibold">
                                    {getUserInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-foreground truncate font-medium">{user.name}</p>
                                  <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                          ) : null}
                          {columnVisibility.sn ? (
                            <TableCell className="py-3.5">
                              <span className="text-foreground/80 font-mono text-sm">{user.employeeSn}</span>
                            </TableCell>
                          ) : null}
                          {columnVisibility.department ? (
                            <TableCell className="py-3.5">
                              {user.departmentId ? (
                                <Link
                                  href="/dashboard/master-data?tab=departments"
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)] transition-colors hover:bg-blue-100"
                                >
                                  <Building2 className="size-3" />
                                  {user.department}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground rounded-full px-3 py-1 text-[11px]">
                                  {user.department || '-'}
                                </span>
                              )}
                            </TableCell>
                          ) : null}
                          {columnVisibility.section ? (
                            <TableCell className="py-3.5">
                              {user.sectionId ? (
                                <Link
                                  href="/dashboard/master-data?tab=sections"
                                  className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)] transition-colors hover:bg-violet-100"
                                >
                                  <Layers className="size-3" />
                                  {user.section}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground rounded-full px-3 py-1 text-[11px]">
                                  {user.section || '-'}
                                </span>
                              )}
                            </TableCell>
                          ) : null}
                          {columnVisibility.jobTitle ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm">
                              <Badge variant="outline" className="bg-surface-container-lowest text-foreground rounded-full border-0 px-3 py-1 text-[11px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
                                {user.jobTitle || '-'}
                              </Badge>
                            </TableCell>
                          ) : null}
                          {columnVisibility.levelStaff ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm">{user.levelName || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.peran ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm">{user.accessRole}</TableCell>
                          ) : null}
                          {columnVisibility.lokasiSite ? (
                            <TableCell className="py-3.5">
                              {user.siteId ? (
                                <Link
                                  href="/dashboard/master-data?tab=sites"
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.2)] transition-colors hover:bg-amber-100"
                                >
                                  <MapPin className="size-3" />
                                  {getSiteDisplayName(user)}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground rounded-full px-3 py-1 text-[11px]">
                                  {getSiteDisplayName(user)}
                                </span>
                              )}
                            </TableCell>
                          ) : null}
                          {columnVisibility.tipeStatus ? (
                            <TableCell className="py-3.5">
                              <Badge variant="outline" className="bg-surface-container-lowest text-muted-foreground rounded-full border-0 px-3 py-1 text-[11px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
                                {user.employeeStatusType}
                              </Badge>
                            </TableCell>
                          ) : null}
                          {columnVisibility.gender ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm">
                              {(() => {
                                if (!user.gender) return '-';
                                const g = user.gender.toLowerCase().trim();
                                if (g === '1' || g === 'l' || g === 'm' || g === 'male' || g === 'laki-laki' || g === 'laki - laki') return 'Laki-laki';
                                if (g === '2' || g === 'p' || g === 'f' || g === 'female' || g === 'perempuan') return 'Perempuan';
                                return user.gender;
                              })()}
                            </TableCell>
                          ) : null}
                          {columnVisibility.agama ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm">{user.religion || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.pendidikan ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm">{user.education || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.maritalStatus ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm">{user.maritalStatus || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.poh ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm">{user.pointOfHire || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.joinDate ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm whitespace-nowrap">{user.joinDate || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.contractStart ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm whitespace-nowrap">{user.contractDurationStart || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.contractEnd ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm whitespace-nowrap">{user.contractDurationEnd || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.permanentDate ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm whitespace-nowrap">{user.permanentDate || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.tglLahir ? (
                            <TableCell className="text-foreground/85 py-3.5 text-sm whitespace-nowrap">{user.birthDate || '-'}</TableCell>
                          ) : null}
                          {columnVisibility.statusAkun ? (
                            <TableCell className="py-3.5">
                              <Badge variant="outline" className={cn("rounded-full border-0 px-3 py-1 text-[10px] uppercase tracking-wide", user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                                {user.isActive ? 'Active' : 'Non Active'}
                              </Badge>
                            </TableCell>
                          ) : null}
                          <TableCell className="py-3.5 text-right">
                            <SecurityUserRowActions
                              user={user}
                              managerOptions={managerOptions}
                              roleOptions={roleOptions}
                              sections={sections}
                              departments={departments}
                              positions={positions}
                              sites={sites}
                              canEdit={canEdit}
                              canDelete={canDelete}
                            />
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow data-table-detail-row="true" className="bg-slate-50/30 hover:bg-slate-50/30">
                            <TableCell colSpan={3 + COLUMNS.filter(col => columnVisibility[col.key]).length} className="p-4 border-t border-slate-100/50">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-slate-100">
                                {/* Personal Info */}
                                <div className="space-y-2.5">
                                  <h4 className="font-bold text-slate-800 border-b pb-1 text-[10px] uppercase tracking-wider">Data Pribadi</h4>
                                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                                    <span className="text-muted-foreground">Tempat/Tgl Lahir:</span>
                                    <span className="font-medium text-foreground">{user.birthPlaceDate || user.birthDate || '-'}</span>
                                    <span className="text-muted-foreground">Gender:</span>
                                    <span className="font-medium text-foreground">
                                      {(() => {
                                        if (!user.gender) return '-';
                                        const g = user.gender.toLowerCase().trim();
                                        if (g === '1' || g === 'l' || g === 'm' || g === 'male' || g === 'laki-laki' || g === 'laki - laki') return 'Laki-laki';
                                        if (g === '2' || g === 'p' || g === 'f' || g === 'female' || g === 'perempuan') return 'Perempuan';
                                        return user.gender;
                                      })()}
                                    </span>
                                    <span className="text-muted-foreground">Agama:</span>
                                    <span className="font-medium text-foreground">{user.religion || '-'}</span>
                                    <span className="text-muted-foreground">Pendidikan:</span>
                                    <span className="font-medium text-foreground">{user.education || '-'}</span>
                                    <span className="text-muted-foreground">Status Nikah:</span>
                                    <span className="font-medium text-foreground">{user.maritalStatus || '-'}</span>
                                    <span className="text-muted-foreground">Domisili:</span>
                                    <span className="font-medium text-foreground">{user.domicile || '-'}</span>
                                    <span className="text-muted-foreground">No. HP:</span>
                                    <span className="font-medium text-foreground">{user.phoneNumber || '-'}</span>
                                  </div>
                                </div>

                                {/* Employment Info */}
                                <div className="space-y-2.5">
                                  <h4 className="font-bold text-slate-800 border-b pb-1 text-[10px] uppercase tracking-wider">Kepegawaian</h4>
                                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                                    <span className="text-muted-foreground">Tipe Status:</span>
                                    <span className="font-medium text-foreground">{user.employeeStatusType || '-'}</span>
                                    <span className="text-muted-foreground">Level Staff:</span>
                                    <span className="font-medium text-foreground">{user.levelName || '-'}</span>
                                    <span className="text-muted-foreground">POH (Point of Hire):</span>
                                    <span className="font-medium text-foreground">{user.pointOfHire || '-'}</span>
                                    <span className="text-muted-foreground">Seksi (Section):</span>
                                    <span className="font-medium text-foreground">{user.section || '-'}</span>
                                    <span className="text-muted-foreground">Atasan Langsung:</span>
                                    <span className="font-medium text-foreground">{user.directManagerName || '-'}</span>
                                    <span className="text-muted-foreground">Lokasi Kerja:</span>
                                    <span className="font-medium text-foreground">{getSiteDisplayName(user)}</span>
                                  </div>
                                </div>

                                {/* Contract & Dates */}
                                <div className="space-y-2.5">
                                  <h4 className="font-bold text-slate-800 border-b pb-1 text-[10px] uppercase tracking-wider">Kontrak & Tanggal</h4>
                                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                                    <span className="text-muted-foreground">Tanggal Bergabung:</span>
                                    <span className="font-medium text-foreground">{user.joinDate || '-'}</span>
                                    <span className="text-muted-foreground">Mulai Kontrak:</span>
                                    <span className="font-medium text-foreground">{user.contractDurationStart || '-'}</span>
                                    <span className="text-muted-foreground">Selesai Kontrak:</span>
                                    <span className="font-medium text-foreground">{user.contractDurationEnd || '-'}</span>
                                    <span className="text-muted-foreground">Karyawan Tetap:</span>
                                    <span className="font-medium text-foreground">{user.permanentDate || '-'}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={24}
                      className="text-muted-foreground py-12 text-center text-sm"
                    >
                      Tidak ada pengguna yang cocok dengan filter saat ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filteredUsers.length > 0 ? (
            <div className="flex items-center justify-between px-1 pt-3">
              <p className="text-muted-foreground text-xs">
                Menampilkan {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filteredUsers.length)} dari {filteredUsers.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i}
                    variant={i === safePage ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "size-7 rounded-lg text-xs font-medium",
                      i === safePage
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </MinimalTableShell>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="surface-muted-card rounded-[1rem] p-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
              <Users2 className="size-4" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase">Total scope</p>
              <p className="text-foreground text-sm font-medium">
                {users.length.toLocaleString()} akun terdaftar
              </p>
            </div>
          </div>
        </div>
        <div className="surface-muted-card rounded-[1rem] p-4">
          <div className="flex items-center gap-3">
            <span className="bg-tertiary-container text-on-tertiary-container grid size-10 place-items-center rounded-xl">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase">Access health</p>
              <p className="text-foreground text-sm font-medium">
                {activeUsersCount.toLocaleString()} akses aktif
              </p>
            </div>
          </div>
        </div>
        <div className="surface-muted-card rounded-[1rem] p-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
              {visiblePercentage >= 100 ? (
                <BriefcaseBusiness className="size-4" />
              ) : (
                <MapPin className="size-4" />
              )}
            </span>
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase">Current view</p>
              <p className="text-foreground text-sm font-medium">
                {filteredUsers.length.toLocaleString()} user siap ditindak
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )}
</AdminPageShell>
)
}
