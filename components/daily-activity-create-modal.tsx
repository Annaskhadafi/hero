'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  ListFilter,
  Search,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { createDailyActivitySessionAction } from '@/app/dashboard/activity-hub/actions'
import { cn } from '@/lib/utils'

export type ModalEmployee = {
  id: number
  name: string
  employeeId?: string | null
  email?: string | null
  jobTitle?: string | null
  department?: string | null
  section?: string | null
  siteId?: number | null
  directManagerId?: number | null
  sectionId?: number | null
  departmentId?: number | null
}

export type ModalSite = {
  id: number
  name: string
  location?: string | null
}

export type ModalPreset = {
  id: number
  code: string
  name: string
  basePoints: number
}

interface DailyActivityCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: ModalEmployee[]
  sites: ModalSite[]
  activityPresets?: ModalPreset[]
  sectionHeadMap?: Record<string, number | null>
  deptHeadMap?: Record<string, number | null>
  defaultEmployeeId?: number | string
  onSuccess?: (sessionId: number) => void
}

export function DailyActivityCreateModal({
  open,
  onOpenChange,
  employees,
  sites,
  activityPresets = [],
  sectionHeadMap = {},
  deptHeadMap = {},
  defaultEmployeeId,
  onSuccess,
}: DailyActivityCreateModalProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  // Team logging state
  const [isTeamLog, setIsTeamLog] = useState(false)
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<number[]>([])
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('')
  const [teamMemberPickerOpen, setTeamMemberPickerOpen] = useState(false)

  // Kamus Aktivitas modal & tree picker
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [expandedPickerGroups, setExpandedPickerGroups] = useState<Set<string>>(
    new Set(['Group: Support Customer', 'Group: Running Tire Inspection & Pressure Check'])
  )

  const [createForm, setCreateForm] = useState<{
    employeeId: string
    employeeName: string
    employeeSn: string
    jobTitle: string
    department: string
    section: string
    workDate: string
    shiftCode: string
    siteId: string
    siteName: string
    customerName: string
    leaderEmployeeId: string
    leaderName: string
    superiorEmployeeId: string
    superiorName: string
    managerEmployeeId: string
    managerName: string
    sourceMode: 'self_input' | 'assigned' | 'custom'
    assignmentId?: string
    customName?: string
    customDescription?: string
    customUnit?: string
    items: Array<{
      label: string
      unitNumber?: string
      duration?: string
      points?: number
      remark?: string
      startTime?: string
      endTime?: string
    }>
  }>({
    employeeId: '',
    employeeName: '',
    employeeSn: '',
    jobTitle: '',
    department: '',
    section: '',
    workDate: new Date().toISOString().split('T')[0],
    shiftCode: 'ALL',
    siteId: '',
    siteName: '',
    customerName: '',
    leaderEmployeeId: '',
    leaderName: '',
    superiorEmployeeId: '',
    superiorName: '',
    managerEmployeeId: '',
    managerName: '',
    sourceMode: 'self_input',
    items: [],
  })

  // Initialize form when opened
  useEffect(() => {
    if (open) {
      const targetEmpId = defaultEmployeeId ? String(defaultEmployeeId) : createForm.employeeId || (employees[0] ? String(employees[0].id) : '')
      const emp = employees.find((e) => String(e.id) === targetEmpId)
      if (emp) {
        const site = sites.find((s) => s.id === emp.siteId)
        const defLeader = emp.directManagerId ? employees.find((e) => e.id === emp.directManagerId) : null
        const defSectionHeadId = emp.sectionId ? sectionHeadMap[String(emp.sectionId)] : null
        const defSectionHead = defSectionHeadId ? employees.find((e) => e.id === defSectionHeadId) : null
        const defManagerId = emp.departmentId ? deptHeadMap[String(emp.departmentId)] : null
        const defManager = defManagerId ? employees.find((e) => e.id === defManagerId) : null

        setCreateForm((p) => ({
          ...p,
          employeeId: String(emp.id),
          employeeName: emp.name,
          employeeSn: emp.employeeId || '',
          jobTitle: emp.jobTitle || 'Serviceman',
          department: emp.department || 'Central Services',
          section: emp.section || 'Service Operation MVC',
          siteId: emp.siteId ? String(emp.siteId) : sites[0] ? String(sites[0].id) : '',
          siteName: site?.name || sites[0]?.name || 'Balikpapan',
          leaderEmployeeId: defLeader ? String(defLeader.id) : '',
          leaderName: defLeader?.name || '',
          superiorEmployeeId: defSectionHead ? String(defSectionHead.id) : '',
          superiorName: defSectionHead?.name || '',
          managerEmployeeId: defManager ? String(defManager.id) : '',
          managerName: defManager?.name || '',
        }))
        setSelectedTeamMemberIds([])
      }
    }
  }, [open, defaultEmployeeId, employees, sites, sectionHeadMap, deptHeadMap])

  const employeeOptions = useMemo(() => {
    return employees.map((e) => ({
      value: String(e.id),
      label: `${e.name} ${e.employeeId ? `(${e.employeeId})` : ''} - ${e.jobTitle || e.department || 'Staff'}`,
    }))
  }, [employees])

  const filteredModalEmployees = useMemo(() => {
    let list = employees.filter((e) => String(e.id) !== createForm.employeeId)
    if (createForm.siteId) {
      list = list.filter((e) => !e.siteId || String(e.siteId) === createForm.siteId)
    }
    if (!teamMemberSearchQuery) return list
    const q = teamMemberSearchQuery.toLowerCase()
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.jobTitle && e.jobTitle.toLowerCase().includes(q))
    )
  }, [employees, createForm.employeeId, createForm.siteId, teamMemberSearchQuery])

  const addPresetActivity = (label: string, points = 10) => {
    setCreateForm((p) => {
      const exists = p.items.some((i) => i.label === label)
      if (exists) return p
      return {
        ...p,
        items: [
          ...p.items,
          {
            label,
            points,
            duration: '60m',
            unitNumber: '',
            remark: '',
            startTime: '08:00',
            endTime: '09:00',
          },
        ],
      }
    })
  }

  const updateItemRow = (idx: number, field: string, val: any) => {
    setCreateForm((p) => {
      const next = [...p.items]
      if (next[idx]) {
        next[idx] = { ...next[idx], [field]: val }
      }
      return { ...p, items: next }
    })
  }

  const removeItemRow = (idx: number) => {
    setCreateForm((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== idx),
    }))
  }

