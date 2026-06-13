'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle, BarChart3, Calendar, CheckCircle2, ExternalLink,
  FileText, Filter, Plus, Search, ShieldCheck, Trash2, X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  manageSafetyIncidentReportAction,
  manageSafetyIncidentSummaryYearlyAction,
  manageSafetyIncidentSummaryMonthlyAction,
  manageSafetyCertificationAction,
  manageSafetyPerformanceAction,
  manageSafetyManHoursAction,
  manageSafetyMonthlyManHoursAction,
  manageSafetyWeeklyActivityAction,
} from '@/app/dashboard/safety/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { getSafetyDashboardData } from '@/lib/safety-dashboard/queries'

type SafetyData = Awaited<ReturnType<typeof getSafetyDashboardData>> & { access?: any }

type TimestampValue = Date | string | null

type FormState<T> = {
  open: boolean
  mode: 'create' | 'edit' | 'view' | 'delete'
  row: T | null
}

const TABS = [
  { key: 'incident-reports', label: 'Incident Reports', icon: AlertTriangle },
  { key: 'yearly-summary', label: 'Yearly Summary', icon: BarChart3 },
  { key: 'monthly-summary', label: 'Monthly Summary', icon: Calendar },
  { key: 'certifications', label: 'Certifications', icon: ShieldCheck },
  { key: 'performance', label: 'Performance', icon: BarChart3 },
  { key: 'man-hours', label: 'Man Hours', icon: FileText },
  { key: 'monthly-man-hours', label: 'Monthly MH', icon: FileText },
  { key: 'weekly', label: 'Weekly Act.', icon: CheckCircle2 },
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
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">{label}</p>
      {children}
    </div>
  )
}

function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('w-full rounded-[1.15rem] bg-white p-4 text-left shadow-[0_14px_32px_rgba(8,32,51,0.08)] active:scale-[0.99] transition', className)}>
      {children}
    </button>
  )
}

function Badge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return null
  const isGood = ['open', 'aktif', 'baik', 'verified'].includes(value.toLowerCase())
  const isBad = ['expired', 'rusak', 'closed'].includes(value.toLowerCase())
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase',
      isGood ? 'bg-[#eef7ed] text-[#166534]' : isBad ? 'bg-[#fff1ea] text-[#8a3d00]' : 'bg-[#fff8e8] text-[#8a5a00]',
      className)}>
      {value}
    </span>
  )
}

function SheetModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="max-h-[85dvh] overflow-y-auto rounded-t-[1.5rem] bg-[#f6fbff] px-4 pb-8 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#082033]">{title}</h2>
            <button onClick={onClose} className="flex size-9 items-center justify-center rounded-xl bg-white shadow-[0_10px_24px_rgba(8,32,51,0.08)]">
              <X className="size-4 text-[#486275]" />
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
        className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold shadow-[0_10px_24px_rgba(8,32,51,0.08)]" />
    </Field>
  )
}

