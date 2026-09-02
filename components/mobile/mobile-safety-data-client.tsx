'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle, BarChart3, Calendar, CheckCircle2, ExternalLink,
  FileText, Plus, Search, ShieldCheck, Users, X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  manageSafetyIncidentReportAction,
  manageSafetyIncidentSummaryYearlyAction,
  manageSafetyIncidentSummaryMonthlyAction,
  manageSafetyCertificationAction,
  manageSafetyInspectionAction,
  manageSafetyInductionAction,
  manageSafetyPerformanceAction,
  manageSafetyManHoursAction,
  manageSafetyMonthlyManHoursAction,
  manageSafetyWeeklyActivityAction,
} from '@/app/dashboard/safety/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SpeechTextarea as Textarea } from "@/components/ui/speech-textarea"
import { cn } from '@/lib/utils'
import type { getSafetyDashboardData } from '@/lib/safety-dashboard/queries'

type SafetyData = Awaited<ReturnType<typeof getSafetyDashboardData>> & { access?: any }
type TimestampValue = Date | string | null
type FormState<T> = { open: boolean; mode: 'create' | 'edit' | 'view' | 'delete'; row: T | null }

const TABS = [
  { key: 'incident-reports', label: 'Incidents', icon: AlertTriangle },
  { key: 'yearly-summary', label: 'Yearly', icon: BarChart3 },
  { key: 'monthly-summary', label: 'Monthly', icon: Calendar },
  { key: 'certifications', label: 'Cert', icon: ShieldCheck },
  { key: 'performance', label: 'Perf', icon: BarChart3 },
  { key: 'man-hours', label: 'MH', icon: FileText },
  { key: 'monthly-man-hours', label: 'MMH', icon: FileText },
  { key: 'weekly', label: 'Weekly', icon: CheckCircle2 },
  { key: 'inspections', label: 'Insp', icon: Search },
  { key: 'inductions', label: 'Induct', icon: Users },
] as const

type TabKey = (typeof TABS)[number]['key']

function formatDate(v: TimestampValue) {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtNum(v: unknown) {
  const n = Number(v ?? 0)
  return new Intl.NumberFormat('id-ID').format(Number.isFinite(n) ? n : 0)
}

function fmtDateInput(v: TimestampValue) {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-gray-500">{label}</p>
      {children}
    </div>
  )
}

function Card({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left active:bg-gray-50 transition">
      {children}
    </button>
  )
}

function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return null
  const isGood = ['open', 'aktif', 'baik', 'verified'].includes(value.toLowerCase())
  const isBad = ['expired', 'rusak', 'closed'].includes(value.toLowerCase())
  return (
    <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-medium',
      isGood ? 'bg-emerald-50 text-emerald-700' : isBad ? 'bg-orange-50 text-orange-700' : 'bg-amber-50 text-amber-700')}>
      {value}
    </span>
  )
}

function SheetModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-gray-50 px-5 pb-8 pt-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white">
              <X className="size-4 text-gray-400" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function TextF({ name, label, defaultValue, type = 'text' }: { name: string; label: string; defaultValue?: string | number | null; type?: string }) {
  return (
    <Field label={label}>
      <Input name={name} type={type} defaultValue={defaultValue ?? ''}
        className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm" />
    </Field>
  )
}