async function withActionRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      const errStr = String(err?.message || err?.cause?.message || err || "").toLowerCase()
      const isNetworkError =
        errStr.includes("network error") ||
        errStr.includes("failed to fetch") ||
        errStr.includes("econnreset") ||
        errStr.includes("network")
      if (attempt <= retries && isNetworkError) {
        console.warn(`[DailyActivityCreateModal] Network glitch detected (attempt ${attempt}/${retries}). Retrying...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
        continue
      }
      throw err
    }
  }
}

  const handleCreateSession = async () => {
    if (!createForm.employeeId) {
      toast.error('Pilih karyawan terlebih dahulu')
      return
    }
    const validItems = createForm.items.filter((it) => it.label.trim().length > 0)
    if (validItems.length === 0) {
      toast.error('Tambahkan minimal 1 item aktivitas')
      return
    }
    setIsCreating(true)
    try {
      const res = await withActionRetry(() =>
        createDailyActivitySessionAction({
          employeeId: Number(createForm.employeeId),
          workDate: createForm.workDate,
          shiftCode: createForm.shiftCode,
          siteId: createForm.siteId ? Number(createForm.siteId) : undefined,
          leaderEmployeeId: createForm.leaderEmployeeId ? Number(createForm.leaderEmployeeId) : undefined,
          leaderName: createForm.leaderName || undefined,
          superiorEmployeeId: createForm.superiorEmployeeId ? Number(createForm.superiorEmployeeId) : undefined,
          superiorName: createForm.superiorName || undefined,
          managerEmployeeId: createForm.managerEmployeeId ? Number(createForm.managerEmployeeId) : undefined,
          managerName: createForm.managerName || undefined,
          teamMemberEmployeeIds: isTeamLog ? selectedTeamMemberIds : [],
          items: validItems,
        })
      )
      if (res.success && res.sessionId) {
        toast.success('Sesi Daily Activity berhasil disimpan!')
        setCreateForm({
          employeeId: '',
          employeeName: '',
          employeeSn: '',
          jobTitle: '',
          department: '',
          section: '',
          workDate: new Date().toISOString().split('T')[0],
          shiftCode: 'ALL',
          siteId: '',
          siteName: '',
          customerName: '',
          leaderEmployeeId: '',
          leaderName: '',
          superiorEmployeeId: '',
          superiorName: '',
          managerEmployeeId: '',
          managerName: '',
          sourceMode: 'self_input',
          items: [],
        })
        setIsTeamLog(false)
        setSelectedTeamMemberIds([])
        setTeamMemberSearchQuery('')
        onOpenChange(false)
        if (onSuccess) onSuccess(res.sessionId)
        router.refresh()
      } else {
        toast.error((res as any).error || 'Gagal membuat sesi aktivitas')
      }
    } catch (err: any) {
      const errStr = String(err?.message || err || '').toLowerCase()
      if (errStr.includes('network') || errStr.includes('fetch')) {
        toast.error('Koneksi terputus sementara ke server dev. Silakan coba klik Simpan lagi.')
      } else {
        toast.error(err.message || 'Terjadi kesalahan saat membuat sesi aktivitas')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200 shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs">F.HC.DAR</span>
                  Tambah Dokumen Daily Activity Report
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Form evaluasi aktivitas harian teknisi & pengajuan approval berjenjang sesuai dokumen resmi.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* 1. Details & Employee Profile */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-teal-600"></span>
                  1. Details & Employee Profile
                </span>
                <span className="text-[11px] font-mono text-slate-400">Section Profile</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Pilih Karyawan *</Label>
                  <SearchableSelect
                    label="Karyawan"
                    placeholder="PILIH KARYAWAN..."
                    value={createForm.employeeId}
                    onValueChange={(val) => {
                      const emp = employees.find((e) => String(e.id) === val)
                      if (emp) {
                        const site = sites.find((s) => s.id === emp.siteId)
                        const defLeader = emp.directManagerId ? employees.find((e) => e.id === emp.directManagerId) : null
                        const defSectionHeadId = emp.sectionId ? sectionHeadMap[String(emp.sectionId)] : null
                        const defSectionHead = defSectionHeadId ? employees.find((e) => e.id === defSectionHeadId) : null
                        const defManagerId = emp.departmentId ? deptHeadMap[String(emp.departmentId)] : null
                        const defManager = defManagerId ? employees.find((e) => e.id === defManagerId) : null

                        setCreateForm((p) => ({
                          ...p,
                          employeeId: val,
                          employeeName: emp.name,
                          employeeSn: emp.employeeId || '',
                          jobTitle: emp.jobTitle || '',
                          department: emp.department || '',
                          section: emp.section || '',
                          siteId: emp.siteId ? String(emp.siteId) : p.siteId,
                          siteName: site?.name || p.siteName,
                          leaderEmployeeId: defLeader ? String(defLeader.id) : p.leaderEmployeeId,
                          leaderName: defLeader?.name || p.leaderName,
                          superiorEmployeeId: defSectionHead ? String(defSectionHead.id) : p.superiorEmployeeId,
                          superiorName: defSectionHead?.name || p.superiorName,
                          managerEmployeeId: defManager ? String(defManager.id) : p.managerEmployeeId,
                          managerName: defManager?.name || p.managerName,
                        }))
                      }
                    }}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tanggal Kerja (Work Date) *</Label>
                  <Input
                    type="date"
                    value={createForm.workDate}
                    onChange={(e) => setCreateForm((p) => ({ ...p, workDate: e.target.value }))}
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Shift Kerja</Label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold"
                    value={createForm.shiftCode}
                    onChange={(e) => setCreateForm((p) => ({ ...p, shiftCode: e.target.value }))}
                  >
                    <option value="ALL">ALL (Semua Shift)</option>
                    <option value="Shift 1">Shift 1</option>
                    <option value="Shift 2">Shift 2</option>
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Site / Lokasi</Label>
                  <select
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold"
                    value={createForm.siteId}
                    onChange={(e) => {
                      const st = sites.find((s) => String(s.id) === e.target.value)
                      setCreateForm((p) => ({ ...p, siteId: e.target.value, siteName: st?.name || p.siteName }))
                    }}
                  >
                    <option value="">Pilih Site / Lokasi...</option>
                    {sites.map((st) => (
                      <option key={st.id} value={String(st.id)}>
                        {st.name} ({st.location || 'SITE'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Job Title / Posisi</Label>
                  <Input
                    value={createForm.jobTitle}
                    onChange={(e) => setCreateForm((p) => ({ ...p, jobTitle: e.target.value }))}
                    placeholder="Contoh: Tyre Technician"
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Departemen & Seksi</Label>
                  <Input
                    value={createForm.section ? `${createForm.department} / ${createForm.section}` : createForm.department}
                    onChange={(e) => setCreateForm((p) => ({ ...p, department: e.target.value }))}
                    placeholder="Dept / Section"
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Customer / Partner</Label>
                  <Input
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, customerName: e.target.value }))}
                    placeholder="Nama Customer (Opsional)"
                    className="bg-white border-slate-200 h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 1.1 Team Logging / Input Sekaligus untuk Tim */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-teal-700" />
                  <div>
                    <span className="font-bold text-slate-800 text-xs">Team Logging (Input Sekaligus untuk Tim)</span>
                    <p className="text-[10px] text-slate-500">Pilih rekan kerja untuk dimasukkan ke dokumen aktivitas ini</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                  <span>Input untuk Tim</span>
                  <input
                    type="checkbox"
                    checked={isTeamLog}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setIsTeamLog(checked)
                      if (!checked && createForm.employeeId) {
                        setSelectedTeamMemberIds([Number(createForm.employeeId)])
                      }
                    }}
                    className="size-4 accent-teal-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {isTeamLog ? (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <Popover open={teamMemberPickerOpen} onOpenChange={setTeamMemberPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between rounded-xl bg-white text-xs font-semibold text-slate-800 h-9 border-slate-200"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="size-3.5 text-teal-600" />
                          {selectedTeamMemberIds.length > 0
                            ? `${selectedTeamMemberIds.length} Anggota Tim Dipilih`
                            : 'Pilih Anggota Tim...'}
                        </span>
                        <ChevronDown className="size-4 text-slate-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3 space-y-2 bg-white shadow-xl rounded-xl" align="start">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                        <Input
                          placeholder="Cari nama atau NIK..."
                          value={teamMemberSearchQuery}
                          onChange={(e) => setTeamMemberSearchQuery(e.target.value)}
                          className="h-8 pl-8 text-xs bg-white"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                        {filteredModalEmployees.map((emp) => {
                          const isSelected = selectedTeamMemberIds.includes(emp.id)
                          const isPrimary = String(emp.id) === createForm.employeeId
                          return (
                            <div
                              key={emp.id}
                              onClick={() => {
                                if (isPrimary) return
                                setSelectedTeamMemberIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                                )
                              }}
                              className={cn(
                                'flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors',
                                isSelected ? 'bg-teal-50 text-teal-900 font-semibold' : 'hover:bg-slate-100',
                                isPrimary && 'opacity-80'
                              )}
                            >
                              <div className="space-y-0.5">
                                <p className="font-medium text-slate-800">
                                  {emp.name} {isPrimary ? '(Pembuat/Primary)' : ''}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {emp.employeeId || '-'} • {emp.jobTitle || emp.department || 'Staff'}
                                </p>
                              </div>
                              {isSelected ? <Check className="size-4 text-teal-600" /> : null}
                            </div>
                          )
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {selectedTeamMemberIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {employees
                        .filter((e) => selectedTeamMemberIds.includes(e.id))
                        .map((e) => (
                          <Badge
                            key={e.id}
                            variant="secondary"
                            className="text-[11px] font-medium py-1 px-2.5 flex items-center gap-1.5 bg-teal-50 text-teal-900 border border-teal-200"
                          >
                            <span>{e.name}</span>
                            {String(e.id) !== createForm.employeeId ? (
                              <X
                                className="size-3 cursor-pointer hover:text-red-600"
                                onClick={() => setSelectedTeamMemberIds((prev) => prev.filter((id) => id !== e.id))}
                              />
                            ) : null}
                          </Badge>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* 1.5. SOURCE MODE SELECTION */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Source Mode *</Label>
              <select
                value={createForm.sourceMode || 'self_input'}
                onChange={(e) => setCreateForm((p) => ({ ...p, sourceMode: e.target.value as 'self_input' | 'assigned' | 'custom' }))}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="self_input">Self-input activity</option>
                <option value="assigned">Assigned activity</option>
                <option value="custom">Custom activity</option>
              </select>
            </div>

            {/* CONDITIONAL RENDER: ASSIGNED ACTIVITY MODE */}
            {createForm.sourceMode === 'assigned' && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Assigned Activity (Assignment Penugasan)</span>
                  <Badge className="bg-blue-600 text-white border-0 text-[10px]">Tugas Resmi</Badge>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">ASSIGNMENT *</Label>
                  <select
                    value={createForm.assignmentId || ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, assignmentId: e.target.value }))}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih assignment</option>
                    <option value="1">ASG-001 • Perbaikan Tire Unit HD-785 (Andana Gustafianto)</option>
                    <option value="2">ASG-002 • Mounting OTR Wheel Workshop Site Pekanbaru (Rizal Mahendra)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">Pilih assignment yang sedang dikerjakan.</p>
                </div>

                <div className="rounded-lg border border-blue-100 bg-white p-3 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Camera className="size-3.5 text-slate-500" /> Photo Evidence
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 py-2 text-xs font-semibold text-blue-800 transition-colors">
                      <Camera className="size-3.5 text-blue-700" /> Kamera
                      <input type="file" accept="image/*" capture="environment" className="hidden" />
                    </label>
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 py-2 text-xs font-semibold text-blue-800 transition-colors">
                      <ImagePlus className="size-3.5 text-blue-700" /> Galeri
                      <input type="file" accept="image/*" className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Start Time</Label>
                    <Input
                      type="time"
                      defaultValue="08:00"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">End Time</Label>
                    <Input
                      type="time"
                      defaultValue="17:00"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Equipment / Unit No.</Label>
                    <Input
                      placeholder="Contoh: DT-451 / BAY-03"
                      className="bg-white border-slate-200 h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Material Used</Label>
                    <Input
                      placeholder="Material / tools dipakai"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Notes / Hasil Kerja</Label>
                  <Textarea
                    placeholder="Ringkas pekerjaan, hasil, kendala, bukti penting."
                    className="bg-white border-slate-200 text-xs"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* CONDITIONAL RENDER: CUSTOM ACTIVITY MODE */}
            {createForm.sourceMode === 'custom' && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Custom Activity (Aktivitas Mandiri)</span>
                  <Badge className="bg-sky-600 text-white border-0 text-xs">Custom Mode</Badge>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Custom Activity *</Label>
                  <Input
                    placeholder="Custom activity name"
                    value={createForm.customName || ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, customName: e.target.value }))}
                    className="bg-white border-slate-200 h-9 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div className="rounded-lg border border-sky-100 bg-white p-3 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Camera className="size-3.5 text-slate-500" /> Photo Evidence
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 py-2 text-xs font-semibold text-sky-800 transition-colors">
                      <Camera className="size-3.5 text-sky-700" /> Kamera
                      <input type="file" accept="image/*" capture="environment" className="hidden" />
                    </label>
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 py-2 text-xs font-semibold text-sky-800 transition-colors">
                      <ImagePlus className="size-3.5 text-sky-700" /> Galeri
                      <input type="file" accept="image/*" className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Description</Label>
                  <Textarea
                    placeholder="Jelaskan aktivitas custom."
                    value={createForm.customDescription || ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, customDescription: e.target.value }))}
                    className="bg-white border-slate-200 text-xs"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Start Time</Label>
                    <Input
                      type="time"
                      defaultValue="08:00"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">End Time</Label>
                    <Input
                      type="time"
                      defaultValue="17:00"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Equipment / Unit No.</Label>
                    <Input
                      placeholder="Contoh: DT-451 / BAY-03"
                      value={createForm.customUnit || ''}
                      onChange={(e) => setCreateForm((p) => ({ ...p, customUnit: e.target.value }))}
                      className="bg-white border-slate-200 h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Material Used</Label>
                    <Input
                      placeholder="Material / tools dipakai"
                      className="bg-white border-slate-200 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Notes / Hasil Kerja</Label>
                  <Textarea
                    placeholder="Ringkas pekerjaan, hasil, kendala, bukti penting."
                    className="bg-white border-slate-200 text-xs"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* CONDITIONAL RENDER: SELF INPUT ACTIVITY MODE */}
            {(!createForm.sourceMode || createForm.sourceMode === 'self_input') && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Library Activity & Group Kamus Aktivitas</span>
                    <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {(createForm.items || []).filter((i) => i?.label?.trim()).length} DIPILIH
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => setIsPickerModalOpen(true)}
                      className="h-9 text-xs font-bold gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs px-4"
                    >
                      <ListFilter className="size-4 text-white" /> Buka Kamus Aktivitas (Route Group Tree)
                    </Button>
                  </div>
                </div>

                {/* SELECTED LIBRARY CHECKLIST CARDS */}
                {(createForm.items || []).filter((i) => i?.label?.trim()).length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">SELECTED LIBRARY CHECKLIST</span>
                        <h5 className="text-xs font-bold text-slate-800">
                          {(createForm.items || []).filter((i) => i?.label?.trim()).length} activity siap diisi
                        </h5>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {createForm.items
                        .filter((i) => i?.label?.trim())
                        .map((item, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5 relative">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-bold font-mono text-slate-500">
                                  #{idx + 1} • {item.label.split(' - ')[0] || 'SVC'}
                                </p>
                                <h6 className="text-xs font-bold text-slate-800">{item.label.split(' - ')[1] || item.label}</h6>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                className="size-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition-colors text-xs font-bold"
                                title="Hapus activity"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-700">Equipment / Unit No.</Label>
                                <Input
                                  placeholder="Unit / equipment number"
                                  value={item.unitNumber || ''}
                                  onChange={(e) => updateItemRow(idx, 'unitNumber', e.target.value)}
                                  className="h-8 text-xs bg-white border-slate-200 font-mono"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-700">Mulai</Label>
                                  <Input
                                    type="time"
                                    value={(item as any).startTime || '08:00'}
                                    onChange={(e) => updateItemRow(idx, 'startTime', e.target.value)}
                                    className="h-8 text-xs bg-white border-slate-200 text-center"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-700">Selesai</Label>
                                  <Input
                                    type="time"
                                    value={(item as any).endTime || '08:30'}
                                    onChange={(e) => updateItemRow(idx, 'endTime', e.target.value)}
                                    className="h-8 text-xs bg-white border-slate-200 text-center"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-1">
                              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Camera className="size-3.5 text-slate-500" /> Photo Evidence
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors">
                                  <Camera className="size-3.5 text-slate-600" /> Kamera
                                  <input type="file" accept="image/*" capture="environment" className="hidden" />
                                </label>
                                <label className="cursor-pointer inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors">
                                  <ImagePlus className="size-3.5 text-slate-600" /> Galeri
                                  <input type="file" accept="image/*" className="hidden" />
                                </label>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">Catatan Item</Label>
                              <Input
                                placeholder="Hasil kerja, temuan, atau catatan singkat."
                                value={item.remark || ''}
                                onChange={(e) => updateItemRow(idx, 'remark', e.target.value)}
                                className="h-8 text-xs bg-white border-slate-200"
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Signatories & Verification Matrix (Approval) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-700"></span>
                  R. Signatories & Verification Matrix (Penandatangan Approval)
                </span>
                <span className="text-[11px] font-mono text-slate-400">2-Tier Verification (Leader & Section Head)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Leader / Supervisor</Label>
                  <SearchableSelect
                    label="Leader"
                    placeholder="PILIH LEADER..."
                    value={createForm.leaderEmployeeId}
                    onValueChange={(val) => {
                      const emp = employees.find((e) => String(e.id) === val)
                      setCreateForm((p) => ({
                        ...p,
                        leaderEmployeeId: val,
                        leaderName: emp?.name || '',
                      }))
                    }}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                  <p className="text-[10px] text-slate-400">Verifikasi tahap 1 (Leader Lapangan / PJO)</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Section Head</Label>
                  <SearchableSelect
                    label="Section Head"
                    placeholder="PILIH SECTION HEAD..."
                    value={createForm.superiorEmployeeId}
                    onValueChange={(val) => {
                      const emp = employees.find((e) => String(e.id) === val)
                      setCreateForm((p) => ({
                        ...p,
                        superiorEmployeeId: val,
                        superiorName: emp?.name || '',
                      }))
                    }}
                    options={employeeOptions}
                    widthClassName="w-full"
                  />
                  <p className="text-[10px] text-slate-400">Verifikasi tahap 2 (Kepala Seksi)</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between sm:justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={isCreating}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6"
            >
              {isCreating ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DIALOG: PILIH KAMUS AKTIVITAS */}
      <Dialog open={isPickerModalOpen} onOpenChange={setIsPickerModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-white">Pilih Kamus Aktivitas</DialogTitle>
              <p className="text-xs text-slate-300 mt-0.5">Pilih aktivitas berdasarkan route group & kategori pekerjaan</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPickerModalOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded-lg bg-slate-100 px-3.5 py-2 flex items-center gap-2 border border-slate-200">
              <Search className="size-4 text-slate-500" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Cari kode atau nama activity..."
                className="w-full bg-transparent text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200">
              <span>Library aktif</span>
              <span>{(createForm.items || []).filter((i) => i?.label?.trim()).length} dipilih</span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {[
                {
                  groupName: 'Group: Support Customer',
                  subtitle: 'GRP-Support Customer • ALL',
                  items: [
                    { code: 'SVC.STB-001', name: 'Support Operator', points: 10, badges: ['FOTO WAJIB', '10 PTS'] },
                    { code: 'SVC.STB-002', name: 'Support Technical Liaison', points: 10, badges: ['EQUIPMENT WAJIB'] },
                  ],
                },
                {
                  groupName: 'Group: Running Tire Inspection & Pressure Check',
                  subtitle: 'GRP-Tire Inspection • ALL',
                  items: [
                    { code: 'SVC.STB-003', name: 'Inspection & Pressure Check', points: 10, badges: ['EQUIPMENT WAJIB', 'WAKTU WAJIB'] },
                    { code: 'SVC.STB-004', name: 'Running Tire Depth Measurement', points: 10, badges: ['FOTO WAJIB'] },
                  ],
                },
                {
                  groupName: 'Group: Rotasi Tire EM',
                  subtitle: 'GRP-Rotasi Tire EM • Earthmover',
                  items: [
                    { code: 'SVC.STB-005', name: 'Rotasi Tire EM Position 1 & 2', points: 15, badges: ['EQUIPMENT WAJIB', 'WAKTU WAJIB'] },
                    { code: 'SVC.STB-006', name: 'Rotasi Tire EM Position 3 & 4', points: 15, badges: ['EQUIPMENT WAJIB'] },
                  ],
                },
                {
                  groupName: 'Group: Replace Tire TB',
                  subtitle: 'GRP-Replace Tire TB • Truck & Bus',
                  items: [
                    { code: 'SVC.STB-007', name: 'Mounting Truck & Bus Tyre', points: 15, badges: ['EQUIPMENT WAJIB', 'WAKTU WAJIB'] },
                    { code: 'SVC.STB-008', name: 'Dismounting Truck Tyre', points: 15, badges: ['EQUIPMENT WAJIB'] },
                  ],
                },
                {
                  groupName: 'Group: Rotasi Tire TB',
                  subtitle: 'GRP-Rotasi Tire TB • Truck & Bus',
                  items: [
                    { code: 'SVC.STB-009', name: 'Rotasi Tire Truck & Bus', points: 15, badges: ['EQUIPMENT WAJIB'] },
                  ],
                },
                {
                  groupName: 'Group: Replace Tire',
                  subtitle: 'GRP-Replace Tire • General',
                  items: [
                    { code: 'SVC.STB-010', name: 'Replacement Tyre OTR HD-785', points: 20, badges: ['EQUIPMENT WAJIB', 'FOTO WAJIB'] },
                  ],
                },
                {
                  groupName: 'Group: Rotasi Tire',
                  subtitle: 'GRP-General Safety & Housekeeping',
                  items: [
                    { code: 'HSE.P5M-001', name: 'P5M & Briefing Keselamatan', points: 5, badges: ['WAKTU WAJIB'] },
                    { code: 'HSE.P2H-001', name: 'P2H & Inspection Alat Kerja', points: 5, badges: ['EQUIPMENT WAJIB'] },
                  ],
                },
              ].map((group, gIdx) => {
                const isExpanded = expandedPickerGroups.has(group.groupName) || Boolean(pickerSearch)
                return (
                  <div key={gIdx} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedPickerGroups((prev) => {
                          const next = new Set(prev)
                          if (next.has(group.groupName)) next.delete(group.groupName)
                          else next.add(group.groupName)
                          return next
                        })
                      }}
                      className="w-full flex items-center justify-between bg-slate-50 px-3.5 py-2.5 text-left font-bold text-slate-800 text-xs hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className={`size-4 transition-transform text-slate-500 ${isExpanded ? 'rotate-90' : ''}`} />
                        <span>{group.groupName}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {group.items.length} Activity
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="p-2 space-y-1.5 bg-white">
                        {group.items.map((sub, sIdx) => {
                          const isSelected = (createForm.items || []).some(
                            (i) => i?.label?.includes(sub.code) || i?.label?.includes(sub.name)
                          )
                          return (
                            <div
                              key={sIdx}
                              onClick={() => {
                                if (isSelected) {
                                  const idxToRemove = (createForm.items || []).findIndex(
                                    (i) => i?.label?.includes(sub.code) || i?.label?.includes(sub.name)
                                  )
                                  if (idxToRemove >= 0) removeItemRow(idxToRemove)
                                } else {
                                  addPresetActivity(`${sub.code} - ${sub.name}`, sub.points)
                                }
                              }}
                              className={`flex items-start justify-between rounded-lg p-2.5 cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                  : 'bg-slate-50/50 text-slate-800 border-slate-200 hover:bg-slate-100/60'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold font-mono">{sub.code}</p>
                                <p className="text-xs font-semibold">{sub.name}</p>
                                <p className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {sub.points} pts • max 12 pts / hari
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {sub.badges.map((b, bIdx) => (
                                    <span
                                      key={bIdx}
                                      className={`rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wider uppercase ${
                                        isSelected
                                          ? 'bg-white/15 text-white'
                                          : 'bg-slate-200/80 text-slate-700'
                                      }`}
                                    >
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div
                                className={`size-5 flex items-center justify-center rounded text-xs font-bold ${
                                  isSelected ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {isSelected ? <Check className="size-3.5 stroke-[3]" /> : '+'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <Button
              type="button"
              onClick={() => setIsPickerModalOpen(false)}
              className="h-10 w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs mt-2"
            >
              PAKAI {(createForm.items || []).filter((i) => i?.label?.trim()).length} ACTIVITY
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
