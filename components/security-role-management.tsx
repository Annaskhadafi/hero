'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  Eye,
  ListChecks,
  Plus,
  Save,
  Shield,
  Smartphone,
  Trash2,
  Users,
  UserMinus,
  Search,
  Settings,
  Zap,
  RefreshCw,
} from 'lucide-react'
import { manageSecurityRoleAction, type AdminMutationState } from '@/app/dashboard/admin-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnterpriseScorecards } from '@/components/ui/enterprise-table-kit'

type RoleRow = {
  id: number
  name: string
  description: string
  scope: string
  assignedUsers: number
}

type MenuRow = {
  id: number
  menuArea: string
  section: string
  title: string
  url: string
  resource: string
  sortOrder?: number | null
  groupLabel?: string | null
}

type MenuPermissionRow = {
  id: number
  roleId: number
  menuItemId: number
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll: boolean
  dataScope: string
}

type DraftPermission = {
  menuItemId: number
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll: boolean
  dataScope: string
}

type UserRow = {
  id: number
  name: string
  email: string
  accessRole: string
  jobTitle: string
  section: string
  isActive: boolean
}

const PERMISSION_FIELDS = [
  { key: 'canView', label: 'Lihat' },
  { key: 'canEdit', label: 'Ubah' },
  { key: 'canDelete', label: 'Hapus' },
  { key: 'canSelectAll', label: 'Akses penuh' },
] as const

const MENU_AREA_META: Record<
  string,
  { label: string; description: string; icon: React.ReactNode }
> = {
  admin: {
    label: 'Pengaturan Sistem',
    description: 'Konfigurasi, keamanan, dan manajemen portal',
    icon: <Settings className="size-4" />,
  },
  central_service: {
    label: 'Layanan Pusat',
    description: 'Master data, approval, email, dan notifikasi',
    icon: <Zap className="size-4" />,
  },
  performance: {
    label: 'Aktivitas & Performa',
    description: 'Daily activity, timesheet, HSE, training, dan wellness',
    icon: <ListChecks className="size-4" />,
  },
}

const DESKTOP_MENU_ORDER = [
  'Portal Chitra',
  'Aktivitas Harian',
  'Roster & Timesheet',
  'Approval',
  'Data Induk',
  'Human Capital',
  'Attendance',
  'HSE',
  'Quality & CPI',
  'Central Service',
  'Laporan',
  'Pengaturan',
] as const

const sectionLabelMap: Record<string, string> = {
  'Daily Activity': 'Aktivitas Harian',
  'Central Service': 'Central Service',
  Approval: 'Approval',
  'Master Data': 'Data Induk',
  HR: 'Human Capital',
  HSE: 'HSE',
  Quality: 'Quality & CPI',
  'Quality & CPI': 'Quality & CPI',
  Report: 'Laporan',
  Setting: 'Pengaturan',
}

type ViewFilter = 'all' | 'desktop' | 'mobile'
type PermissionStateFilter = 'all' | 'enabled' | 'changed'

const QUICK_PRESETS = [
  {
    label: 'Full Akses',
    description: 'Semua menu aktif (Lihat + Ubah + Hapus + Full)',
    icon: <Shield className="size-4" />,
    apply: (items: MenuRow[]) =>
      items.map<DraftPermission>((item) => ({
        menuItemId: item.id,
        canView: true,
        canEdit: true,
        canDelete: true,
        canSelectAll: true,
        dataScope: 'global',
      })),
  },
  {
    label: 'Hanya Lihat',
    description: 'Semua menu hanya bisa dilihat',
    icon: <ListChecks className="size-4" />,
    apply: (items: MenuRow[]) =>
      items.map<DraftPermission>((item) => ({
        menuItemId: item.id,
        canView: true,
        canEdit: false,
        canDelete: false,
        canSelectAll: false,
        dataScope: 'own',
      })),
  },
  {
    label: 'Reset Semua',
    description: 'Nonaktifkan semua permission',
    icon: <Trash2 className="size-4" />,
    apply: (items: MenuRow[]) =>
      items.map<DraftPermission>((item) => ({
        menuItemId: item.id,
        canView: false,
        canEdit: false,
        canDelete: false,
        canSelectAll: false,
        dataScope: 'own',
      })),
  },
]

const INITIAL_STATE: AdminMutationState = {
  status: 'idle',
  message: '',
}

function formatScopeLabel(value: string) {
  const labels: Record<string, string> = {
    site: 'Site tertentu',
    all_sites: 'Semua site',
  }
  return labels[value] ?? value.replaceAll('_', ' ')
}

function formatMenuArea(value: string) {
  return MENU_AREA_META[value]?.label ?? value.replaceAll('_', ' ')
}