function TextAreaF({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  return (
    <Field label={label}>
      <Textarea name={name} defaultValue={defaultValue ?? ''} rows={3}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
    </Field>
  )
}

function SelectF({ name, label, defaultValue, options }: { name: string; label: string; defaultValue?: string | null; options?: string[] }) {
  const [val, setVal] = React.useState(defaultValue ?? '')
  return (
    <Field label={label}>
      <input type="hidden" name={name} value={val} />
      <select value={val} onChange={(e) => setVal(e.target.value)}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900">
        <option value="">Pilih...</option>
        {options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  )
}

function FormIncidentRow({ row, options }: { row: any; options?: any }) {
  const opts = options || { locations: [], categories: [], statuses: [], departments: [] }
  return (
    <>
      <TextF name="workerName" label="Nama" defaultValue={row?.workerName} />
      <SelectF name="department" label="Departemen" defaultValue={row?.department} options={opts.departments} />
      <TextAreaF name="incidentDescription" label="Deskripsi Insiden" defaultValue={row?.incidentDescription} />
      <div className="grid grid-cols-2 gap-3">
        <TextF name="propertyDamage" label="Property Damage" defaultValue={row?.propertyDamage} />
        <SelectF name="location" label="Lokasi" defaultValue={row?.location} options={opts.locations} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectF name="category" label="Kategori" defaultValue={row?.category} options={opts.categories} />
        <TextF name="incidentDate" label="Tanggal" type="date" defaultValue={fmtDateInput(row?.incidentDate)} />
      </div>
      <SelectF name="status" label="Status" defaultValue={row?.status ?? 'open'} options={opts.statuses} />
      <TextAreaF name="notes" label="Keterangan" defaultValue={row?.notes} />
    </>
  )
}

function FormYearlyRow({ row }: { row: any }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextF name="year" label="Tahun" type="number" defaultValue={row?.year ?? new Date().getFullYear()} />
      <TextF name="fatality" label="Fatality" type="number" defaultValue={row?.fatality ?? 0} />
      <TextF name="lostDayInjury" label="LDI" type="number" defaultValue={row?.lostDayInjury ?? 0} />
      <TextF name="restrictedWorkDayInjury" label="RWDI" type="number" defaultValue={row?.restrictedWorkDayInjury ?? 0} />
      <TextF name="medicalTreatmentCase" label="MTC" type="number" defaultValue={row?.medicalTreatmentCase ?? 0} />
      <TextF name="firstAid" label="First Aid" type="number" defaultValue={row?.firstAid ?? 0} />
      <TextF name="propertyDamage" label="PD" type="number" defaultValue={row?.propertyDamage ?? 0} />
      <TextF name="nearMissReport" label="NR" type="number" defaultValue={row?.nearMissReport ?? 0} />
      <TextF name="environmental" label="ENV" type="number" defaultValue={row?.environmental ?? 0} />
      <TextF name="fatigue" label="FTG" type="number" defaultValue={row?.fatigue ?? 0} />
      <TextF name="totalEvents" label="Total" type="number" defaultValue={row?.totalEvents ?? 0} />
    </div>
  )
}

function FormMonthlyRow({ row }: { row: any }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextF name="month" label="Bulan" type="date" defaultValue={fmtDateInput(row?.month)} />
      <TextF name="fatality" label="Fatality" type="number" defaultValue={row?.fatality ?? 0} />
      <TextF name="lostDayInjury" label="LDI" type="number" defaultValue={row?.lostDayInjury ?? 0} />
      <TextF name="restrictedWorkDayInjury" label="RWDI" type="number" defaultValue={row?.restrictedWorkDayInjury ?? 0} />
      <TextF name="medicalTreatmentCase" label="MTC" type="number" defaultValue={row?.medicalTreatmentCase ?? 0} />
      <TextF name="firstAid" label="First Aid" type="number" defaultValue={row?.firstAid ?? 0} />
      <TextF name="propertyDamage" label="PD" type="number" defaultValue={row?.propertyDamage ?? 0} />
      <TextF name="nearMissReport" label="NR" type="number" defaultValue={row?.nearMissReport ?? 0} />
      <TextF name="environmental" label="ENV" type="number" defaultValue={row?.environmental ?? 0} />
      <TextF name="totalEvents" label="Total" type="number" defaultValue={row?.totalEvents ?? 0} />
    </div>
  )
}