function TextAreaF({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  return (
    <Field label={label}>
      <Textarea name={name} defaultValue={defaultValue ?? ''} rows={3}
        className="rounded-2xl border-0 bg-white px-4 py-3 text-sm font-semibold shadow-[0_10px_24px_rgba(8,32,51,0.08)]" />
    </Field>
  )
}

function SelectF({ name, label, defaultValue, options }: { name: string; label: string; defaultValue?: string | null; options?: string[] }) {
  const [val, setVal] = React.useState(defaultValue ?? '')
  return (
    <Field label={label}>
      <input type="hidden" name={name} value={val} />
      <select value={val} onChange={(e) => setVal(e.target.value)}
        className="h-12 w-full rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033] shadow-[0_10px_24px_rgba(8,32,51,0.08)]">
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
      <TextAreaF name="incidentDescription" label="Incident" defaultValue={row?.incidentDescription} />
      <div className="grid grid-cols-2 gap-3">
        <TextF name="propertyDamage" label="Property damage" defaultValue={row?.propertyDamage} />
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
      <TextF name="equipmentName" label="Nama alat" defaultValue={row?.equipmentName} />
      <div className="grid grid-cols-2 gap-3">
        <SelectF name="picDepartment" label="PIC dept" defaultValue={row?.picDepartment} options={opts.departments} />
        <SelectF name="workArea" label="Area kerja" defaultValue={row?.workArea} options={opts.workAreas} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectF name="equipmentClassification" label="Klasifikasi" defaultValue={row?.equipmentClassification} options={opts.equipmentClassifications} />
        <TextF name="certifier" label="Sertifikator" defaultValue={row?.certifier} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextF name="certificationDate" label="Tgl sertifikasi" type="date" defaultValue={fmtDateInput(row?.certificationDate)} />
        <TextF name="nextCertificationDate" label="Next sert." type="date" defaultValue={fmtDateInput(row?.nextCertificationDate)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectF name="status" label="Status" defaultValue={row?.status ?? 'AKTIF'} options={opts.statuses} />
        <SelectF name="regulation" label="Regulasi" defaultValue={row?.regulation} options={opts.regulations} />
      </div>
      <SelectF name="workLocation" label="Lokasi kerja" defaultValue={row?.workLocation} options={opts.locations} />
      <TextAreaF name="remarks" label="Keterangan" defaultValue={row?.remarks} />
    </>
  )
}

function FormPerfRow({ row }: { row: any }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextF name="year" label="Tahun" type="number" defaultValue={row?.year ?? new Date().getFullYear()} />
      <TextF name="periodLabel" label="Periode/site" defaultValue={row?.periodLabel} />
      <TextF name="employeeCount" label="Karyawan" type="number" defaultValue={row?.employeeCount ?? 0} />
      <TextF name="safeManHoursUpToYear" label="Safe MH" defaultValue={row?.safeManHoursUpToYear ?? '0'} />
      <TextF name="fatalityThreshold" label="Fatality threshold" defaultValue={row?.fatalityThreshold ?? '0'} />
      <TextF name="fatalityActual" label="Fatality actual" defaultValue={row?.fatalityActual ?? '0'} />
      <TextF name="ltiThreshold" label="LTI threshold" defaultValue={row?.ltiThreshold ?? '0'} />
      <TextF name="ltiActual" label="LTI actual" defaultValue={row?.ltiActual ?? '0'} />
      <TextF name="propertyDamageThreshold" label="PD threshold" defaultValue={row?.propertyDamageThreshold ?? '0'} />
      <TextF name="propertyDamageActual" label="PD actual" defaultValue={row?.propertyDamageActual ?? '0'} />
    </div>
  )
}

function FormManHourRow({ row, options }: { row: any; options?: any }) {
  const opts = options || { locations: [] }
  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectF name="workLocation" label="Lokasi kerja" defaultValue={row?.workLocation} options={opts.locations} />
      <TextF name="employeeCount" label="Karyawan" type="number" defaultValue={row?.employeeCount ?? 0} />
      <TextF name="safetyManHours" label="Safety MH" defaultValue={row?.safetyManHours ?? '0'} />
      <TextF name="safeTarget" label="Target aman" defaultValue={row?.safeTarget ?? '0'} />
      <TextF name="averageWeeklyRevenue" label="Revenue/minggu" defaultValue={row?.averageWeeklyRevenue ?? ''} />
    </div>
  )
}