function getSidebarSection(menuItem: MenuRow) {
  return sectionLabelMap[menuItem.section] ?? menuItem.section ?? 'Menu'
}

function isDesktopMenu(menuItem: MenuRow) {
  return !menuItem.url.startsWith('/mobile')
}

function matchesViewFilter(menuItem: MenuRow, viewFilter: ViewFilter) {
  if (viewFilter === 'mobile') return hasMobileCounterpart(menuItem.url, menuItem.resource)
  if (viewFilter === 'desktop') return isDesktopMenu(menuItem)
  return true
}

function formatDataScopeLabel(value: string) {
  return (
    {
      global: 'Global',
      site: 'Site utama',
      own: 'Own data',
    }[value] ?? value
  )
}

function hasEnabledPermission(permission: DraftPermission | undefined) {
  return Boolean(
    permission?.canView || permission?.canEdit || permission?.canDelete || permission?.canSelectAll
  )
}

function isSamePermission(left: DraftPermission | undefined, right: DraftPermission | undefined) {
  if (!left || !right) return left === right
  return (
    left.canView === right.canView &&
    left.canEdit === right.canEdit &&
    left.canDelete === right.canDelete &&
    left.canSelectAll === right.canSelectAll &&
    left.dataScope === right.dataScope
  )
}

function isWidenedScope(previous: string | undefined, next: string | undefined) {
  const rank: Record<string, number> = { own: 1, site: 2, global: 3 }
  return (rank[next ?? 'own'] ?? 0) > (rank[previous ?? 'own'] ?? 0)
}

function hasMobileCounterpart(
  url: string | null | undefined,
  resource: string | null | undefined
): boolean {
  if (!url) return false
  if (url.startsWith('/mobile')) return true
  const cleanUrl = url.split('?')[0]
  if (cleanUrl === '/dashboard/activity-hub/my-day') return true
  if (cleanUrl.startsWith('/dashboard/activity-hub')) return true
  if (cleanUrl === '/dashboard/overtime-requests' || cleanUrl.startsWith('/dashboard/overtime'))
    return true
  if (cleanUrl === '/dashboard/timesheet' || cleanUrl.startsWith('/dashboard/scheduling-timesheet'))
    return true
  if (cleanUrl === '/dashboard/approval') return true
  if (cleanUrl === '/dashboard/curhat') return true
  if (cleanUrl === '/dashboard/hr-counseling') return true
  if (cleanUrl === '/dashboard/safety' || cleanUrl.startsWith('/dashboard/safety/')) return true
  if (cleanUrl === '/dashboard/hse' || cleanUrl.startsWith('/dashboard/hse/')) return true
  if (cleanUrl === '/dashboard/safety-induction') return true
  if (cleanUrl === '/dashboard/quality/5r' || cleanUrl.startsWith('/dashboard/quality/'))
    return true
  if (cleanUrl === '/dashboard/gamification') return true
  if (cleanUrl === '/dashboard/wellness' || cleanUrl === '/dashboard/hc/mcu-wellness') return true
  if (cleanUrl === '/dashboard/executive') return true
  if (cleanUrl === '/dashboard/cargo-manifest') return true
  if (cleanUrl === '/dashboard/security/roles') return true
  if (cleanUrl === '/dashboard/reports') return true
  if (cleanUrl === '/dashboard/training') return true
  if (cleanUrl.startsWith('/dashboard/central-service/forecast')) return true
  if (cleanUrl === '/dashboard/attendance' || cleanUrl.startsWith('/dashboard/attendance/'))
    return true

  const segments = cleanUrl.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  const knownMobilePages = [
    'activity',
    'approval',
    'attendance',
    'cargo-manifest',
    'curhat',
    'executive',
    'gamification',
    'hr-counseling',
    'hse',
    'lms',
    'notifications',
    'overtime',
    'profile',
    'reports',
    'timesheet',
    'training',
    'wellness',
    'hiradc',
    'inventaris',
    'incident-report',
    'safety-data',
    'inspections',
    'induction',
    'sia-sio-tools',
    'observasi-emergency',
    'corrective-action',
    'ptw',
    'jsa',
    'checklist',
    'tire-inspection',
  ]
  return knownMobilePages.includes(lastSegment)
}

function SubmitButton({
  children,
  variant = 'default',
  size = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? 'Memproses...' : children}
    </Button>
  )
}

function buildDraftPermissions(
  roleId: number,
  menuItems: MenuRow[],
  menuPermissions: MenuPermissionRow[]
) {
  const permissionByMenu = new Map(
    menuPermissions
      .filter((permission) => permission.roleId === roleId)
      .map((permission) => [permission.menuItemId, permission])
  )
  return menuItems.map<DraftPermission>((menuItem) => {
    const permission = permissionByMenu.get(menuItem.id)
    return {
      menuItemId: menuItem.id,
      canView: permission?.canView ?? false,
      canEdit: permission?.canEdit ?? false,
      canDelete: permission?.canDelete ?? false,
      canSelectAll: permission?.canSelectAll ?? false,
      dataScope: permission?.dataScope ?? 'own',
    }
  })
}