function FormCertRow({ row, options }: { row: any; options?: any }) {
  const opts = options || { departments: [], workAreas: [], equipmentClassifications: [], statuses: [], regulations: [], locations: [] }
  return (
    <>
      <TextF name="equipmentName" label="Nama Alat" defaultValue={row?.equipmentName} />
      <div className="grid grid-cols-2 gap-3">
        <SelectF name="picDepartment" label="PIC Dept" defaultValue={row?.picDepartment} options={opts.departments} />
        <SelectF name="workArea" label="Area Kerja" defaultValue={row?.workArea} options={opts.workAreas} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectF name="equipmentClassification" label="Klasifikasi" defaultValue={row?.equipmentClassification} options={opts.equipmentClassifications} />
        <TextF name="certifier" label="Sertifikator" defaultValue={row?.certifier} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextF name="certificationDate" label="Tgl Sertifikasi" type="date" defaultValue={fmtDateInput(row?.certificationDate)} />
        <TextF name="nextCertificationDate" label="Next Sert" type="date" defaultValue={fmtDateInput(row?.nextCertificationDate)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectF name="status" label="Status" defaultValue={row?.status ?? 'AKTIF'} options={opts.statuses} />
        <SelectF name="regulation" label="Regulasi" defaultValue={row?.regulation} options={opts.regulations} />
      </div>
      <SelectF name="workLocation" label="Lokasi Kerja" defaultValue={row?.workLocation} options={opts.locations} />
      <TextAreaF name="remarks" label="Keterangan" defaultValue={row?.remarks} />
    </>
  )
}

function FormPerfRow({ row }: { row: any }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextF name="year" label="Tahun" type="number" defaultValue={row?.year ?? new Date().getFullYear()} />
      <TextF name="periodLabel" label="Periode/Site" defaultValue={row?.periodLabel} />
      <TextF name="employeeCount" label="Karyawan" type="number" defaultValue={row?.employeeCount ?? 0} />
      <TextF name="safeManHoursUpToYear" label="Safe MH" defaultValue={row?.safeManHoursUpToYear ?? '0'} />
      <TextF name="fatalityThreshold" label="Fat Threshold" defaultValue={row?.fatalityThreshold ?? '0'} />
      <TextF name="fatalityActual" label="Fat Actual" defaultValue={row?.fatalityActual ?? '0'} />
      <TextF name="ltiThreshold" label="LTI Threshold" defaultValue={row?.ltiThreshold ?? '0'} />
      <TextF name="ltiActual" label="LTI Actual" defaultValue={row?.ltiActual ?? '0'} />
      <TextF name="propertyDamageThreshold" label="PD Threshold" defaultValue={row?.propertyDamageThreshold ?? '0'} />
      <TextF name="propertyDamageActual" label="PD Actual" defaultValue={row?.propertyDamageActual ?? '0'} />
    </div>
  )
}

function FormManHourRow({ row, options }: { row: any; options?: any }) {
  const opts = options || { locations: [] }
  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectF name="workLocation" label="Lokasi Kerja" defaultValue={row?.workLocation} options={opts.locations} />
      <TextF name="employeeCount" label="Karyawan" type="number" defaultValue={row?.employeeCount ?? 0} />
      <TextF name="safetyManHours" label="Safety MH" defaultValue={row?.safetyManHours ?? '0'} />
      <TextF name="safeTarget" label="Target Aman" defaultValue={row?.safeTarget ?? '0'} />
      <TextF name="averageWeeklyRevenue" label="Revenue/Minggu" defaultValue={row?.averageWeeklyRevenue ?? ''} />
    </div>
  )
}

function FormMonthlyMHRow({ row, options }: { row: any; options?: any }) {
  const opts = options || { locations: [] }
  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectF name="workLocation" label="Lokasi Kerja" defaultValue={row?.workLocation} options={opts.locations} />
      <TextF name="employeeCount" label="Karyawan" type="number" defaultValue={row?.employeeCount ?? 0} />
      <TextF name="month" label="Bulan" type="date" defaultValue={fmtDateInput(row?.month)} />
      <TextF name="safetyManHours" label="Safety MH" defaultValue={row?.safetyManHours ?? '0'} />
    </div>
  )
}

function FormWeeklyRow({ row, options }: { row: any; options?: any }) {
  const opts = options || { pics: [], categories: [] }
  return (
    <>
      <TextF name="activity" label="Kegiatan" defaultValue={row?.activity} />
      <div className="grid grid-cols-2 gap-3">
        <TextF name="activityDate" label="Tanggal" type="date" defaultValue={fmtDateInput(row?.activityDate)} />
        <SelectF name="pic" label="PIC" defaultValue={row?.pic} options={opts.pics} />
      </div>
      <SelectF name="category" label="Kategori" defaultValue={row?.category} options={opts.categories} />
      <TextF name="imageUrl" label="Image Link" defaultValue={row?.imageUrl} />
      <TextF name="evidenceUrl" label="Evidence Link" defaultValue={row?.evidenceUrl} />
    </>
  )
}

