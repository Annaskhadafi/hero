'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MultiSelectSearch } from '@/components/ui/multi-select-search'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  deleteMaestroCustomerUserAction,
  registerMaestroCustomerUserAction,
  updateMaestroCustomerUserAction,
} from './actions'

export type CustomerOption = { id: number | null; name: string; customerCode: string }
export type LocationOption = {
  id: number
  name: string
  location: string
  customerName?: string | null
  employeeCount?: number | null
}
export type RoleOption = { id: number; code: string; name: string; description: string }

export type UserRow = {
  id: string
  email: string
  name: string
  isActive: boolean
  createdAt: Date | string
  customer: { customerId: number; customerName: string; customerCode: string } | null
  roles: string[]
  roleCodes?: string[]
  locations: string[]
  locationIds?: number[]
}

type UserTab = 'all' | 'active' | 'inactive'

function formatRegisteredDate(value: Date | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getSiteOptions(
  locations: LocationOption[],
  selectedCustomerCode: string,
  customers: CustomerOption[],
) {
  const selectedCustomer = customers.find((c) => c.customerCode === selectedCustomerCode)
  const custNameClean =
    selectedCustomer?.name
      .replace(/^(PT\.?\s*|CV\.?\s*)/i, '')
      .trim()
      .toLowerCase() || ''

  return locations
    .map((loc) => {
      const locCustClean =
        loc.customerName
          ?.replace(/^(PT\.?\s*|CV\.?\s*)/i, '')
          .trim()
          .toLowerCase() || ''

      const isDirectMatch = Boolean(
        custNameClean &&
          locCustClean &&
          (custNameClean === locCustClean ||
            custNameClean.includes(locCustClean) ||
            locCustClean.includes(custNameClean)),
      )

      const empCount = loc.employeeCount || 0
      const empTag = empCount > 0 ? `${empCount} Karyawan Aktif` : '0 Karyawan'
      const custTag =
        loc.customerName &&
        loc.customerName !== '-' &&
        loc.customerName !== 'Default Customer'
          ? `[${loc.customerName}]`
          : ''

      const label = `${isDirectMatch ? '⭐ ' : ''}${loc.name} · ${empTag}${custTag ? ` · ${custTag}` : ''}${loc.location ? ` · ${loc.location}` : ''}`

      return {
        value: String(loc.id),
        label,
        isDirectMatch,
        employeeCount: empCount,
      }
    })
    .sort((a, b) => {
      if (a.isDirectMatch && !b.isDirectMatch) return -1
      if (!a.isDirectMatch && b.isDirectMatch) return 1
      if (b.employeeCount !== a.employeeCount) return b.employeeCount - a.employeeCount
      return a.label.localeCompare(b.label)
    })
}

export function MaestroUserManagementClient({
  customers,
  locations,
  roles,
  users: initialUsers,
}: {
  customers: CustomerOption[]
  locations: LocationOption[]
  roles: RoleOption[]
  users: UserRow[]
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [activeTab, setActiveTab] = useState<UserTab>('all')
  const [search, setSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formCustomerCode, setFormCustomerCode] = useState('')
  const [formRoleCode, setFormRoleCode] = useState(roles[0]?.code ?? '')
  const [formLocationIds, setFormLocationIds] = useState<number[]>([])
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editCustomerCode, setEditCustomerCode] = useState('')
  const [editRoleCode, setEditRoleCode] = useState('')
  const [editLocationIds, setEditLocationIds] = useState<number[]>([])
  const [editIsActive, setEditIsActive] = useState(true)

  // Delete Dialog State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)

  const [isPending, startTransition] = useTransition()

  // KPI Calculations
  const totalCount = users.length
  const activeCount = users.filter((u) => u.isActive).length
  const inactiveCount = totalCount - activeCount
  const uniqueCompanies = new Set(users.map((u) => u.customer?.customerCode).filter(Boolean)).size

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (activeTab === 'active' && !u.isActive) return false
      if (activeTab === 'inactive' && u.isActive) return false
      if (customerFilter !== 'all' && u.customer?.customerName !== customerFilter) return false
      if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = u.name.toLowerCase().includes(q)
        const matchEmail = u.email.toLowerCase().includes(q)
        const matchCust = u.customer?.customerName.toLowerCase().includes(q)
        const matchCode = u.customer?.customerCode.toLowerCase().includes(q)
        const matchLoc = u.locations.some((l) => l.toLowerCase().includes(q))
        const matchRole = u.roles.some((r) => r.toLowerCase().includes(q))
        if (!matchName && !matchEmail && !matchCust && !matchCode && !matchLoc && !matchRole) {
          return false
        }
      }
      return true
    })
  }, [users, activeTab, customerFilter, roleFilter, search])

  // Site options prioritized by selected customer & employee count
  const createSiteOptions = useMemo(() => {
    return getSiteOptions(locations, formCustomerCode, customers)
  }, [locations, formCustomerCode, customers])

  const editSiteOptions = useMemo(() => {
    return getSiteOptions(locations, editCustomerCode, customers)
  }, [locations, editCustomerCode, customers])

  // Reset Create Form
  function resetCreateForm() {
    setFormCustomerCode('')
    setFormRoleCode(roles[0]?.code ?? '')
    setFormLocationIds([])
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormIsActive(true)
    setShowPassword(false)
  }

  // Open Create Dialog
  function openCreateDialog() {
    resetCreateForm()
    setIsCreateOpen(true)
  }

  // Open Edit Dialog
  function openEditDialog(user: UserRow) {
    setEditingUserId(user.id)
    setEditName(user.name)
    setEditEmail(user.email)
    setEditPassword('')
    setShowEditPassword(false)
    setEditCustomerCode(user.customer?.customerCode || '')

    // Resolve role code: if roleCodes available use first, otherwise find matching role code by roleName
    const matchedRole = roles.find((r) => user.roles.includes(r.name))
    setEditRoleCode(user.roleCodes?.[0] || matchedRole?.code || roles[0]?.code || '')

    // Resolve location ids
    if (user.locationIds && user.locationIds.length > 0) {
      setEditLocationIds(user.locationIds)
    } else {
      const matchedLocIds = locations
        .filter((loc) => user.locations.includes(loc.name))
        .map((loc) => loc.id)
      setEditLocationIds(matchedLocIds)
    }

    setEditIsActive(user.isActive)
    setIsEditOpen(true)
  }

  // Open Delete Dialog
  function openDeleteDialog(user: UserRow) {
    setUserToDelete(user)
    setIsDeleteOpen(true)
  }

  // Submit Create
  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim() || !formEmail.trim() || !formCustomerCode || !formRoleCode) {
      toast.error('Mohon lengkapi semua data wajib.')
      return
    }
    if (!formLocationIds.length) {
      toast.error('Pilih minimal 1 site / lokasi akses.')
      return
    }

    startTransition(async () => {
      try {
        await registerMaestroCustomerUserAction({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          customerCode: formCustomerCode,
          roleCode: formRoleCode,
          locationIds: formLocationIds,
        })
        toast.success(`Pengguna ${formName} berhasil didaftarkan!`)
        setIsCreateOpen(false)
        resetCreateForm()
        window.location.reload()
      } catch (err: any) {
        toast.error(err?.message || 'Gagal mendaftarkan pengguna.')
      }
    })
  }

  // Submit Edit
  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUserId) return
    if (!editName.trim() || !editEmail.trim() || !editCustomerCode || !editRoleCode) {
      toast.error('Mohon lengkapi semua data wajib.')
      return
    }
    if (!editLocationIds.length) {
      toast.error('Pilih minimal 1 site / lokasi akses.')
      return
    }

    startTransition(async () => {
      try {
        await updateMaestroCustomerUserAction({
          userId: editingUserId,
          name: editName.trim(),
          email: editEmail.trim(),
          password: editPassword.trim() ? editPassword.trim() : undefined,
          customerCode: editCustomerCode,
          roleCode: editRoleCode,
          locationIds: editLocationIds,
          isActive: editIsActive,
        })

        toast.success(`Data pengguna ${editName} berhasil diperbarui!`)
        setIsEditOpen(false)

        // Optimistically update local state
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== editingUserId) return u
            const selectedCust = customers.find((c) => c.customerCode === editCustomerCode)
            const selectedRole = roles.find((r) => r.code === editRoleCode)
            const selectedLocNames = locations
              .filter((loc) => editLocationIds.includes(loc.id))
              .map((loc) => loc.name)
            return {
              ...u,
              name: editName.trim(),
              email: editEmail.trim(),
              isActive: editIsActive,
              customer: selectedCust
                ? {
                    customerId: selectedCust.id || 0,
                    customerName: selectedCust.name,
                    customerCode: selectedCust.customerCode,
                  }
                : u.customer,
              roles: selectedRole ? [selectedRole.name] : u.roles,
              roleCodes: [editRoleCode],
              locations: selectedLocNames,
              locationIds: editLocationIds,
            }
          }),
        )
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memperbarui pengguna.')
      }
    })
  }

  // Submit Delete
  function handleDeleteConfirm() {
    if (!userToDelete) return

    startTransition(async () => {
      try {
        await deleteMaestroCustomerUserAction(userToDelete.id)
        toast.success(`Pengguna ${userToDelete.name} telah dihapus permanen.`)
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
        setIsDeleteOpen(false)
        setUserToDelete(null)
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus pengguna.')
      }
    })
  }

  // Quick Toggle Status
  function handleQuickToggleStatus(user: UserRow) {
    const nextStatus = !user.isActive
    startTransition(async () => {
      try {
        const matchedRole = roles.find((r) => user.roles.includes(r.name))
        const roleCode = user.roleCodes?.[0] || matchedRole?.code || roles[0]?.code || ''
        const customerCode = user.customer?.customerCode || ''

        const matchedLocIds =
          user.locationIds && user.locationIds.length > 0
            ? user.locationIds
            : locations.filter((loc) => user.locations.includes(loc.name)).map((loc) => loc.id)

        await updateMaestroCustomerUserAction({
          userId: user.id,
          name: user.name,
          email: user.email,
          customerCode,
          roleCode,
          locationIds: matchedLocIds,
          isActive: nextStatus,
        })

        toast.success(
          `Status ${user.name} diubah menjadi ${nextStatus ? 'Aktif' : 'Nonaktif'}.`,
        )
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: nextStatus } : u)),
        )
      } catch (err: any) {
        toast.error(err?.message || 'Gagal mengubah status.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 1. KPI Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Pengguna</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
              {totalCount}
            </span>
            <span className="text-xs text-slate-400">akun</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pengguna Aktif</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-emerald-600">
              {activeCount}
            </span>
            <span className="text-xs text-slate-400">bisa login</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Nonaktif</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-slate-600">
              {inactiveCount}
            </span>
            <span className="text-xs text-slate-400">terkunci</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Perusahaan</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
              {uniqueCompanies}
            </span>
            <span className="text-xs text-slate-400">terhubung</span>
          </div>
        </div>
      </div>

      {/* 2. Main Table Shell Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200/80 px-4 pt-3 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                activeTab === 'all'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Semua Pengguna</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'all'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                activeTab === 'active'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Aktif</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inactive')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                activeTab === 'inactive'
                  ? 'border-slate-800 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Nonaktif</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'inactive'
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {inactiveCount}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Bar & Action Header */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, perusahaan..."
                className="h-9 pl-9 text-xs bg-white border-slate-200"
              />
            </div>

            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Semua Perusahaan</option>
              {customers.map((c) => (
                <option key={c.id ?? c.customerCode} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Semua Role</option>
              {roles.map((r) => (
                <option key={r.code} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={openCreateDialog}
              className="h-9 gap-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" />
              <span>Tambah Pengguna</span>
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 sm:px-6">Pengguna</th>
                <th className="px-4 py-3">Perusahaan</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Akses Site</th>
                <th className="px-4 py-3">Terdaftar</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right sm:px-6">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-medium text-slate-600">Tidak ada data pengguna</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba ubah kata kunci pencarian atau filter status.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50/70">
                    {/* User Info with Initials Avatar */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-800 truncate max-w-[200px]">
                        {user.customer?.customerName || '-'}
                      </p>
                      {user.customer?.customerCode && (
                        <span className="font-mono text-[10px] text-slate-400">
                          {user.customer.customerCode}
                        </span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        <Shield className="h-3 w-3" />
                        {user.roles.join(', ') || 'Customer User'}
                      </span>
                    </td>

                    {/* Location Sites */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1 max-w-[240px]">
                        {user.locations.length === 0 ? (
                          <span className="text-[11px] text-slate-400">Tidak ada site</span>
                        ) : user.locations.length <= 2 ? (
                          user.locations.map((loc, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 truncate max-w-[120px]"
                              title={loc}
                            >
                              <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                              <span className="truncate">{loc}</span>
                            </span>
                          ))
                        ) : (
                          <>
                            {user.locations.slice(0, 2).map((loc, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 truncate max-w-[100px]"
                                title={loc}
                              >
                                <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                <span className="truncate">{loc}</span>
                              </span>
                            ))}
                            <span
                              className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 cursor-help"
                              title={user.locations.join(', ')}
                            >
                              +{user.locations.length - 2} site
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Registered Date */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {formatRegisteredDate(user.createdAt)}
                    </td>

                    {/* Status Badge (Clickable Toggle) */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleQuickToggleStatus(user)}
                        disabled={isPending}
                        title="Klik untuk mengubah status"
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition hover:scale-105 ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                            : 'bg-slate-100 text-slate-500 ring-1 ring-slate-300'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="px-4 py-3.5 text-right sm:px-6 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="h-8 w-8 p-0 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
                          title="Edit Pengguna"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                          className="h-8 w-8 p-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Hapus</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 sm:px-6">
          <span>
            Menampilkan <strong className="text-slate-800">{filteredUsers.length}</strong> dari{' '}
            <strong className="text-slate-800">{totalCount}</strong> pengguna
          </span>
          <span className="text-[11px] text-slate-400">MAESTRO Customer Portal</span>
        </div>
      </div>

      {/* ─── MODAL 1: CREATE USER ────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 sm:p-7">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Daftarkan Pengguna Baru
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Buat akun akses login untuk perwakilan customer ke portal MAESTRO.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {/* Customer Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Perusahaan Customer <span className="text-rose-500">*</span>
              </Label>
              <SearchableSelect
                label="Customer"
                value={formCustomerCode}
                onValueChange={(val) => {
                  setFormCustomerCode(val)
                  setFormLocationIds([])
                }}
                options={customers.map((c) => ({
                  value: c.customerCode,
                  label: `${c.name} (${c.customerCode})`,
                }))}
                placeholder="Pilih perusahaan customer..."
                widthClassName="h-10 w-full text-xs"
              />
            </div>

            {/* Name & Email 2-columns */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-name" className="text-xs font-semibold text-slate-700">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="create-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama perwakilan customer"
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email" className="text-xs font-semibold text-slate-700">
                  Email Login <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="h-10 text-xs"
                  required
                />
              </div>
            </div>

            {/* Password & Role 2-columns */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-password" className="text-xs font-semibold text-slate-700">
                  Password Awal <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="create-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Min. 8 karakter"
                    className="h-10 pr-9 text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-role" className="text-xs font-semibold text-slate-700">
                  Role Akses <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="create-role"
                  value={formRoleCode}
                  onChange={(e) => setFormRoleCode(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
                  required
                >
                  {roles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Site Locations Access */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-start justify-between">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Akses Site / Lokasi Operasional <span className="text-rose-500">*</span>
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Sesuai lokasi kerja karyawan untuk Daily Activity &amp; modul operasional.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-slate-500 shrink-0">
                  {formLocationIds.length} site dipilih
                </span>
              </div>

              {/* Direct match quick button */}
              {createSiteOptions.some((o) => o.isDirectMatch) && (
                <div className="flex items-center justify-between rounded-lg bg-indigo-50/80 px-3 py-1.5 text-xs text-indigo-700">
                  <span className="text-[11px]">
                    Tersedia {createSiteOptions.filter((o) => o.isDirectMatch).length} site sesuai perusahaan ini
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const matchedIds = createSiteOptions
                        .filter((o) => o.isDirectMatch)
                        .map((o) => Number(o.value))
                      setFormLocationIds(matchedIds)
                    }}
                    className="text-[11px] font-semibold underline hover:text-indigo-900"
                  >
                    Pilih Site Perusahaan
                  </button>
                </div>
              )}

              <MultiSelectSearch
                label="Site Operasional"
                values={formLocationIds.map(String)}
                onValuesChange={(vals) =>
                  setFormLocationIds(vals.map(Number).filter(Number.isInteger))
                }
                options={createSiteOptions}
                placeholder="Pilih site operasional yang boleh diakses..."
                className="min-h-10 text-xs bg-slate-50/60"
              />
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-1.5 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                <UserPlus className="h-4 w-4" />
                <span>{isPending ? 'Menyimpan...' : 'Daftarkan Pengguna'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: EDIT USER ──────────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 sm:p-7">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Edit Pengguna: {editName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Perbarui profil, hak akses site, peran, dan status akun pengguna.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            {/* Customer Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Perusahaan Customer <span className="text-rose-500">*</span>
              </Label>
              <SearchableSelect
                label="Customer"
                value={editCustomerCode}
                onValueChange={(val) => {
                  setEditCustomerCode(val)
                }}
                options={customers.map((c) => ({
                  value: c.customerCode,
                  label: `${c.name} (${c.customerCode})`,
                }))}
                placeholder="Pilih perusahaan customer..."
                widthClassName="h-10 w-full text-xs"
              />
            </div>

            {/* Name & Email 2-columns */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold text-slate-700">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama perwakilan customer"
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs font-semibold text-slate-700">
                  Email Login <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="h-10 text-xs"
                  required
                />
              </div>
            </div>

            {/* Password (Optional) & Role 2-columns */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-password" className="text-xs font-semibold text-slate-700">
                    Ganti Password
                  </Label>
                  <span className="text-[10px] text-slate-400">Opsional</span>
                </div>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Kosongkan jika tak diubah"
                    className="h-10 pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-role" className="text-xs font-semibold text-slate-700">
                  Role Akses <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="edit-role"
                  value={editRoleCode}
                  onChange={(e) => setEditRoleCode(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
                  required
                >
                  {roles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Site Locations Access */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-start justify-between">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Akses Site / Lokasi Operasional <span className="text-rose-500">*</span>
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Sesuai lokasi kerja karyawan untuk Daily Activity &amp; modul operasional.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-slate-500 shrink-0">
                  {editLocationIds.length} site dipilih
                </span>
              </div>

              {/* Direct match quick button */}
              {editSiteOptions.some((o) => o.isDirectMatch) && (
                <div className="flex items-center justify-between rounded-lg bg-indigo-50/80 px-3 py-1.5 text-xs text-indigo-700">
                  <span className="text-[11px]">
                    Tersedia {editSiteOptions.filter((o) => o.isDirectMatch).length} site sesuai perusahaan ini
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const matchedIds = editSiteOptions
                        .filter((o) => o.isDirectMatch)
                        .map((o) => Number(o.value))
                      setEditLocationIds(matchedIds)
                    }}
                    className="text-[11px] font-semibold underline hover:text-indigo-900"
                  >
                    Pilih Site Perusahaan
                  </button>
                </div>
              )}

              <MultiSelectSearch
                label="Site Operasional"
                values={editLocationIds.map(String)}
                onValuesChange={(vals) =>
                  setEditLocationIds(vals.map(Number).filter(Number.isInteger))
                }
                options={editSiteOptions}
                placeholder="Pilih site operasional yang boleh diakses..."
                className="min-h-10 text-xs bg-slate-50/60"
              />
            </div>

            {/* Active Status Switch */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div>
                <Label htmlFor="edit-active" className="text-xs font-semibold text-slate-800">
                  Status Akun Aktif
                </Label>
                <p className="text-[11px] text-slate-500">
                  Jika dinonaktifkan, pengguna tidak dapat masuk ke portal.
                </p>
              </div>
              <Switch
                id="edit-active"
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
              />
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-1.5 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>{isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: DELETE CONFIRMATION ────────────────────────────────── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Hapus Pengguna?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Tindakan ini tidak dapat dibatalkan.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 text-xs text-rose-800">
            <p className="font-semibold">{userToDelete?.name}</p>
            <p className="text-rose-600 font-mono text-[11px]">{userToDelete?.email}</p>
            <p className="text-rose-700/80 text-[11px] mt-2 leading-relaxed">
              Seluruh data sesi, hak akses site, dan keanggotaan pengguna ini pada portal MAESTRO
              akan dihapus secara permanen.
            </p>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleDeleteConfirm}
              className="gap-1.5 bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isPending ? 'Menghapus...' : 'Hapus Permanen'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
