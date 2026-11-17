'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Truck,
  Wrench,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  Square,
} from 'lucide-react'
import { toast } from 'sonner'
import { HeroInput, HeroTextarea } from '@/components/templates'
import { createSplFromDailyActivityAction } from '@/app/dashboard/daily-activity/actions'
import {
  type EmployeeActivityRow,
  type ActivityTaskItem,
  normalizeDateToYmdString,
} from '@/lib/daily-activity-dashboard'
import { cn } from '@/lib/utils'

export interface DailyActivityCreateSplModalProps {
  isOpen: boolean
  onClose: () => void
  employee?: EmployeeActivityRow | null
  onSuccess?: (splNumber: string, splId: number) => void
  splModuleBasePath?: string
}

interface EditableSplTaskItem {
  id: string
  sessionItemId?: number
  label: string
  unitNumber: string
  startedAt: string
  endedAt: string
  points: number
  remarks: string
  photoUrl?: string | null
  photos?: string[]
  selected: boolean
}

function parseTimeToMinutes(t?: string | null): number | null {
  if (!t || t === '-') return null
  const [hhStr, mmStr = '0'] = t.split(':')
  const hh = parseInt(hhStr, 10)
  const mm = parseInt(mmStr, 10)
  if (isNaN(hh) || isNaN(mm)) return null
  return hh * 60 + mm
}