function FormInspectionsRow({ row, options }: { row: any; options?: any }) {
  const opts = options || { categories: [], statuses: [], locations: [], pics: [] }
  return (
    <>
      <TextF name="title" label="Judul Inspeksi" defaultValue={row?.title} />
      <div className="grid grid-cols-2 gap-3">
        <TextF name="date" label="Tanggal" type="date" defaultValue={fmtDateInput(row?.date)} />
        <SelectF name="category" label="Kategori" defaultValue={row?.category} options={opts.categories} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectF name="location" label="Lokasi" defaultValue={row?.location} options={opts.locations} />
        <SelectF name="status" label="Status" defaultValue={row?.status ?? 'Pending'} options={opts.statuses} />
      </div>
      <TextAreaF name="findings" label="Temuan" defaultValue={row?.findings} />
      <TextAreaF name="recommendation" label="Rekomendasi" defaultValue={row?.recommendation} />
      <div className="grid grid-cols-2 gap-3">
        <TextF name="assessmentScore" label="Skor" type="number" defaultValue={row?.assessmentScore} />
        <SelectF name="picName" label="PIC" defaultValue={row?.picName} options={opts.pics} />
      </div>
    </>
  )
}

function FormInductionsRow({ row }: { row: any }) {
  return (
    <>
      <TextF name="fullName" label="Nama Lengkap" defaultValue={row?.fullName} />
      <TextF name="companyOrigin" label="Perusahaan/Instansi" defaultValue={row?.companyOrigin} />
      <TextF name="phoneNumber" label="No. Telepon" defaultValue={row?.phoneNumber} />
      <TextAreaF name="purpose" label="Tujuan" defaultValue={row?.purpose} />
    </>
  )
}

function SafetyDataFormModal({
  open, mode, row, activeTab, access, filterOptions, onClose, onEdit, onDelete,
}: {
  open: boolean; mode: 'create' | 'edit' | 'view' | 'delete'; row: any
  activeTab: TabKey; access: any; filterOptions: any
  onClose: () => void; onEdit: (r: any) => void; onDelete: (r: any) => void
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)

  const getAction = () => {
    switch (activeTab) {
      case 'incident-reports': return manageSafetyIncidentReportAction
      case 'yearly-summary': return manageSafetyIncidentSummaryYearlyAction
      case 'monthly-summary': return manageSafetyIncidentSummaryMonthlyAction
      case 'certifications': return manageSafetyCertificationAction
      case 'performance': return manageSafetyPerformanceAction
      case 'man-hours': return manageSafetyManHoursAction
      case 'monthly-man-hours': return manageSafetyMonthlyManHoursAction
      case 'weekly': return manageSafetyWeeklyActivityAction
      case 'inspections': return manageSafetyInspectionAction
      case 'inductions': return manageSafetyInductionAction
      default: return null
    }
  }

  const action = getAction()

  const runMutation = async (formData: FormData) => {
    if (!action) return
    setSaving(true)
    try {
      const res = await action(formData)
      if (res.ok) {
        toast.success(res.message || 'Berhasil')
        onClose()
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    }
    setSaving(false)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('intent', mode === 'edit' ? 'update' : 'create')
    if (mode === 'edit' && row) fd.set('id', `${row.id}`)
    runMutation(fd)
  }

  const handleDelete = () => {
    if (!row || !action) return
    const fd = new FormData()
    fd.set('intent', 'delete')
    fd.set('id', `${row.id}`)
    runMutation(fd)
  }

  const isView = mode === 'view'
  const isDelete = mode === 'delete'
  const title = mode === 'create' ? 'Tambah Data' : mode === 'edit' ? 'Edit Data' : mode === 'delete' ? 'Hapus Data' : 'Detail Data'

  if (!open) return null

  return (
    <SheetModal open={open} onClose={onClose} title={isDelete ? 'Konfirmasi Hapus' : title}>
      {isDelete ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Hapus data ini?</p>
          <div className="flex gap-2">
            <Button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-700">Batal</Button>
            <Button onClick={handleDelete} disabled={saving} className="flex-1 h-11 rounded-xl bg-red-600 text-white">
              {saving ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'incident-reports' ? <FormIncidentRow row={row} options={filterOptions} /> : null}
          {activeTab === 'yearly-summary' ? <FormYearlyRow row={row} /> : null}
          {activeTab === 'monthly-summary' ? <FormMonthlyRow row={row} /> : null}
          {activeTab === 'certifications' ? <FormCertRow row={row} options={filterOptions} /> : null}
          {activeTab === 'performance' ? <FormPerfRow row={row} /> : null}
          {activeTab === 'man-hours' ? <FormManHourRow row={row} options={filterOptions} /> : null}
          {activeTab === 'monthly-man-hours' ? <FormMonthlyMHRow row={row} options={filterOptions} /> : null}
          {activeTab === 'weekly' ? <FormWeeklyRow row={row} options={filterOptions} /> : null}
          {activeTab === 'inspections' ? <FormInspectionsRow row={row} options={filterOptions} /> : null}
          {activeTab === 'inductions' ? <FormInductionsRow row={row} /> : null}
          {!isView ? (
            <Button type="submit" disabled={saving} className="h-12 w-full rounded-xl bg-blue-600 text-white">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          ) : (
            <div className="flex gap-2">
              {access?.canEdit ? (
                <Button type="button" onClick={() => onEdit(row)} className="flex-1 h-11 rounded-xl bg-blue-600 text-white">Edit</Button>
              ) : null}
              {access?.canDelete ? (
                <Button type="button" onClick={() => onDelete(row)} className="flex-1 h-11 rounded-xl bg-red-600 text-white">Hapus</Button>
              ) : null}
            </div>
          )}
        </form>
      )}
    </SheetModal>
  )
}

