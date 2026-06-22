'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, Pencil, ShieldBan, Trash2, Save, UserCog, Key, Ban, TrendingUp, Mail } from 'lucide-react'
import { manageSecurityUserAction, type AdminMutationState } from '@/app/dashboard/admin-actions'
import { getBirthDateInputValue, normalizeBirthDateValue } from '@/lib/birth-date'
import type { SecurityUserRecord } from '@/lib/hero-admin'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProfilePhotoField } from '@/components/profile-photo-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  TableRow,
} from '@/components/ui/table'

const INITIAL_STATE: AdminMutationState = {
  status: 'idle',
  message: '',
}

const compactSelectTriggerClass =
  'min-h-10 w-full min-w-0 overflow-hidden text-left [&>span]:block [&>span]:truncate'
const compactSelectContentClass = 'max-w-[min(36rem,calc(100vw-3rem))]'

function getUserInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  )
}

function SubmitButton({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'destructive'
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? 'Menyimpan...' : children}
    </Button>
  )
}

export function SecurityUserRowActions({
  user,
  managerOptions,
  roleOptions,
  sections,
  departments,
  positions,
  sites,
}: {
  user: SecurityUserRecord
  managerOptions: Array<{ id: number; name: string }>
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
}) {
  const router = useRouter()
  const [, startRefreshTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(manageSecurityUserAction, INITIAL_STATE)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(() => {
    // Try to find department from section's departmentId first
    if (user.sectionId) {
      const sec = sections.find((s) => s.id === user.sectionId);
      if (sec?.departmentId) return sec.departmentId.toString();
    }
    return departments.find((department) => department.name === user.department)?.id.toString() ?? '';
  })
  const [selectedSectionId, setSelectedSectionId] = useState(
    // Match by sectionId first, then by name
    user.sectionId
      ? sections.find((s) => s.id === user.sectionId)?.id.toString() ?? ''
      : sections.find((section) => section.name === user.section)?.id.toString() ?? ''
  )
  const [selectedSiteId, setSelectedSiteId] = useState(user.siteId ? `${user.siteId}` : '')

  const selectedSite = sites.find((site) => site.id.toString() === selectedSiteId) ?? null
  const filteredSections = (() => {
    if (!selectedDepartmentId) return sections;
    const byDept = sections.filter((section) => section.departmentId?.toString() === selectedDepartmentId);
    // Always include the currently selected section even if department doesn't match
    if (selectedSectionId) {
      const selected = sections.find((s) => s.id.toString() === selectedSectionId);
      if (selected && !byDept.some((s) => s.id === selected.id)) {
        byDept.push(selected);
      }
    }
    return byDept;
  })();
  const selectedDepartmentName =
    departments.find((department) => department.id.toString() === selectedDepartmentId)?.name ||
    user.department
  const selectedSectionName =
    sections.find((section) => section.id.toString() === selectedSectionId)?.name || user.section
  const resolvedWorkLocation =
    selectedSite?.name || user.workLocation || ''

  useEffect(() => {
    if (state.status === 'success') {
      if (state.message.toLowerCase().includes('dihapus')) {
        setOpen(false)
      }
      if (
        state.message.toLowerCase().includes('role') &&
        state.message.toLowerCase().includes('diubah')
      ) {
        setOpen(false)
      }
      startRefreshTransition(() => router.refresh())
    }
  }, [router, state, startRefreshTransition])

  useEffect(() => {
    if (open) {
      // Prefer sectionId-based resolution
      const sec = user.sectionId ? sections.find((s) => s.id === user.sectionId) : null;
      setSelectedDepartmentId(
        sec?.departmentId?.toString() ??
        departments.find((department) => department.name === user.department)?.id.toString() ?? ''
      )
      setSelectedSectionId(
        sec?.id.toString() ??
        sections.find((section) => section.name === user.section)?.id.toString() ?? ''
      )
      setSelectedSiteId(user.siteId ? `${user.siteId}` : '')
    }
  }, [departments, open, sections, user.department, user.section, user.sectionId, user.siteId])

  return (
    <>
      <Link
        href={`/dashboard/hc/employee/${user.id}`}
        className="text-violet-600 hover:bg-violet-50 hover:text-violet-700 rounded-xl p-2 inline-flex items-center justify-center transition-colors"
        title="Lihat Produktivitas Karyawan"
      >
        <TrendingUp className="size-4" />
      </Link>

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary hover:bg-surface-container-low rounded-xl"
          aria-label={`Kelola ${user.name}`}
          title={`Kelola ${user.name}`}
        >
          <Eye className="size-4" />
          <span className="sr-only">Kelola pengguna</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-hidden p-0 sm:max-w-5xl">
        <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>Kelola Pengguna</DialogTitle>
          <DialogDescription>
            Lihat detail pengguna, ubah profil, ganti peran, reset password, nonaktifkan, atau hapus
            akses.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="min-w-0 space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="access">Akses</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="danger">Danger</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-0 space-y-5">
            {/* Header Card */}
            <div className="bg-surface-container-low flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-[1.2rem] p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="border-border size-14 border">
                  <AvatarImage src={user.profileImage || undefined} alt={user.name} className="object-cover" />
                  <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                    {getUserInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="break-words text-lg font-semibold leading-snug">{user.name}</p>
                  <p className="text-muted-foreground text-sm break-all">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <AdminStatusBadge value={user.status} />
                <Link
                  href={`/dashboard/hc/employee/${user.id}`}
                  onClick={() => setOpen(false)}
                  className="bg-violet-600 hover:bg-violet-700 text-white hover:text-white border-0 text-xs flex items-center gap-1.5 h-8 px-3 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Eye className="size-3.5" />
                  <span>Lihat Produktivitas</span>
                </Link>
              </div>
            </div>

            {/* Profile Data Table */}
            <div className="bg-surface-container-low overflow-x-auto rounded-[1.2rem] p-4">
              <p className="mb-3 text-sm font-semibold text-[#1e293b]">Data Pengguna</p>
              <Table>
                <TableBody>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">SN</TableCell>
                    <TableCell className="py-2 text-sm">{user.employeeSn || '—'}</TableCell>
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Department</TableCell>
                    <TableCell className="py-2 text-sm">{user.department || '—'}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Section</TableCell>
                    <TableCell className="py-2 text-sm">{user.section || '—'}</TableCell>
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Job Title</TableCell>
                    <TableCell className="py-2 text-sm">{user.jobTitle || '—'}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Level Staff</TableCell>
                    <TableCell className="py-2 text-sm">{user.levelName || '—'}</TableCell>
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Peran</TableCell>
                    <TableCell className="py-2 text-sm">{user.accessRole || '—'}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Lokasi Site</TableCell>
                    <TableCell className="py-2 text-sm">{user.workLocation || '—'}</TableCell>
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Tipe Status</TableCell>
                    <TableCell className="py-2 text-sm">{user.employeeStatusType || '—'}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Gender</TableCell>
                    <TableCell className="py-2 text-sm">{user.gender || '—'}</TableCell>
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Agama</TableCell>
                    <TableCell className="py-2 text-sm">{user.religion || '—'}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Pendidikan</TableCell>
                    <TableCell className="py-2 text-sm">{user.education || '—'}</TableCell>
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Marital Status</TableCell>
                    <TableCell className="py-2 text-sm">{user.maritalStatus || '—'}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">POH</TableCell>
                    <TableCell className="py-2 text-sm">{user.pointOfHire || '—'}</TableCell>
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Join Date</TableCell>
                    <TableCell className="py-2 text-sm">{user.joinDate || '—'}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Contract Start</TableCell>
                    <TableCell className="py-2 text-sm">{user.contractDurationStart || '—'}</TableCell>
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Contract End</TableCell>
                    <TableCell className="py-2 text-sm">{user.contractDurationEnd || '—'}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Permanent Date</TableCell>
                    <TableCell className="py-2 text-sm">{user.permanentDate || '—'}</TableCell>
                    <TableCell className="text-muted-foreground w-[180px] py-2 text-xs font-medium">Tgl Lahir</TableCell>
                    <TableCell className="py-2 text-sm">{user.birthDate || '—'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {state.status !== 'idle' ? (
                  <Alert
                    className={
                      state.status === 'error'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    <AlertDescription>{state.message}</AlertDescription>
                  </Alert>
                ) : null}

                <form
                  action={formAction}
                  className="bg-surface-container-low min-w-0 space-y-4 rounded-[1.2rem] p-4"
                >
                  <div className="flex items-center gap-2">
                    <Pencil className="text-muted-foreground size-4" />
                    <p className="font-medium">Edit Profil Pengguna</p>
                  </div>
                  <input type="hidden" name="intent" value="update-profile" />
                  <input type="hidden" name="employeeId" value={user.id} />
                  <input type="hidden" name="email" value={user.email} />
                  <input type="hidden" name="phoneNumber" value={user.phoneNumber} />
                  <input type="hidden" name="directManagerId" value={user.directManagerId ?? 'none'} />
                  <input type="hidden" name="domicile" value={user.domicile} />
                  <input type="hidden" name="joinYear" value={`${user.joinYear}`} />
                  <input type="hidden" name="employmentStatus" value={user.status} />

                  <ProfilePhotoField
                    fallbackName={user.name}
                    initialValue={user.profileImage ?? ''}
                  />

                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Name</span>
                      <Input name="fullName" defaultValue={user.name} />
                    </label>
                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">SN</span>
                      <Input name="employeeSn" defaultValue={user.employeeSn} />
                    </label>

                    <div className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Department</span>
                      <Select
                        value={selectedDepartmentId}
                        onValueChange={(value) => {
                          setSelectedDepartmentId(value)
                          setSelectedSectionId('')
                        }}
                      >
                        <SelectTrigger className={compactSelectTriggerClass}>
                          <SelectValue placeholder="Pilih department" />
                        </SelectTrigger>
                        <SelectContent className={compactSelectContentClass}>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={`${department.id}`}>
                              {department.name} ({department.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="department" value={selectedDepartmentName} />
                    </div>

                    <div className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Section</span>
                      <Select
                        value={selectedSectionId}
                        onValueChange={setSelectedSectionId}
                        disabled={!selectedDepartmentId}
                      >
                        <SelectTrigger className={compactSelectTriggerClass}>
                          <SelectValue
                            placeholder={selectedDepartmentId ? 'Pilih section' : 'Pilih department dulu'}
                          />
                        </SelectTrigger>
                        <SelectContent className={compactSelectContentClass}>
                          {filteredSections.map((section) => (
                            <SelectItem key={section.id} value={`${section.id}`}>
                              {section.name} ({section.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="section" value={selectedSectionName} />
                    </div>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Job Title</span>
                      <Input name="jobTitle" defaultValue={user.jobTitle || ''} placeholder="e.g. Accounting & Asset SPV" />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Level Staff</span>
                      <Input name="levelName" defaultValue={user.levelName || ''} placeholder="e.g. Staff, Supervisor" />
                    </label>

                    <div className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Peran</span>
                      <Select name="accessRole" defaultValue={user.accessRole}>
                        <SelectTrigger className={compactSelectTriggerClass}>
                          <SelectValue placeholder="Pilih peran" />
                        </SelectTrigger>
                        <SelectContent className={compactSelectContentClass}>
                          {roleOptions.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Lokasi Site</span>
                      <Select value={selectedSiteId} onValueChange={setSelectedSiteId} disabled={sites.length === 0}>
                        <SelectTrigger className={compactSelectTriggerClass}>
                          <SelectValue placeholder={sites.length > 0 ? 'Pilih lokasi site' : 'Belum ada site aktif'} />
                        </SelectTrigger>
                        <SelectContent className={compactSelectContentClass}>
                          {sites.map((site) => (
                            <SelectItem key={site.id} value={`${site.id}`}>
                              {site.name} {site.location ? `- ${site.location}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="siteId" value={selectedSiteId} />
                      <input type="hidden" name="workLocation" value={resolvedWorkLocation} />
                    </div>

                    <div className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Tipe Status</span>
                      <Select name="employeeStatusType" defaultValue={user.employeeStatusType || 'Permanen | Staff'}>
                        <SelectTrigger className={compactSelectTriggerClass}>
                          <SelectValue placeholder="Pilih tipe status" />
                        </SelectTrigger>
                        <SelectContent className={compactSelectContentClass}>
                          <SelectItem value="Permanent">Permanent</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Permanen | Staff">Permanen | Staff</SelectItem>
                          <SelectItem value="Permanen | Non Staff">Permanen | Non Staff</SelectItem>
                          <SelectItem value="Kontrak | Staff">Kontrak | Staff</SelectItem>
                          <SelectItem value="Kontrak | Non Staff">Kontrak | Non Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Gender</span>
                      <Select name="gender" defaultValue={user.gender || 'none'}>
                        <SelectTrigger className={compactSelectTriggerClass}>
                          <SelectValue placeholder="Pilih gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Agama</span>
                      <Input name="religion" defaultValue={user.religion || ''} placeholder="e.g. Islam" />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Pendidikan</span>
                      <Input name="education" defaultValue={user.education || ''} placeholder="e.g. S1" />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Marital Status</span>
                      <Select name="maritalStatus" defaultValue={user.maritalStatus || 'none'}>
                        <SelectTrigger className={compactSelectTriggerClass}>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">POH</span>
                      <Input name="pointOfHire" defaultValue={user.pointOfHire || ''} placeholder="e.g. Jakarta" />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Join Date</span>
                      <Input name="joinDate" type="date" defaultValue={user.joinDate || ''} />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Contract Start</span>
                      <Input name="contractDurationStart" type="date" defaultValue={user.contractDurationStart || ''} />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Contract End</span>
                      <Input name="contractDurationEnd" type="date" defaultValue={user.contractDurationEnd || ''} />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Permanent Date</span>
                      <Input name="permanentDate" type="date" defaultValue={user.permanentDate || ''} />
                    </label>

                    <label className="grid min-w-0 gap-2">
                      <span className="text-muted-foreground text-xs font-medium">Tgl Lahir</span>
                      <Input name="birthDate" type="date" defaultValue={user.birthDate || ''} />
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <SubmitButton>
                      <Save className="mr-2 size-4" />
                      Simpan Profil
                    </SubmitButton>
                  </div>
                </form>

                <div className="grid gap-4 lg:grid-cols-2">
                  <form
                    action={formAction}
                    className="bg-surface-container-low space-y-4 rounded-[1.2rem] p-4"
                  >
                    <input type="hidden" name="intent" value="change-role" />
                    <input type="hidden" name="employeeId" value={user.id} />
                    <div className="flex items-center gap-2">
                      <Pencil className="text-muted-foreground size-4" />
                      <p className="font-medium">Ganti Peran</p>
                    </div>
                    <div className="grid gap-2">
                      <Label>Peran Akses</Label>
                      <Select name="accessRole" defaultValue={user.accessRole}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih peran" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <SubmitButton>
                        <UserCog className="mr-2 size-4" />
                        Ganti Peran
                      </SubmitButton>
                    </div>
                  </form>

                  <form
                    action={formAction}
                    className="bg-surface-container-low space-y-4 rounded-[1.2rem] p-4"
                  >
                    <input type="hidden" name="intent" value="change-password" />
                    <input type="hidden" name="employeeId" value={user.id} />
                    <div className="flex items-center gap-2">
                      <ShieldBan className="text-muted-foreground size-4" />
                      <p className="font-medium">Ganti Password</p>
                    </div>
                    <label className="grid gap-2">
                      <Label>Password Baru</Label>
                      <Input name="newPassword" type="password" placeholder="Minimal 8 karakter" />
                    </label>
                    <div className="flex justify-end">
                      <SubmitButton>
                        <Key className="mr-2 size-4" />
                        Reset Password
                      </SubmitButton>
                    </div>
                  </form>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <form action={formAction} className="space-y-4 rounded-[1.2rem] bg-[#fffbeb] p-4">
                    <input type="hidden" name="intent" value="ban-user" />
                    <input type="hidden" name="employeeId" value={user.id} />
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <ShieldBan className="size-4" />
                      <p className="font-medium">Nonaktifkan Pengguna</p>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Menonaktifkan akses login dan mengakhiri sesi aktif pengguna.
                    </p>
                    <div className="flex justify-end">
                      <SubmitButton variant="outline">
                        <Ban className="mr-2 size-4" />
                        Nonaktifkan Pengguna
                      </SubmitButton>
                    </div>
                  </form>

                  <form action={formAction} className="space-y-4 rounded-[1.2rem] bg-[#fef2f2] p-4">
                    <input type="hidden" name="intent" value="delete-user" />
                    <input type="hidden" name="employeeId" value={user.id} />
                    <div className="text-destructive flex items-center gap-2">
                      <Trash2 className="size-4" />
                      <p className="font-medium">Hapus Pengguna</p>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Hapus pengguna dari daftar karyawan dan akun login terkait.
                    </p>
                    <div className="flex justify-end">
                      <SubmitButton variant="destructive">
                        <Trash2 className="mr-2 size-4" />
                        Hapus Pengguna
                      </SubmitButton>
                    </div>
                  </form>
                </div>
          </TabsContent>
          <TabsContent
            value="access"
            className="bg-surface-container-low text-muted-foreground rounded-[1.2rem] p-4 text-sm"
          >
            Ganti peran tersedia di bagian profil pengguna.
          </TabsContent>
          <TabsContent
            value="security"
            className="mt-0 space-y-4"
          >
            {state.status !== 'idle' ? (
              <Alert
                className={
                  state.status === 'error'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }
              >
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <form action={formAction} className="bg-surface-container-low space-y-4 rounded-[1.2rem] p-4">
              <input type="hidden" name="intent" value="resend-invitation" />
              <input type="hidden" name="employeeId" value={user.id} />
              <div className="flex items-center gap-2">
                <Mail className="text-muted-foreground size-4" />
                <p className="font-medium">Kirim Ulang Invitation</p>
              </div>
              <p className="text-muted-foreground text-sm">
                Kirim ulang email aktivasi akun untuk pengguna ini ke <span className="font-medium">{user.email}</span>.
              </p>
              <div className="flex justify-end">
                <SubmitButton variant="outline">
                  <Mail className="mr-2 size-4" />
                  Kirim Ulang Invitation
                </SubmitButton>
              </div>
            </form>

            <div className="bg-surface-container-low text-muted-foreground rounded-[1.2rem] p-4 text-sm">
              Reset password tersedia di bagian profil pengguna.
            </div>
          </TabsContent>
          <TabsContent
            value="danger"
            className="text-destructive rounded-[1.2rem] bg-[#fef2f2] p-4 text-sm"
          >
            Nonaktifkan dan hapus pengguna tersedia di bagian profil pengguna.
          </TabsContent>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