function minutesToTimeString(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440
  const hh = Math.floor(norm / 60)
  const mm = norm % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/**
 * Intelligent overtime extraction from an EmployeeActivityRow
 */
function extractOvertimeInfo(employee: EmployeeActivityRow | null | undefined) {
  if (!employee) {
    return {
      workDateYmd: new Date().toISOString().split('T')[0],
      startTime: '17:00',
      endTime: '21:00',
      initialTasks: [] as EditableSplTaskItem[],
      title: 'Penugasan Lembur Operasional',
      requestNotes: '',
      isOffDay: false,
    }
  }

  const tasks = employee.tasks || []
  const isOff = Boolean(employee.isRosterOff)

  // Parse YYYY-MM-DD from rawWorkDate or workDate with site timezone preservation
  let workDateYmd = normalizeDateToYmdString(employee.rawWorkDate || employee.workDate)
  if (!workDateYmd || workDateYmd === 'nodate') {
    workDateYmd = normalizeDateToYmdString(new Date())
  }

  // Filter overtime tasks (after 16:30 for day shift, after 04:30 for night shift, or all on off day)
  const overtimeTasks = tasks.filter((t) => {
    if (isOff) return true
    if (!t.startedAt || t.startedAt === '-') return false
    const totalMinutes = parseTimeToMinutes(t.startedAt)
    if (totalMinutes === null) return false
    if (employee.shift === 'Malam') {
      return totalMinutes >= 270 && totalMinutes <= 720
    }
    return totalMinutes >= 990 // 16:30 onwards
  })

  // Selected tasks pool: prefer explicit overtime tasks, else fallback to all daily tasks
  const candidateTasks = overtimeTasks.length > 0 ? overtimeTasks : tasks

  let startTime = employee.shift === 'Malam' ? '05:00' : '17:00'
  let endTime = employee.shift === 'Malam' ? '09:00' : '21:00'

  if (candidateTasks.length > 0) {
    // Robust cross-midnight timeline determination
    let minTimelineStart = Infinity
    let maxTimelineEnd = -Infinity
    let hasCrossMidnight = false

    for (const t of candidateTasks) {
      const sMin = parseTimeToMinutes(t.startedAt)
      const eMin = parseTimeToMinutes(t.endedAt)
      if (sMin !== null) {
        let effectiveEnd = eMin
        if (effectiveEnd !== null && effectiveEnd < sMin) {
          effectiveEnd += 1440
          hasCrossMidnight = true
        }
        if (sMin < minTimelineStart) minTimelineStart = sMin
        if (effectiveEnd !== null && effectiveEnd > maxTimelineEnd) {
          maxTimelineEnd = effectiveEnd
        }
      }
    }

    if (minTimelineStart !== Infinity) {
      startTime = minutesToTimeString(minTimelineStart)
    }

    if (maxTimelineEnd !== -Infinity && maxTimelineEnd > minTimelineStart) {
      endTime = minutesToTimeString(maxTimelineEnd)
    } else if (minTimelineStart !== Infinity) {
      // If equal start and end time or missing end time, guarantee minimum 1-hour overtime window
      endTime = minutesToTimeString(minTimelineStart + 60)
    } else {
      const starts = candidateTasks
        .map((t) => t.startedAt)
        .filter((s): s is string => Boolean(s && s !== '-'))
        .sort()
      const ends = candidateTasks
        .map((t) => t.endedAt)
        .filter((e): e is string => Boolean(e && e !== '-'))
        .sort()
        .reverse()

      if (starts.length > 0) startTime = starts[0]
      if (ends.length > 0) endTime = ends[0]
    }
  } else if (employee.checkOutTime && employee.checkOutTime !== '-') {
    const coM = parseTimeToMinutes(employee.checkOutTime)
    if (coM !== null && coM > 1020) {
      endTime = employee.checkOutTime
    }
  }

  // Safety guard against identical start and end time
  if (startTime === endTime) {
    const sMin = parseTimeToMinutes(startTime) ?? (employee.shift === 'Malam' ? 300 : 1020)
    endTime = minutesToTimeString(sMin + 60)
  }

  // Build Editable Task Items
  let initialTasks: EditableSplTaskItem[] = candidateTasks.map((t, idx) => ({
    id: `task-${t.id || idx}-${Date.now()}`,
    sessionItemId: typeof t.id === 'number' ? t.id : undefined,
    label: t.label || employee.primaryActivity || 'Pekerjaan Lembur Operasional',
    unitNumber: t.unitNumber || (employee.allUnits && employee.allUnits[0]) || employee.unitTireId || '-',
    startedAt: t.startedAt && t.startedAt !== '-' ? t.startedAt : startTime,
    endedAt: t.endedAt && t.endedAt !== '-' ? t.endedAt : endTime,
    points: t.points || 10,
    remarks: t.remarks || '',
    photoUrl: t.photoUrl || (t.photos && t.photos[0]) || null,
    photos: t.photos || [],
    selected: true,
  }))

  if (initialTasks.length === 0) {
    initialTasks = [
      {
        id: `default-${Date.now()}`,
        label: employee.primaryActivity || 'Pekerjaan Lembur Operasional',
        unitNumber: (employee.allUnits && employee.allUnits[0]) || employee.unitTireId || '-',
        startedAt: startTime,
        endedAt: endTime,
        points: 10,
        remarks: 'Pekerjaan lembur operasional lapangan berdasarkan Daily Activity Report.',
        selected: true,
      },
    ]
  }

  // Pre-filled Title
  const unitSummary = employee.allUnits && employee.allUnits.length > 0
    ? employee.allUnits.slice(0, 2).join(', ')
    : (employee.unitTireId || employee.primaryActivity || 'Operasional')
  const title = `Penugasan Lembur - ${employee.name} (${unitSummary})`

  // Pre-filled Notes
  const shiftLabel = employee.isRosterOff
    ? 'Hari Libur / OFF'
    : `Shift ${employee.shift} (Lembur Lapangan)`
  const taskDescriptions = initialTasks
    .map((t, i) => `• [Unit ${t.unitNumber}] ${t.label}${t.remarks ? ` - ${t.remarks}` : ''}`)
    .join('\n')

  const requestNotes = `Pengajuan Surat Perintah Lembur (SPL) terintegrasi dari Daily Activity Report tanggal ${workDateYmd}.
Kondisi Operasional: ${shiftLabel}.
Rincian pekerjaan yang dilaksanakan:
${taskDescriptions}`

  return {
    workDateYmd,
    startTime,
    endTime,
    initialTasks,
    title,
    requestNotes,
    isOffDay: isOff,
  }
}

export function DailyActivityCreateSplModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
  splModuleBasePath = '/dashboard/overtime-requests',
}: DailyActivityCreateSplModalProps) {
  const [workDate, setWorkDate] = useState('')
  const [startTime, setStartTime] = useState('17:00')
  const [endTime, setEndTime] = useState('21:00')
  const [title, setTitle] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [tasks, setTasks] = useState<EditableSplTaskItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdSpl, setCreatedSpl] = useState<{ splNumber: string; splId: number } | null>(null)

  // Initialize or reset form whenever employee or isOpen changes
  useEffect(() => {
    if (isOpen && employee) {
      setCreatedSpl(null)
      const info = extractOvertimeInfo(employee)
      setWorkDate(info.workDateYmd)
      setStartTime(info.startTime)
      setEndTime(info.endTime)
      setTitle(info.title)
      setRequestNotes(info.requestNotes)
      setTasks(info.initialTasks)
    }
  }, [isOpen, employee])

  // Calculate duration in hours
  const computedDurationHours = useMemo(() => {
    if (!startTime || !endTime || startTime === endTime) return 0
    const sh = parseTimeToMinutes(startTime)
    const eh = parseTimeToMinutes(endTime)
    if (sh === null || eh === null) return 0
    let diffMinutes = eh - sh
    if (diffMinutes < 0) diffMinutes += 24 * 60
    return Math.round((diffMinutes / 60) * 10) / 10
  }, [startTime, endTime])

  const selectedTasksCount = useMemo(() => {
    return tasks.filter((t) => t.selected).length
  }, [tasks])

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    )
  }

  const handleTaskChange = (id: string, field: keyof EditableSplTaskItem, val: any) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: val } : t))
    )
  }

  const handleAddTask = () => {
    const newTask: EditableSplTaskItem = {
      id: `task-manual-${Date.now()}`,
      label: '',
      unitNumber: (employee?.allUnits && employee.allUnits[0]) || '-',
      startedAt: startTime,
      endedAt: endTime,
      points: 10,
      remarks: '',
      selected: true,
    }
    setTasks((prev) => [...prev, newTask])
  }

  const handleRemoveTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!workDate) {
      toast.error('Tanggal lembur harus diisi.')
      return
    }
    if (!startTime || !endTime) {
      toast.error('Jam mulai dan jam selesai lembur harus diisi.')
      return
    }
    if (startTime === endTime) {
      toast.error('Jam mulai dan jam selesai lembur tidak boleh sama.')
      return
    }
    if (!title.trim()) {
      toast.error('Judul SPL harus diisi.')
      return
    }

    const activeTasks = tasks.filter((t) => t.selected)
    if (activeTasks.length === 0) {
      toast.error('Pilih minimal satu rincian pekerjaan lembur.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await createSplFromDailyActivityAction({
        employeeDbId: employee?.employeeDbId,
        employeeSn: employee?.employeeId,
        employeeName: employee?.name,
        sessionId: employee?.sessionId,
        sessionIds: employee?.sessions?.map((s) => s.id),
        isOffDay: Boolean(employee?.isRosterOff),
        workDate,
        plannedStartTime: startTime,
        plannedEndTime: endTime,
        title,
        requestNotes,
        siteId: employee?.siteId,
        shiftCode: employee?.shift === 'Malam' ? 'NS' : 'DS',
        tasks: activeTasks.map((t) => ({
          sessionItemId: t.sessionItemId,
          label: t.label || 'Pekerjaan Lembur Operasional',
          unitNumber: t.unitNumber || '-',
          startedAt: t.startedAt,
          endedAt: t.endedAt,
          points: t.points || 10,
          remarks: t.remarks,
          photoUrl: t.photoUrl,
          photos: t.photos,
        })),
      })

      if (res.success && res.splNumber && res.splId) {
        setCreatedSpl({
          splNumber: res.splNumber,
          splId: res.splId,
        })
        toast.success(`Surat Perintah Lembur ${res.splNumber} berhasil dibuat!`)
        onSuccess?.(res.splNumber, res.splId)
      } else {
        toast.error(res.error || 'Gagal menerbitkan Surat Perintah Lembur.')
      }
    } catch (err: any) {
      console.error('[DailyActivityCreateSplModal] submit error:', err)
      toast.error(err.message || 'Terjadi kesalahan sistem saat membuat SPL.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!employee) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[90]"
        className="z-[95] w-[95vw] sm:w-full max-w-3xl max-h-[92dvh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl rounded-2xl border border-slate-200"
      >
        {/* Top Corporate Gradient Header */}
        <div className="bg-[linear-gradient(135deg,#003461,#004b87)] p-4 sm:p-5 text-white shrink-0 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-sky-200">
                PT CHITRA PARATAMA &bull; SURAT PERINTAH LEMBUR (SPL)
              </div>
              <DialogTitle className="text-base sm:text-lg font-black text-white leading-tight">
                Buat SPL Lembur dari Aktivitas Harian
              </DialogTitle>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <DialogDescription className="sr-only">
          Formulir pembuatan Surat Perintah Lembur otomatis dari data aktivitas kerja lembur
        </DialogDescription>

        {/* Success View */}
        {createdSpl ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4 my-auto overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-black text-slate-900">
              Surat Perintah Lembur Berhasil Diterbitkan!
            </h3>

            <p className="text-xs text-slate-600 max-w-md leading-relaxed">
              Dokumen pengajuan lembur telah tersimpan ke sistem database, terintegrasi penuh ke modul Pengajuan &amp; Rekap Lembur, dan diarahkan ke alur persetujuan Leader / PJO.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 w-full max-w-md space-y-2 text-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Nomor Dokumen SPL:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-sm">
                  {createdSpl.splNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Karyawan:</span>
                <span className="font-bold text-slate-900">{employee.name} (SN: {employee.employeeId})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Tanggal Lembur:</span>
                <span className="font-semibold text-slate-800">{workDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Jam Lembur:</span>
                <span className="font-mono font-bold text-slate-800">{startTime} - {endTime} ({computedDurationHours} Jam)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Status Awal:</span>
                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                  Submitted (Menunggu Approval)
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
              <Button
                asChild
                className="h-9 flex-1 bg-[#0753e7] hover:bg-blue-600 text-white font-bold gap-2 text-xs"
              >
                <Link
                  href={
                    splModuleBasePath === '/mobile/overtime'
                      ? `/mobile/overtime?tab=history&splNumber=${encodeURIComponent(createdSpl.splNumber)}`
                      : `${splModuleBasePath}?splNumber=${encodeURIComponent(createdSpl.splNumber)}`
                  }
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka di Modul SPL
                </Link>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-9 px-6 text-xs font-semibold text-slate-700"
              >
                Selesai &amp; Tutup
              </Button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 sm:p-6 space-y-4 flex-1 bg-slate-50/50">
              {/* 1. Context Information Card (Pre-filled Employee Info) */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>A. DATA KARYAWAN &amp; SUMBER AKTIVITAS</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    SN: {employee.employeeId}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Nama Karyawan</span>
                    <span className="font-bold text-slate-900 text-sm block truncate">{employee.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Jabatan &amp; Dept</span>
                    <span className="font-semibold text-slate-800 block truncate">
                      {employee.jobTitle} • {employee.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Site Operasional</span>
                    <span className="font-semibold text-slate-800 block truncate">
                      {employee.siteName || 'Site Operasional'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Kondisi Shift / Roster</span>
                    <span className={cn(
                      'inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5',
                      employee.isRosterOff
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    )}>
                      {employee.isRosterOff ? 'Hari Libur / OFF' : `Shift ${employee.shift}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Timing & Duration Grid */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>B. JADWAL &amp; DURASI JAM LEMBUR</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    Total Durasi: {computedDurationHours} Jam
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Tanggal Kerja Lembur <span className="text-rose-500">*</span>
                    </label>
                    <HeroInput
                      type="date"
                      value={workDate}
                      onChange={(e) => setWorkDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Jam Mulai Lembur <span className="text-rose-500">*</span>
                    </label>
                    <HeroInput
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Jam Selesai Lembur <span className="text-rose-500">*</span>
                    </label>
                    <HeroInput
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between">
                  <span>
                    Presensi tercatat: Masuk <strong>{employee.checkInTime || '-'}</strong> | Checkout <strong>{employee.checkOutTime || '-'}</strong>
                  </span>
                  <span className="font-medium text-slate-600">
                    {employee.isRosterOff
                      ? 'Lembur Hari Libur (Seluruh jam dihitung lembur)'
                      : `Jam lembur di luar shift standar (${employee.baseNormalHours || 8} jam normal)`}
                  </span>
                </div>
              </div>

              {/* 3. Document Details (Title & Notes) */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>C. DOKUMEN &amp; ALASAN PENGAJUAN SPL</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Judul Penugasan Lembur <span className="text-rose-500">*</span>
                  </label>
                  <HeroInput
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Penugasan Lembur Operasional - Serviceman"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Catatan / Alasan Pekerjaan Lembur
                  </label>
                  <HeroTextarea
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    rows={3}
                    placeholder="Deskripsi kebutuhan pekerjaan lembur dan alasan operasional..."
                  />
                </div>
              </div>

              {/* 4. Pre-filled Line Items / Tasks from Daily Activity */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Wrench className="w-4 h-4 text-emerald-600" />
                    <span>D. RINCIAN PEKERJAAN LEMBUR ({selectedTasksCount} Dipilih dari Daily Activity)</span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTask}
                    className="h-7 text-xs font-semibold gap-1 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Pekerjaan
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className={cn(
                        'p-3 rounded-xl border transition-colors flex flex-col gap-2',
                        task.selected
                          ? 'bg-slate-50/80 border-slate-300'
                          : 'bg-white/40 border-slate-200 opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          className="mt-1 text-blue-600 hover:text-blue-800 cursor-pointer shrink-0"
                          title={task.selected ? 'Batalkan pilihan item ini' : 'Pilih item ini untuk dimasukkan ke SPL'}
                        >
                          {task.selected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 flex-1">
                          <div className="sm:col-span-7">
                            <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                              Nama Aktivitas / Pekerjaan
                            </label>
                            <input
                              type="text"
                              value={task.label}
                              onChange={(e) => handleTaskChange(task.id, 'label', e.target.value)}
                              className="w-full h-8 text-xs font-semibold text-slate-900 border border-slate-300 rounded-lg px-2.5 bg-white shadow-2xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Nama kegiatan..."
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                              Unit Operasional
                            </label>
                            <input
                              type="text"
                              value={task.unitNumber}
                              onChange={(e) => handleTaskChange(task.id, 'unitNumber', e.target.value)}
                              className="w-full h-8 text-xs font-mono font-bold text-slate-800 border border-slate-300 rounded-lg px-2.5 bg-white shadow-2xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="DT-xxx / -"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                              Poin / Bobot
                            </label>
                            <input
                              type="number"
                              value={task.points}
                              onChange={(e) => handleTaskChange(task.id, 'points', parseInt(e.target.value, 10) || 0)}
                              className="w-full h-8 text-xs font-mono font-bold text-emerald-700 border border-slate-300 rounded-lg px-2.5 bg-white shadow-2xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="10"
                            />
                          </div>
                        </div>

                        {tasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(task.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 mt-1"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Line Remarks & Time details */}
                      <div className="pl-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                            {task.startedAt} - {task.endedAt}
                          </span>
                          {task.remarks && (
                            <span className="italic truncate max-w-xs text-slate-600">
                              &ldquo;{task.remarks}&rdquo;
                            </span>
                          )}
                        </div>
                        {task.photoUrl && (
                          <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                            &bull; Foto bukti tersedia
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>SPL akan langsung diarahkan ke alur approval Leader / PJO</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="h-9 px-4 text-xs font-semibold text-slate-700"
                >
                  Batal
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-5 bg-[#0753e7] hover:bg-blue-600 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menerbitkan SPL...
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      Terbitkan &amp; Simpan SPL
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