export function MobileSafetyDataClient({ data: initialData }: { data: SafetyData }) {
  const router = useRouter()
  const [data, setData] = React.useState(initialData)
  const [activeTab, setActiveTab] = React.useState<TabKey>('incident-reports')
  const [search, setSearch] = React.useState('')
  const [filterLabel, setFilterLabel] = React.useState('')
  const access = data.access || { canView: true, canEdit: true, canDelete: true }

  React.useEffect(() => { setData(initialData) }, [initialData])

  const filteredBySearch = <T extends Record<string, any>>(items: T[], fields: (keyof T)[]) => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((item) => fields.some((f) => String(item[f] ?? '').toLowerCase().includes(q)))
  }

  const [form, setForm] = React.useState<FormState<any>>({ open: false, mode: 'create', row: null })

  function openCreate() { setForm({ open: true, mode: 'create', row: null }) }
  function openView(row: any) { setForm({ open: true, mode: 'view', row }) }
  function openEdit(row: any) { setForm({ open: true, mode: 'edit', row }) }
  function openDelete(row: any) { setForm({ open: true, mode: 'delete', row }) }
  function closeForm() { setForm({ open: false, mode: 'create', row: null }) }

  const getFilterOptions = () => {
    if (activeTab === 'incident-reports') {
      const locs = new Set(data.incidentReports.map((r: any) => r.location).filter(Boolean))
      const cats = new Set(data.incidentReports.map((r: any) => r.category).filter(Boolean))
      const stats = new Set(data.incidentReports.map((r: any) => r.status).filter(Boolean))
      return { locations: [...locs] as string[], categories: [...cats] as string[], statuses: [...stats] as string[] }
    }
    if (activeTab === 'certifications') {
      const locs = new Set(data.certifications.map((r: any) => r.workLocation).filter(Boolean))
      const stats = new Set(data.certifications.map((r: any) => r.status).filter(Boolean))
      return { locations: [...locs] as string[], statuses: [...stats] as string[] }
    }
    if (activeTab === 'yearly-summary') { return { years: data.filterOptions.years } }
    if (activeTab === 'performance') { return { years: data.filterOptions.years } }
    if (activeTab === 'man-hours' || activeTab === 'monthly-man-hours') {
      const locs = new Set((activeTab === 'man-hours' ? data.manHours : data.monthlyManHours).map((r: any) => r.workLocation).filter(Boolean))
      return { locations: [...locs] as string[] }
    }
    if (activeTab === 'weekly') {
      const cats = new Set(data.weeklyActivities.map((r: any) => r.category).filter(Boolean))
      return { categories: [...cats] as string[] }
    }
    if (activeTab === 'inspections') {
      const cats = new Set((data.inspections || []).map((r: any) => r.category).filter(Boolean))
      const stats = new Set((data.inspections || []).map((r: any) => r.status).filter(Boolean))
      const locs = new Set((data.inspections || []).map((r: any) => r.location).filter(Boolean))
      return { categories: [...cats] as string[], statuses: [...stats] as string[], locations: [...locs] as string[] }
    }
    return {}
  }

  const filterOpts = getFilterOptions()
  const filterKeys = Object.keys(filterOpts || {}) as (keyof typeof filterOpts)[]

  function renderFilterBar() {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm" />
        </div>
        {filterKeys.length > 0 && filterLabel ? (
          <button onClick={() => setFilterLabel('')}
            className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-blue-50 px-3 text-xs font-medium text-blue-700">
            <X className="size-3.5" /> Filter
          </button>
        ) : null}
        {access.canEdit ? (
          <Button onClick={openCreate} className="h-10 shrink-0 rounded-xl bg-blue-600 px-3 text-white">
            <Plus className="size-4" />
          </Button>
        ) : null}
      </div>
    )
  }

  function renderFilterChips() {
    if (filterKeys.length === 0) return null
    const key = filterKeys[0] as string
    const values = (filterOpts as any)[key] as string[] | undefined
    if (!values || values.length === 0) return null
    const label = key === 'locations' ? 'Lokasi' : key === 'categories' ? 'Kategori' : key === 'statuses' ? 'Status' : key === 'years' ? 'Tahun' : key
    return (
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterLabel('')}
          className={cn('h-8 rounded-lg px-3 text-xs font-medium',
            !filterLabel ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600')}>
          Semua
        </button>
        {values.map((v) => (
          <button key={v} onClick={() => setFilterLabel(v)}
            className={cn('h-8 rounded-lg px-3 text-xs font-medium',
              filterLabel === v ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600')}>
            {v}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">HSE Mobile</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Safety Data</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-blue-200">Management & monitoring data keselamatan</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/10"><ShieldCheck className="size-5 text-blue-200" /></span>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          let count = 0
          if (tab.key === 'incident-reports') count = data.incidentReports.length
          else if (tab.key === 'yearly-summary') count = data.yearlySummaries.length
          else if (tab.key === 'monthly-summary') count = data.monthlySummaries.length
          else if (tab.key === 'certifications') count = data.certifications.length
          else if (tab.key === 'performance') count = data.performanceMetrics.length
          else if (tab.key === 'man-hours') count = data.manHours.length
          else if (tab.key === 'monthly-man-hours') count = data.monthlyManHours.length
          else if (tab.key === 'weekly') count = data.weeklyActivities.length
          else if (tab.key === 'inspections') count = data.inspections?.length ?? 0
          else if (tab.key === 'inductions') count = data.inductions?.length ?? 0
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(''); setFilterLabel('') }}
              className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium whitespace-nowrap',
                isActive ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600')}>
              <Icon className="size-3.5" />
              {tab.label}
              {count > 0 ? <span className="ml-0.5 rounded bg-black/10 px-1 text-[10px]">{count}</span> : null}
            </button>
          )
        })}
      </div>

      {activeTab === 'incident-reports' ? renderIncidentReports() : null}
      {activeTab === 'yearly-summary' ? renderYearlySummary() : null}
      {activeTab === 'monthly-summary' ? renderMonthlySummary() : null}
      {activeTab === 'certifications' ? renderCertifications() : null}
      {activeTab === 'performance' ? renderPerformance() : null}
      {activeTab === 'man-hours' ? renderManHours() : null}
      {activeTab === 'monthly-man-hours' ? renderMonthlyManHours() : null}
      {activeTab === 'weekly' ? renderWeekly() : null}
      {activeTab === 'inspections' ? renderInspections() : null}
      {activeTab === 'inductions' ? renderInductions() : null}

      <SafetyDataFormModal
        open={form.open} mode={form.mode} row={form.row}
        activeTab={activeTab} access={access}
        filterOptions={data.filterOptions}
        onClose={closeForm}
        onEdit={openEdit}
        onDelete={openDelete}
      />
    </div>
  )

  function StatCard({ value, label, color }: { value: number | string; label: string; color?: string }) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
        <p className={cn('text-xl font-bold', color || 'text-gray-900')}>{value}</p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</p>
      </div>
    )
  }

  function EmptyState() {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">Tidak ada data</p>
      </div>
    )
  }

  function renderIncidentReports() {
    let items = data.incidentReports
    items = filteredBySearch(items, ['workerName', 'department', 'incidentDescription', 'location', 'category'])
    if (filterLabel) items = items.filter((r: any) => r.location === filterLabel || r.category === filterLabel || r.status === filterLabel)
    const openCount = items.filter((r: any) => r.status === 'open').length
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Total" />
          <StatCard value={openCount} label="Open" color="text-orange-600" />
          <StatCard value={items.filter((r: any) => r.propertyDamage).length} label="PD" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{row.workerName || 'Tanpa nama'}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{row.department} &middot; {row.location}</p>
                </div>
                <Badge value={row.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">{row.incidentDescription}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>{row.category}</span>
                <span>{formatDate(row.incidentDate)}</span>
                {row.propertyDamage ? <span className="text-orange-600">PD: {row.propertyDamage}</span> : null}
              </div>
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }

  function renderYearlySummary() {
    let items = data.yearlySummaries
    items = filteredBySearch(items, ['year'])
    if (filterLabel) items = items.filter((r: any) => `${r.year}` === filterLabel)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Tahun" />
          <StatCard value={items.reduce((s: number, r: any) => s + (r.fatality || 0), 0)} label="Fatality" />
          <StatCard value={items.reduce((s: number, r: any) => s + (r.totalEvents || 0), 0)} label="Events" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{row.year}</p>
                <p className="text-xs text-gray-500">Total: <strong>{row.totalEvents}</strong></p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>FTL: {row.fatality}</span>
                <span>LDI: {row.lostDayInjury}</span>
                <span>RWDI: {row.restrictedWorkDayInjury}</span>
                <span>MTC: {row.medicalTreatmentCase}</span>
                <span>FA: {row.firstAid}</span>
                <span>PD: {row.propertyDamage}</span>
                <span>NR: {row.nearMissReport}</span>
                <span>ENV: {row.environmental}</span>
                <span>FTG: {row.fatigue}</span>
              </div>
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }

  function renderMonthlySummary() {
    let items = data.monthlySummaries
    items = filteredBySearch(items, ['month'])
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Bulan" />
          <StatCard value={items.reduce((s: number, r: any) => s + (r.fatality || 0), 0)} label="Fatality" />
          <StatCard value={items.reduce((s: number, r: any) => s + (r.totalEvents || 0), 0)} label="Events" />
        </div>
        {renderFilterBar()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{formatDate(row.month)}</p>
                <p className="text-xs text-gray-500">Total: <strong>{row.totalEvents}</strong></p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>FTL: {row.fatality}</span>
                <span>LDI: {row.lostDayInjury}</span>
                <span>RWDI: {row.restrictedWorkDayInjury}</span>
                <span>MTC: {row.medicalTreatmentCase}</span>
                <span>FA: {row.firstAid}</span>
                <span>PD: {row.propertyDamage}</span>
                <span>NR: {row.nearMissReport}</span>
                <span>ENV: {row.environmental}</span>
              </div>
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }

  function renderCertifications() {
    let items = data.certifications
    items = filteredBySearch(items, ['equipmentName', 'picDepartment', 'workArea', 'equipmentClassification', 'certifier', 'regulation'])
    if (filterLabel) items = items.filter((r: any) => r.workLocation === filterLabel || r.status === filterLabel)
    const expired = items.filter((r: any) => r.status === 'EXPIRED').length
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Total Alat" />
          <StatCard value={expired} label="Expired" color="text-orange-600" />
          <StatCard value={items.filter((r: any) => r.status === 'AKTIF').length} label="Aktif" color="text-emerald-600" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{row.equipmentName}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{row.picDepartment} &middot; {row.workArea}</p>
                </div>
                <Badge value={row.status} />
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>{row.equipmentClassification}</span>
                <span>Next: {formatDate(row.nextCertificationDate)}</span>
                <span>{row.workLocation}</span>
              </div>
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }

  function renderPerformance() {
    let items = data.performanceMetrics
    items = filteredBySearch(items, ['periodLabel'])
    if (filterLabel) items = items.filter((r: any) => `${r.year}` === filterLabel)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Periode" />
          <StatCard value={items.reduce((s: number, r: any) => s + (r.employeeCount || 0), 0)} label="Karyawan" />
          <StatCard value={fmtNum(items.reduce((s: number, r: any) => s + Number(r.safeManHoursUpToYear || 0), 0))} label="Safe MH" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{row.periodLabel} ({row.year})</p>
                <p className="text-xs text-gray-500">{fmtNum(row.employeeCount)} karyawan</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>Safe MH: {row.safeManHoursUpToYear}</span>
                <span>Fatality: {row.fatalityActual}/{row.fatalityThreshold}</span>
                <span>LTI: {row.ltiActual}/{row.ltiThreshold}</span>
                <span>PD: {row.propertyDamageActual}/{row.propertyDamageThreshold}</span>
              </div>
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }

  function renderManHours() {
    let items = data.manHours
    items = filteredBySearch(items, ['workLocation'])
    if (filterLabel) items = items.filter((r: any) => r.workLocation === filterLabel)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Lokasi" />
          <StatCard value={items.reduce((s: number, r: any) => s + (r.employeeCount || 0), 0)} label="Karyawan" />
          <StatCard value={fmtNum(items.reduce((s: number, r: any) => s + Number(r.safetyManHours || 0), 0))} label="Safe MH" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <p className="text-sm font-semibold text-gray-900">{row.workLocation}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>Karyawan: <strong>{row.employeeCount}</strong></span>
                <span>Safe MH: <strong>{fmtNum(row.safetyManHours)}</strong></span>
                <span>Target: <strong>{fmtNum(row.safeTarget)}</strong></span>
              </div>
              {row.averageWeeklyRevenue ? <p className="mt-1 text-xs text-gray-500">Revenue/minggu: {fmtNum(row.averageWeeklyRevenue)}</p> : null}
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }

  function renderMonthlyManHours() {
    let items = data.monthlyManHours
    items = filteredBySearch(items, ['workLocation'])
    if (filterLabel) items = items.filter((r: any) => r.workLocation === filterLabel)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Entries" />
          <StatCard value={items.reduce((s: number, r: any) => s + (r.employeeCount || 0), 0)} label="Karyawan" />
          <StatCard value={fmtNum(items.reduce((s: number, r: any) => s + Number(r.safetyManHours || 0), 0))} label="Safe MH" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <p className="text-sm font-semibold text-gray-900">{row.workLocation}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>{formatDate(row.month)}</span>
                <span>Karyawan: <strong>{row.employeeCount}</strong></span>
                <span>Safe MH: <strong>{fmtNum(row.safetyManHours)}</strong></span>
              </div>
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }

  function renderWeekly() {
    let items = data.weeklyActivities
    items = filteredBySearch(items, ['activity', 'pic', 'category'])
    if (filterLabel) items = items.filter((r: any) => r.category === filterLabel)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Aktivitas" />
          <StatCard value={new Set(items.map((r: any) => r.category)).size} label="Kategori" />
          <StatCard value={new Set(items.map((r: any) => r.pic)).size} label="PIC" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <p className="text-sm font-semibold text-gray-900">{row.activity}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge value={row.category} />
                {row.evidenceUrl ? (
                  <Link href={row.evidenceUrl} target="_blank" onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600">
                    <ExternalLink className="size-3" /> Bukti
                  </Link>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>PIC: {row.pic}</span>
                <span>{formatDate(row.activityDate)}</span>
              </div>
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }

  function renderInspections() {
    let items = data.inspections || []
    items = filteredBySearch(items, ['title', 'location', 'category', 'picName', 'findings'])
    if (filterLabel) items = items.filter((r: any) => r.category === filterLabel || r.status === filterLabel || r.location === filterLabel)
    const openCount = items.filter((r: any) => r.status === 'Open' || r.status === 'Pending').length
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Total" />
          <StatCard value={openCount} label="Open/Pending" color="text-orange-600" />
          <StatCard value={items.filter((r: any) => r.status === 'Closed').length} label="Closed" color="text-emerald-600" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{row.title}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{row.location} &middot; {row.category}</p>
                </div>
                <Badge value={row.status} />
              </div>
              {row.findings ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">{row.findings}</p> : null}
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>PIC: {row.picName || '-'}</span>
                <span>{formatDate(row.date)}</span>
                {row.assessmentScore ? <span>Skor: {row.assessmentScore}</span> : null}
              </div>
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }

  function renderInductions() {
    let items = data.inductions || []
    items = filteredBySearch(items, ['fullName', 'companyOrigin', 'phoneNumber', 'purpose'])
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Total" />
          <StatCard value={new Set(items.map((r: any) => r.companyOrigin)).size} label="Perusahaan" />
          <StatCard value={items.filter((r: any) => {
            const d = new Date(r.createdAt)
            const today = new Date()
            return d.toDateString() === today.toDateString()
          }).length} label="Hari Ini" />
        </div>
        {renderFilterBar()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{row.fullName}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{row.companyOrigin}</p>
                </div>
                <span className="text-[10px] text-gray-400">{formatDate(row.createdAt)}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">{row.purpose}</p>
              <div className="mt-2 text-xs text-gray-500">{row.phoneNumber}</div>
            </Card>
          ))}
          {items.length === 0 ? <EmptyState /> : null}
        </div>
      </div>
    )
  }
}