function FormMonthlyMHRow({ row, options }: { row: any; options?: any }) {
  const opts = options || { locations: [] }
  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectF name="workLocation" label="Lokasi kerja" defaultValue={row?.workLocation} options={opts.locations} />
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
      <TextF name="imageUrl" label="Image link" defaultValue={row?.imageUrl} />
      <TextF name="evidenceUrl" label="Evidence link" defaultValue={row?.evidenceUrl} />
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
          <p className="text-sm font-semibold text-[#486275]">Hapus data ini?</p>
          <div className="flex gap-2">
            <Button onClick={onClose} className="flex-1 h-12 rounded-2xl bg-white text-[#486275] shadow-[0_10px_24px_rgba(8,32,51,0.08)]">Batal</Button>
            <Button onClick={handleDelete} disabled={saving} className="flex-1 h-12 rounded-2xl bg-[#8a3d00] text-white">
              {saving ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {activeTab === 'incident-reports' ? <FormIncidentRow row={row} options={filterOptions} /> : null}
          {activeTab === 'yearly-summary' ? <FormYearlyRow row={row} /> : null}
          {activeTab === 'monthly-summary' ? <FormMonthlyRow row={row} /> : null}
          {activeTab === 'certifications' ? <FormCertRow row={row} options={filterOptions} /> : null}
          {activeTab === 'performance' ? <FormPerfRow row={row} /> : null}
          {activeTab === 'man-hours' ? <FormManHourRow row={row} options={filterOptions} /> : null}
          {activeTab === 'monthly-man-hours' ? <FormMonthlyMHRow row={row} options={filterOptions} /> : null}
          {activeTab === 'weekly' ? <FormWeeklyRow row={row} options={filterOptions} /> : null}
          {!isView ? (
            <Button type="submit" disabled={saving} className="h-14 w-full rounded-2xl bg-[#003f78] text-white">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          ) : (
            <div className="flex gap-2">
              {access?.canEdit ? (
                <Button type="button" onClick={() => onEdit(row)} className="flex-1 h-12 rounded-2xl bg-[#003f78] text-white">Edit</Button>
              ) : null}
              {access?.canDelete ? (
                <Button type="button" onClick={() => onDelete(row)} className="flex-1 h-12 rounded-2xl bg-[#8a3d00] text-white">Hapus</Button>
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

  const filterByKey = <T extends Record<string, any>>(items: T[], key: keyof T) => {
    if (!filterLabel) return items
    return items.filter((item) => String(item[key] ?? '') === filterLabel)
  }

  function formatIncidentDate(v: TimestampValue) {
    if (!v) return '-'
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
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
    return {}
  }

  const filterOpts = getFilterOptions()
  const filterKeys = Object.keys(filterOpts) as (keyof typeof filterOpts)[]

  function renderStatCards(items: any[], fields: { label: string; key: string; color?: string }[]) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {fields.map((f) => (
          <div key={f.label} className={cn('rounded-[1.15rem] bg-white p-3.5 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]', f.color)}>
            <p className="text-2xl font-black text-[#082033]">{fmtNum(items.reduce((s: number, i: any) => s + Number(i[f.key] ?? 0), 0))}</p>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#486275]">{f.label}</p>
          </div>
        ))}
      </div>
    )
  }

  function renderFilterBar() {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9ab0bf]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari..."
            className="h-11 w-full rounded-2xl border-0 bg-white pl-9 pr-4 text-sm font-semibold shadow-[0_14px_32px_rgba(8,32,51,0.08)]" />
        </div>
        {filterKeys.length > 0 && filterLabel ? (
          <button onClick={() => setFilterLabel('')}
            className="flex h-11 shrink-0 items-center gap-1 rounded-2xl bg-[#e6f6ff] px-3 text-xs font-black text-[#003f78]">
            <X className="size-3.5" /> Filter
          </button>
        ) : null}
        {access.canEdit ? (
          <Button onClick={openCreate} className="h-11 shrink-0 rounded-2xl bg-[#003f78] px-4 text-white">
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
          className={cn('h-9 shrink-0 rounded-full px-4 text-xs font-black uppercase tracking-[0.08em]',
            !filterLabel ? 'bg-[#003f78] text-white' : 'bg-white text-[#486275] shadow-[0_10px_24px_rgba(8,32,51,0.08)]')}>
          Semua
        </button>
        {values.map((v) => (
          <button key={v} onClick={() => setFilterLabel(v)}
            className={cn('h-9 shrink-0 rounded-full px-4 text-xs font-black uppercase tracking-[0.08em]',
              filterLabel === v ? 'bg-[#003f78] text-white' : 'bg-white text-[#486275] shadow-[0_10px_24px_rgba(8,32,51,0.08)]')}>
            {v}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-[1.35rem] bg-gradient-to-br from-[#003f78] to-[#0f172a] p-4 text-white shadow-[0_18px_38px_rgba(0,63,120,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b9dff6]">HSE Mobile</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Safety Data</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#d8efff]">Management & monitoring semua data safety</p>
          </div>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12"><ShieldCheck className="size-5" /></span>
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
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(''); setFilterLabel('') }}
              className={cn('flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-[0.08em]',
                isActive ? 'bg-[#003f78] text-white shadow-[0_10px_24px_rgba(0,63,120,0.2)]' : 'bg-white text-[#486275] shadow-[0_10px_24px_rgba(8,32,51,0.08)]')}>
              <Icon className="size-3.5" />
              {tab.label}
              <span className="ml-0.5 rounded-full bg-black/10 px-1.5 text-[9px]">{count}</span>
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

  function renderIncidentReports() {
    let items = data.incidentReports
    items = filteredBySearch(items, ['workerName', 'department', 'incidentDescription', 'location', 'category'])
    if (filterLabel) items = items.filter((r: any) => r.location === filterLabel || r.category === filterLabel || r.status === filterLabel)
    const openCount = items.filter((r: any) => r.status === 'open').length
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={items.length} label="Total" />
          <StatCard value={openCount} label="Open" color="text-[#8a3d00]" />
          <StatCard value={items.filter((r: any) => r.propertyDamage).length} label="PD" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#082033]">{row.workerName || 'Tanpa nama'}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#486275]">{row.department} &middot; {row.location}</p>
                </div>
                <Badge value={row.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">{row.incidentDescription}</p>
              <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-[#486275]">
                <span>{row.category}</span>
                <span>{formatIncidentDate(row.incidentDate)}</span>
                {row.propertyDamage ? <span className="text-[#8a3d00]">PD: {row.propertyDamage}</span> : null}
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
                <p className="text-sm font-black text-[#082033]">{row.year}</p>
                <p className="text-xs font-semibold text-[#486275]">Total: <strong>{row.totalEvents}</strong></p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[#486275]">
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
                <p className="text-sm font-black text-[#082033]">{formatDate(row.month)}</p>
                <p className="text-xs font-semibold text-[#486275]">Total: <strong>{row.totalEvents}</strong></p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[#486275]">
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
          <StatCard value={items.length} label="Total alat" />
          <StatCard value={expired} label="Expired" color="text-[#8a3d00]" />
          <StatCard value={items.filter((r: any) => r.status === 'AKTIF').length} label="Aktif" color="text-[#166534]" />
        </div>
        {renderFilterBar()}
        {renderFilterChips()}
        <div className="space-y-2">
          {items.map((row: any) => (
            <Card key={row.id} onClick={() => openView(row)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#082033]">{row.equipmentName}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#486275]">{row.picDepartment} &middot; {row.workArea}</p>
                </div>
                <Badge value={row.status} />
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-[#486275]">
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
                <p className="text-sm font-black text-[#082033]">{row.periodLabel} ({row.year})</p>
                <p className="text-xs font-semibold text-[#486275]">{fmtNum(row.employeeCount)} karyawan</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[#486275]">
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
              <p className="text-sm font-black text-[#082033]">{row.workLocation}</p>
              <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-[#486275]">
                <span>Karyawan: <strong>{row.employeeCount}</strong></span>
                <span>Safe MH: <strong>{fmtNum(row.safetyManHours)}</strong></span>
                <span>Target: <strong>{fmtNum(row.safeTarget)}</strong></span>
              </div>
              {row.averageWeeklyRevenue ? <p className="mt-1 text-xs font-semibold text-[#486275]">Revenue/minggu: {fmtNum(row.averageWeeklyRevenue)}</p> : null}
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
              <p className="text-sm font-black text-[#082033]">{row.workLocation}</p>
              <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-[#486275]">
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
              <p className="text-sm font-black text-[#082033]">{row.activity}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge value={row.category} />
                {row.evidenceUrl ? (
                  <Link href={row.evidenceUrl} target="_blank" onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs font-black text-[#003f78]">
                    <ExternalLink className="size-3" /> Bukti
                  </Link>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-[#486275]">
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

  function StatCard({ value, label, color }: { value: number | string; label: string; color?: string }) {
    return (
      <div className="rounded-[1.15rem] bg-white p-3.5 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
        <p className={cn('text-2xl font-black', color || 'text-[#082033]')}>{value}</p>
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#486275]">{label}</p>
      </div>
    )
  }

  function EmptyState() {
    return (
      <div className="rounded-[1.15rem] bg-white p-8 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
        <p className="text-sm font-semibold text-[#486275]">Tidak ada data</p>
      </div>
    )
  }
}