function countEnabledPermissions(permissions: DraftPermission[]) {
  return permissions.reduce((total, permission) => {
    return (
      total +
      Number(permission.canView) +
      Number(permission.canEdit) +
      Number(permission.canDelete) +
      Number(permission.canSelectAll)
    )
  }, 0)
}

function RoleChangeSelect({
  userId,
  currentRoleId,
  roles,
  formAction,
}: {
  userId: number
  currentRoleId: number
  roles: { id: number; name: string }[]
  formAction: (formData: FormData) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="intent" value="assign-user-role" />
      <input type="hidden" name="employeeId" value={String(userId)} />
      <input type="hidden" name="roleId" value="" />
      <Select
        defaultValue={String(currentRoleId)}
        onValueChange={(value) => {
          const form = formRef.current
          if (!form) return
          const input = form.querySelector('input[name="roleId"]') as HTMLInputElement
          if (input) {
            input.value = value
            form.requestSubmit()
          }
        }}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.id} value={String(role.id)}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  )
}

export function SecurityRoleManagement({
  roles,
  menuItems,
  menuPermissions,
  users,
}: {
  roles: RoleRow[]
  menuItems: MenuRow[]
  menuPermissions: MenuPermissionRow[]
  users: UserRow[]
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<number>(roles[0]?.id ?? 0)
  const [draftPermissions, setDraftPermissions] = useState<DraftPermission[]>(
    buildDraftPermissions(roles[0]?.id ?? 0, menuItems, menuPermissions)
  )
  const [openMenuAreas, setOpenMenuAreas] = useState<Set<string>>(
    () => new Set(menuItems.map((menuItem) => getSidebarSection(menuItem)))
  )
  const [roleState, roleFormAction] = useActionState(manageSecurityRoleAction, INITIAL_STATE)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
  const [permissionSearchQuery, setPermissionSearchQuery] = useState('')
  const [permissionStateFilter, setPermissionStateFilter] = useState<PermissionStateFilter>('all')
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    setDraftPermissions(buildDraftPermissions(selectedRoleId, menuItems, menuPermissions))
  }, [menuItems, menuPermissions, selectedRoleId])

  useEffect(() => {
    setOpenMenuAreas(
      new Set(
        menuItems
          .filter((menuItem) => matchesViewFilter(menuItem, viewFilter))
          .filter((menuItem) => {
            const query = permissionSearchQuery.trim().toLowerCase()
            if (!query) return true
            return [menuItem.title, menuItem.resource, menuItem.url, menuItem.section].some(
              (value) => value?.toLowerCase().includes(query)
            )
          })
          .map((menuItem) => getSidebarSection(menuItem))
      )
    )
  }, [menuItems, permissionSearchQuery, viewFilter])

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0]
  const savedPermissions = useMemo(
    () => buildDraftPermissions(selectedRoleId, menuItems, menuPermissions),
    [menuItems, menuPermissions, selectedRoleId]
  )
  const savedPermissionByMenuId = useMemo(() => {
    return new Map(savedPermissions.map((permission) => [permission.menuItemId, permission]))
  }, [savedPermissions])
  const permissionByMenuId = useMemo(() => {
    return new Map(draftPermissions.map((permission) => [permission.menuItemId, permission]))
  }, [draftPermissions])
  const changedPermissions = useMemo(
    () =>
      draftPermissions.filter(
        (permission) =>
          !isSamePermission(permission, savedPermissionByMenuId.get(permission.menuItemId))
      ),
    [draftPermissions, savedPermissionByMenuId]
  )
  const widenedScopeCount = changedPermissions.filter((permission) =>
    isWidenedScope(
      savedPermissionByMenuId.get(permission.menuItemId)?.dataScope,
      permission.dataScope
    )
  ).length
  const deleteEnabledCount = changedPermissions.filter((permission) => {
    const previous = savedPermissionByMenuId.get(permission.menuItemId)
    return !previous?.canDelete && permission.canDelete
  }).length
  const groupedMenus = useMemo(() => {
    const query = permissionSearchQuery.trim().toLowerCase()
    const filteredItems = menuItems
      .filter((menuItem) => matchesViewFilter(menuItem, viewFilter))
      .filter((menuItem) => {
        if (!query) return true
        return [menuItem.title, menuItem.resource, menuItem.url, menuItem.section].some((value) =>
          value?.toLowerCase().includes(query)
        )
      })
      .filter((menuItem) => {
        if (permissionStateFilter === 'all') return true
        const permission = permissionByMenuId.get(menuItem.id)
        if (permissionStateFilter === 'enabled') return hasEnabledPermission(permission)
        return !isSamePermission(permission, savedPermissionByMenuId.get(menuItem.id))
      })
      .sort((left, right) => {
        const leftSection = getSidebarSection(left)
        const rightSection = getSidebarSection(right)
        const leftSectionIndex = DESKTOP_MENU_ORDER.indexOf(
          leftSection as (typeof DESKTOP_MENU_ORDER)[number]
        )
        const rightSectionIndex = DESKTOP_MENU_ORDER.indexOf(
          rightSection as (typeof DESKTOP_MENU_ORDER)[number]
        )
        const sectionDiff =
          (leftSectionIndex === -1 ? 999 : leftSectionIndex) -
          (rightSectionIndex === -1 ? 999 : rightSectionIndex)
        if (sectionDiff !== 0) return sectionDiff
        return (
          (left.sortOrder ?? 999) - (right.sortOrder ?? 999) ||
          left.title.localeCompare(right.title)
        )
      })

    return filteredItems.reduce<Array<{ section: string; items: MenuRow[] }>>(
      (accumulator, menuItem) => {
        const section = getSidebarSection(menuItem)
        const group = accumulator.find((item) => item.section === section)
        if (group) {
          group.items.push(menuItem)
        } else {
          accumulator.push({ section, items: [menuItem] })
        }
        return accumulator
      },
      []
    )
  }, [
    menuItems,
    permissionSearchQuery,
    permissionStateFilter,
    permissionByMenuId,
    savedPermissionByMenuId,
    viewFilter,
  ])

  const selectedRoleEnabledCount = countEnabledPermissions(draftPermissions)
  const totalMenuCount = menuItems.length
  const activeProgress =
    totalMenuCount > 0 ? Math.round((selectedRoleEnabledCount / (totalMenuCount * 4)) * 100) : 0

  const previewItems = useMemo(
    () =>
      menuItems
        .map((menuItem) => ({ menuItem, permission: permissionByMenuId.get(menuItem.id) }))
        .filter(({ permission }) => hasEnabledPermission(permission))
        .sort((left, right) => left.menuItem.title.localeCompare(right.menuItem.title)),
    [menuItems, permissionByMenuId]
  )

  const roleUsers = useMemo(() => {
    return users.filter((user) => user.accessRole === selectedRole?.name)
  }, [users, selectedRole])

  const availableUsers = useMemo(() => {
    const assignedIds = new Set(roleUsers.map((u) => u.id))
    const query = userSearchQuery.toLowerCase()
    return users.filter(
      (user) =>
        !assignedIds.has(user.id) &&
        user.isActive &&
        (user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.jobTitle.toLowerCase().includes(query))
    )
  }, [users, roleUsers, userSearchQuery])

  const toggleMenuArea = (menuArea: string) => {
    setOpenMenuAreas((current) => {
      const next = new Set(current)
      if (next.has(menuArea)) {
        next.delete(menuArea)
      } else {
        next.add(menuArea)
      }
      return next
    })
  }

  const updatePermission = (
    menuItemId: number,
    field: (typeof PERMISSION_FIELDS)[number]['key'],
    checked: boolean
  ) => {
    setDraftPermissions((current) =>
      current.map((permission) =>
        permission.menuItemId === menuItemId ? { ...permission, [field]: checked } : permission
      )
    )
  }

  const updateDataScope = (menuItemId: number, scope: string) => {
    setDraftPermissions((current) =>
      current.map((permission) =>
        permission.menuItemId === menuItemId ? { ...permission, dataScope: scope } : permission
      )
    )
  }

  const applyPreset = (preset: (typeof QUICK_PRESETS)[number]) => {
    setDraftPermissions(preset.apply(menuItems))
  }

  return (
    <div className="space-y-6">
      {roleState.status !== 'idle' ? (
        <Alert
          className={
            roleState.status === 'error'
              ? 'border-red-200 text-red-700'
              : 'border-emerald-200 text-emerald-700'
          }
        >
          <AlertDescription>{roleState.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Left: Role List ── */}
        <Card className="bg-surface-container-lowest rounded-xl shadow-[0_18px_42px_rgba(0,52,97,0.08)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Daftar Peran</CardTitle>
              <div className="flex items-center gap-2">
                <form action={roleFormAction}>
                  <input type="hidden" name="intent" value="sync-permissions" />
                  <SubmitButton variant="outline" size="sm" title="Sinkronkan semua menu dan halaman baru ke matriks role">
                    <RefreshCw className="mr-1 size-3.5" />
                    Sync
                  </SubmitButton>
                </form>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="size-4" />
                      Peran Baru
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buat Peran Baru</DialogTitle>
                    <DialogDescription>
                      Peran baru dimulai tanpa akses menu. Anda dapat mengaturnya setelah dibuat.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={roleFormAction} className="space-y-4">
                    <input type="hidden" name="intent" value="create-role" />
                    <label className="grid gap-2">
                      <Label>Nama Peran</Label>
                      <Input name="roleName" placeholder="Contoh: Finance Admin" />
                    </label>
                    <label className="grid gap-2">
                      <Label>Deskripsi</Label>
                      <Input name="description" placeholder="Ringkasan tanggung jawab peran" />
                    </label>
                    <div className="grid gap-2">
                      <Label>Cakupan Akses</Label>
                      <Select name="scope" defaultValue="site">
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih cakupan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="site">Site tertentu</SelectItem>
                          <SelectItem value="all_sites">Semua site</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <SubmitButton>Buat Peran</SubmitButton>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {roles.map((role) => {
              const rolePermCount = countEnabledPermissions(
                buildDraftPermissions(role.id, menuItems, menuPermissions)
              )
              const isSelected = selectedRoleId === role.id
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full rounded-xl px-4 py-3.5 text-left transition-all ${
                    isSelected
                      ? 'bg-primary/8 shadow-[inset_3px_0_0_var(--primary),0_8px_20px_rgba(0,52,97,0.08)]'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{role.name}</p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {role.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
                      {formatScopeLabel(role.scope)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-2.5 flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" />
                      {role.assignedUsers} user
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="size-3" />
                      {rolePermCount} izin
                    </span>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* ── Right: Tabs ── */}
        <div className="space-y-4">
          <Card className="bg-surface-container-lowest rounded-xl shadow-[0_18px_42px_rgba(0,52,97,0.08)]">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">{selectedRole?.name ?? '—'}</CardTitle>
                  <p className="text-muted-foreground text-sm">{selectedRole?.description}</p>
                  <div className="text-muted-foreground mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="bg-surface-container-low inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium">
                      <ListChecks className="size-3.5" />
                      {selectedRoleEnabledCount} dari {totalMenuCount * 4} izin aktif
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="bg-surface-container h-1.5 w-24 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${activeProgress}%` }}
                        />
                      </div>
                      <span className="font-medium">{activeProgress}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Copy className="size-4" />
                        Duplikat
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Duplikat Peran</DialogTitle>
                        <DialogDescription>
                          Menyalin seluruh akses dari peran yang sedang dipilih.
                        </DialogDescription>
                      </DialogHeader>
                      <form action={roleFormAction} className="space-y-4">
                        <input type="hidden" name="intent" value="duplicate-role" />
                        <input
                          type="hidden"
                          name="sourceRoleId"
                          value={selectedRole ? `${selectedRole.id}` : ''}
                        />
                        <label className="grid gap-2">
                          <Label>Nama Peran Baru</Label>
                          <Input
                            name="roleName"
                            defaultValue={selectedRole ? `${selectedRole.name} Copy` : ''}
                          />
                        </label>
                        <label className="grid gap-2">
                          <Label>Deskripsi</Label>
                          <Input
                            name="description"
                            defaultValue={selectedRole?.description ?? ''}
                          />
                        </label>
                        <div className="grid gap-2">
                          <Label>Cakupan Akses</Label>
                          <Select name="scope" defaultValue={selectedRole?.scope ?? 'site'}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih cakupan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="site">Site tertentu</SelectItem>
                              <SelectItem value="all_sites">Semua site</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <SubmitButton>Duplikat Peran</SubmitButton>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 size-4" />
                        Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Peran?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus peran "{selectedRole?.name}"? Aksi ini
                          tidak dapat dibatalkan. Pengguna yang masih menggunakan peran ini akan
                          dipindahkan ke peran aktif lainnya secara otomatis.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <form action={roleFormAction}>
                          <input type="hidden" name="intent" value="delete-role" />
                          <input
                            type="hidden"
                            name="roleId"
                            value={selectedRole ? `${selectedRole.id}` : ''}
                          />
                          <SubmitButton variant="destructive">Ya, Hapus Peran</SubmitButton>
                        </form>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="permissions">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="permissions">
                    <Settings className="mr-1.5 size-3.5" />
                    Permissions
                  </TabsTrigger>
                  <TabsTrigger value="users">
                    <Users className="mr-1.5 size-3.5" />
                    Users ({roleUsers.length})
                  </TabsTrigger>
                </TabsList>

                {/* ── Tab: Permissions ── */}
                <TabsContent value="permissions" className="mt-4 space-y-4">
                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        title={preset.description}
                      >
                        {preset.icon}
                        {preset.label}
                      </Button>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                        View
                      </span>
                      <Select
                        value={viewFilter}
                        onValueChange={(value) => setViewFilter(value as ViewFilter)}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua</SelectItem>
                          <SelectItem value="desktop">Desktop</SelectItem>
                          <SelectItem value="mobile">Mobile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border-border/70 bg-surface-container-low flex flex-col gap-2 rounded-xl border p-3 lg:flex-row lg:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        value={permissionSearchQuery}
                        onChange={(event) => setPermissionSearchQuery(event.target.value)}
                        placeholder="Cari menu, resource, atau URL..."
                        className="h-9 bg-white pl-9 text-sm"
                      />
                    </div>
                    <Select
                      value={permissionStateFilter}
                      onValueChange={(value) =>
                        setPermissionStateFilter(value as PermissionStateFilter)
                      }
                    >
                      <SelectTrigger className="h-9 w-full bg-white text-xs lg:w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua menu</SelectItem>
                        <SelectItem value="enabled">Hanya aktif</SelectItem>
                        <SelectItem value="changed">Hanya berubah</SelectItem>
                      </SelectContent>
                    </Select>
                    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 bg-white"
                        >
                          <Eye className="size-4" />
                          Preview Akses
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>Preview akses efektif</DialogTitle>
                          <DialogDescription>
                            Hak akses yang akan berlaku untuk role {selectedRole?.name ?? 'ini'}.
                            Scope Site mengikuti site utama user.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary">{previewItems.length} menu aktif</Badge>
                          <Badge variant="outline">
                            {
                              previewItems.filter(
                                ({ permission }) => permission?.dataScope === 'global'
                              ).length
                            }{' '}
                            Global
                          </Badge>
                          <Badge variant="outline">
                            {
                              previewItems.filter(
                                ({ permission }) => permission?.dataScope === 'site'
                              ).length
                            }{' '}
                            Site utama
                          </Badge>
                        </div>
                        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                          {previewItems.length === 0 ? (
                            <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
                              Role ini belum memiliki permission aktif.
                            </div>
                          ) : (
                            previewItems.map(({ menuItem, permission }) => (
                              <div
                                key={menuItem.id}
                                className="border-border/70 bg-surface-container-lowest flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{menuItem.title}</p>
                                  <p className="text-muted-foreground truncate text-xs">
                                    {menuItem.resource} · {menuItem.url}
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-1.5">
                                  {permission?.canView && <Badge variant="secondary">Lihat</Badge>}
                                  {permission?.canEdit && <Badge variant="secondary">Ubah</Badge>}
                                  {permission?.canDelete && (
                                    <Badge variant="destructive">Hapus</Badge>
                                  )}
                                  {permission?.canSelectAll && (
                                    <Badge variant="outline">Pilih semua data</Badge>
                                  )}
                                  <Badge variant="outline">
                                    {formatDataScopeLabel(permission?.dataScope ?? 'own')}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {changedPermissions.length > 0 && (
                    <Alert className="border-amber-200 bg-amber-50/70 text-amber-950">
                      <AlertTriangle className="size-4" />
                      <AlertDescription>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <span className="font-semibold">
                            {changedPermissions.length} perubahan belum disimpan
                          </span>
                          {widenedScopeCount > 0 && <span>{widenedScopeCount} scope melebar</span>}
                          {deleteEnabledCount > 0 && (
                            <span>{deleteEnabledCount} izin hapus baru</span>
                          )}
                          <span className="text-amber-800">Periksa preview sebelum menyimpan.</span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Permission Form */}
                  <form action={roleFormAction} className="space-y-3">
                    <input type="hidden" name="intent" value="save-menu-permissions" />
                    <input
                      type="hidden"
                      name="roleId"
                      value={selectedRole ? `${selectedRole.id}` : ''}
                    />
                    <input
                      type="hidden"
                      name="permissionsJson"
                      value={JSON.stringify(draftPermissions)}
                    />

                    {groupedMenus.map(({ section, items }) => {
                      const areaPermissions = items.map((menuItem) =>
                        permissionByMenuId.get(menuItem.id)
                      )
                      const activeCount = countEnabledPermissions(
                        areaPermissions.filter(Boolean) as DraftPermission[]
                      )
                      const isOpen = openMenuAreas.has(section)

                      return (
                        <Collapsible
                          key={section}
                          open={isOpen}
                          onOpenChange={() => toggleMenuArea(section)}
                          className="bg-surface-container-low overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_var(--outline-ghost)]"
                        >
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="bg-surface-container hover:bg-surface-container-high flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <ChevronDown
                                  className={`text-primary size-4 shrink-0 transition-transform ${
                                    isOpen ? 'rotate-0' : '-rotate-90'
                                  }`}
                                />
                                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg">
                                  {MENU_AREA_META[items[0]?.menuArea]?.icon ?? (
                                    <ListChecks className="size-4" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-medium">{section}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {items.length} menu mengikuti urutan sidebar
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs">
                                  {activeCount}/{items.length * 4}
                                </span>
                                <Badge variant="outline" className="rounded-full text-[10px]">
                                  {isOpen ? 'Tutup' : 'Buka'}
                                </Badge>
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="hidden space-y-3 p-3 md:block">
                              <div className="border-border/70 overflow-auto rounded-[1rem] border bg-white shadow-sm">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead>Menu</TableHead>
                                      {PERMISSION_FIELDS.map((field) => (
                                        <TableHead key={field.key} className="text-center">
                                          {field.label}
                                        </TableHead>
                                      ))}
                                      <TableHead className="text-center">Scope Data</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {items.map((menuItem) => {
                                      const currentPermission = permissionByMenuId.get(
                                        menuItem.id
                                      ) ?? {
                                        menuItemId: menuItem.id,
                                        canView: false,
                                        canEdit: false,
                                        canDelete: false,
                                        canSelectAll: false,
                                        dataScope: 'own',
                                      }
                                      const isMobile = hasMobileCounterpart(
                                        menuItem.url,
                                        menuItem.resource
                                      )
                                      return (
                                        <TableRow key={menuItem.id}>
                                          <TableCell>
                                            <div className="space-y-1">
                                              {menuItem.groupLabel && (
                                                <p className="text-muted-foreground text-[10px] font-black tracking-[0.18em] uppercase">
                                                  {menuItem.groupLabel}
                                                </p>
                                              )}
                                              <div className="flex items-center gap-2">
                                                <p className="font-medium">{menuItem.title}</p>
                                                {!isDesktopMenu(menuItem) && (
                                                  <Badge
                                                    variant="outline"
                                                    className="text-[9px] font-black tracking-wider uppercase"
                                                  >
                                                    Mobile
                                                  </Badge>
                                                )}
                                                {isMobile && (
                                                  <Badge
                                                    variant="secondary"
                                                    className="h-auto gap-0.5 border-none bg-sky-500/10 py-0.5 text-[9px] font-black tracking-wider text-sky-700 uppercase"
                                                  >
                                                    <Smartphone className="size-2.5" /> M
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </TableCell>
                                          {PERMISSION_FIELDS.map((field) => (
                                            <TableCell
                                              key={`${menuItem.id}-${field.key}`}
                                              className="text-center"
                                            >
                                              <Checkbox
                                                checked={currentPermission[field.key]}
                                                onCheckedChange={(checked) =>
                                                  updatePermission(
                                                    menuItem.id,
                                                    field.key,
                                                    Boolean(checked)
                                                  )
                                                }
                                              />
                                            </TableCell>
                                          ))}
                                          <TableCell className="text-center">
                                            <Select
                                              value={currentPermission.dataScope}
                                              onValueChange={(value) =>
                                                updateDataScope(menuItem.id, value)
                                              }
                                            >
                                              <SelectTrigger className="mx-auto h-8 w-[120px] text-[11px]">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="global">Global</SelectItem>
                                                <SelectItem value="site">Site Only</SelectItem>
                                                <SelectItem value="own">Own Only</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            <div className="space-y-3 p-3 md:hidden">
                              {items.map((menuItem) => {
                                const currentPermission = permissionByMenuId.get(menuItem.id) ?? {
                                  menuItemId: menuItem.id,
                                  canView: false,
                                  canEdit: false,
                                  canDelete: false,
                                  canSelectAll: false,
                                  dataScope: 'own',
                                }
                                const isMobile = hasMobileCounterpart(
                                  menuItem.url,
                                  menuItem.resource
                                )
                                return (
                                  <section
                                    key={menuItem.id}
                                    className="bg-surface-container-lowest rounded-lg p-4 shadow-[0_10px_22px_rgba(0,52,97,0.08)]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="min-w-0">
                                        {menuItem.groupLabel && (
                                          <p className="text-muted-foreground text-[10px] font-black tracking-[0.18em] uppercase">
                                            {menuItem.groupLabel}
                                          </p>
                                        )}
                                        <p className="font-medium">{menuItem.title}</p>
                                      </div>
                                      {!isDesktopMenu(menuItem) && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-black tracking-wider uppercase"
                                        >
                                          Mobile
                                        </Badge>
                                      )}
                                      {isMobile && (
                                        <Badge
                                          variant="secondary"
                                          className="h-auto gap-0.5 border-none bg-sky-500/10 py-0.5 text-[9px] font-black tracking-wider text-sky-700 uppercase"
                                        >
                                          <Smartphone className="size-2.5" /> Mobile
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                      {PERMISSION_FIELDS.map((field) => (
                                        <label
                                          key={`${menuItem.id}-${field.key}`}
                                          className="bg-surface-container-low flex min-h-10 items-center justify-between gap-2 rounded-md px-3 text-sm font-medium"
                                        >
                                          <span>{field.label}</span>
                                          <Checkbox
                                            checked={currentPermission[field.key]}
                                            onCheckedChange={(checked) =>
                                              updatePermission(
                                                menuItem.id,
                                                field.key,
                                                Boolean(checked)
                                              )
                                            }
                                          />
                                        </label>
                                      ))}
                                    </div>
                                    <div className="mt-2">
                                      <Select
                                        value={currentPermission.dataScope}
                                        onValueChange={(value) =>
                                          updateDataScope(menuItem.id, value)
                                        }
                                      >
                                        <SelectTrigger className="h-9 w-full text-xs">
                                          <SelectValue placeholder="Scope data" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="global">
                                            Global — Lihat semua data
                                          </SelectItem>
                                          <SelectItem value="site">
                                            Site Only — Hanya lokasi tugas
                                          </SelectItem>
                                          <SelectItem value="own">
                                            Own Only — Hanya data sendiri
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </section>
                                )
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )
                    })}

                    {groupedMenus.length === 0 && (
                      <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
                        Tidak ada menu yang cocok dengan filter saat ini.
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <SubmitButton>
                        <Save className="size-4" />
                        {changedPermissions.length > 0
                          ? `Simpan ${changedPermissions.length} Perubahan`
                          : 'Simpan Akses Menu'}
                      </SubmitButton>
                    </div>
                  </form>
                </TabsContent>

                {/* ── Tab: Users ── */}
                <TabsContent value="users" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-muted-foreground text-sm">
                      {roleUsers.length} user menggunakan peran ini.
                    </p>
                    <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="size-4" />
                          Tambah User
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Tambah User ke {selectedRole?.name}</DialogTitle>
                          <DialogDescription>
                            Pilih user yang ingin ditambahkan ke peran ini.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                              placeholder="Cari nama, email, atau jabatan..."
                              value={userSearchQuery}
                              onChange={(event) => setUserSearchQuery(event.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <div className="space-y-2">
                            {availableUsers.length === 0 ? (
                              <p className="text-muted-foreground py-8 text-center text-sm">
                                Tidak ada user tersedia untuk ditambahkan.
                              </p>
                            ) : (
                              availableUsers.slice(0, 50).map((user) => (
                                <form key={user.id} action={roleFormAction}>
                                  <input type="hidden" name="intent" value="assign-user-role" />
                                  <input
                                    type="hidden"
                                    name="roleId"
                                    value={selectedRole ? `${selectedRole.id}` : ''}
                                  />
                                  <input type="hidden" name="employeeId" value={`${user.id}`} />
                                  <div className="bg-surface-container-low flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                                    <div className="min-w-0">
                                      <p className="font-medium">{user.name}</p>
                                      <p className="text-muted-foreground text-xs">{user.email}</p>
                                      {user.jobTitle && (
                                        <p className="text-muted-foreground text-xs">
                                          {user.jobTitle}
                                        </p>
                                      )}
                                    </div>
                                    <SubmitButton size="sm">
                                      <Plus className="size-3" />
                                      Tambah
                                    </SubmitButton>
                                  </div>
                                </form>
                              ))
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {roleUsers.length === 0 ? (
                    <div className="bg-surface-container-low rounded-xl border border-dashed py-12 text-center">
                      <Users className="text-muted-foreground/50 mx-auto size-8" />
                      <p className="text-muted-foreground mt-2 text-sm">
                        Belum ada user dengan peran ini.
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Klik &quot;Tambah User&quot; untuk assign user ke peran ini.
                      </p>
                    </div>
                  ) : (
                    <div className="border-border/70 overflow-auto rounded-[1rem] border bg-white shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Nama</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Jabatan</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead className="w-[200px]">Role</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roleUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell className="text-muted-foreground">{user.email}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {user.jobTitle || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {user.section || '—'}
                              </TableCell>
                              <TableCell>
                                <RoleChangeSelect
                                  userId={user.id}
                                  currentRoleId={selectedRole?.id ?? 0}
                                  roles={roles}
                                  formAction={roleFormAction}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <form action={roleFormAction} className="inline-flex">
                                  <input type="hidden" name="intent" value="remove-user-role" />
                                  <input type="hidden" name="employeeId" value={`${user.id}`} />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive size-7"
                                    title={`Hapus ${user.name} dari peran ini`}
                                  >
                                    <UserMinus className="size-3.5" />
                                  </Button>
                                </form>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
