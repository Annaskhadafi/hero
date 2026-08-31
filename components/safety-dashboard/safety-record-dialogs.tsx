'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calendar, CheckCircle2, Clock, ImageIcon, Info, Loader2, Pencil, Plus, Upload, X } from "lucide-react"

import {
  getAttendanceManHoursAction,
  manageSafetyCertificationAction,
  manageSafetyIncidentReportAction,
  manageSafetyIncidentSummaryMonthlyAction,
  manageSafetyIncidentSummaryYearlyAction,
  manageSafetyManHoursAction,
  manageSafetyMonthlyManHoursAction,
  manageSafetyPerformanceAction,
  manageSafetyWeeklyActivityAction,
  saveBatchMonthlyManHoursAction,
  saveGlobalInitialManHoursAction,
} from "@/app/dashboard/safety/actions"
import { uploadFile } from "@/app/actions/upload"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { EnterpriseActionButtons, EnterpriseFormGrid, EnterpriseRecordDialog, type TableRbacAccess } from "@/components/ui/enterprise-table-kit"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"


export type SafetyFormOptions = {
  locations?: string[]
  categories?: string[]
  statuses?: string[]
  departments?: string[]
  workAreas?: string[]
  equipmentClassifications?: string[]
  regulations?: string[]
  pics?: string[]
  years?: string[]
}

type SafetyActionResult = { ok: boolean; message: string }
type NativeFormAction = (formData: FormData) => Promise<SafetyActionResult>
type TimestampValue = Date | string | null

const CURRENT_YEAR_NUM = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => `${CURRENT_YEAR_NUM - 5 + i}`)

type YearlySummaryRow = { id: number; year: number; fatality: number; lostDayInjury: number; restrictedWorkDayInjury: number; medicalTreatmentCase: number; firstAid: number; propertyDamage: number; nearMissReport: number; environmental: number; fatigue: number; totalEvents: number }
type MonthlySummaryRow = { id: number; month: TimestampValue; fatality: number; lostDayInjury: number; restrictedWorkDayInjury: number; medicalTreatmentCase: number; firstAid: number; propertyDamage: number; nearMissReport: number; environmental: number; totalEvents: number }
type IncidentRow = { id: number; workerName: string; department: string; incidentDescription: string; propertyDamage: string; location: string; category: string; incidentDate: TimestampValue; notes: string; status: string }
type CertificationRow = { id: number; equipmentName: string; picDepartment: string; workArea: string; equipmentClassification: string; certifier: string; certificationDate: TimestampValue; nextCertificationDate: TimestampValue; status: string; regulation: string; remarks: string; workLocation: string }
type WeeklyActivityRow = { id: number; activity: string; activityDate: TimestampValue; pic: string; category: string; imageUrl: string; evidenceUrl: string }
type PerformanceRow = { id: number; year: number; periodLabel: string; employeeCount: number; safeManHoursUpToYear: string; fatalityThreshold: string; fatalityActual: string; ltiThreshold: string; ltiActual: string; propertyDamageThreshold: string; propertyDamageActual: string }
type ManHoursRow = { id: number; workLocation: string; employeeCount: number; safetyManHours: string; safeTarget: string; averageWeeklyRevenue: string | null }
type MonthlyManHoursRow = { id: number; workLocation: string; employeeCount: number; month: TimestampValue; safetyManHours: string }

function formatDateInput(value: TimestampValue) {
  if (!value) return ""
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function TextField({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue?: string | number | null; type?: string }) {
  return (
    <Label className="grid gap-2 text-sm font-medium">
      {label}
      <Input name={name} type={type} defaultValue={defaultValue ?? ""} />
    </Label>
  )
}

function TextAreaField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  return (
    <Label className="grid gap-2 text-sm font-medium">
      {label}
      <Textarea name={name} defaultValue={defaultValue ?? ""} rows={3} />
    </Label>
  )
}

function ComboboxField({ name, label, defaultValue, options = [] }: { name: string; label: string; defaultValue?: string | null; options?: string[] }) {
  const [value, setValue] = React.useState(defaultValue ?? "")
  return (
    <Label className="grid gap-2 text-sm font-medium">
      {label}
      <input type="hidden" name={name} value={value} />
      <Combobox 
        value={value} 
        onChange={setValue} 
        options={options} 
        placeholder={`Pilih ${label.toLowerCase()}...`} 
        allowCustom 
      />
    </Label>
  )
}

function useSafetyMutation(action: NativeFormAction, onDone: () => void) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const run = (formData: FormData) => {
    startTransition(async () => {
      const result = await action(formData)
      if (result.ok) {
        setError(null)
        onDone()
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  return { pending, error, setError, run }
}

function DialogSubmitButton({ pending, onClick, children, variant }: { pending: boolean; onClick: () => void; children: React.ReactNode; variant?: "default" | "destructive" }) {
  return (
    <Button type="button" variant={variant} disabled={pending} onClick={onClick} className="ml-auto">
      {pending ? "Memproses..." : children}
    </Button>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="text-sm font-medium text-destructive">{message}</p>
}

const AddButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(({ children, ...props }, ref) => {
  return (
    <Button ref={ref} type="button" size="dense" {...props}>
      <Plus className="size-4" />
      {children}
    </Button>
  )
})
AddButton.displayName = "AddButton"

function useDialogMode() {
  const [mode, setMode] = React.useState<"view" | "edit" | "delete" | "form" | null>(null)
  return { mode, setMode, open: mode != null, onOpenChange: (open: boolean) => !open && setMode(null) }
}

function SummaryFields({ row, monthly = false, options }: { row?: Partial<YearlySummaryRow & MonthlySummaryRow>; monthly?: boolean; options?: SafetyFormOptions }) {
  return (
    <EnterpriseFormGrid>
      {monthly ? <TextField name="month" label="Bulan" type="date" defaultValue={formatDateInput(row?.month ?? null)} /> : <TextField name="year" label="Tahun" type="number" defaultValue={row?.year ?? new Date().getFullYear()} />}
      <TextField name="fatality" label="Fatality" type="number" defaultValue={row?.fatality ?? 0} />
      <TextField name="lostDayInjury" label="Lost Day Injury" type="number" defaultValue={row?.lostDayInjury ?? 0} />
      <TextField name="restrictedWorkDayInjury" label="Restricted Work Day Injury" type="number" defaultValue={row?.restrictedWorkDayInjury ?? 0} />
      <TextField name="medicalTreatmentCase" label="Medical Treatment Case" type="number" defaultValue={row?.medicalTreatmentCase ?? 0} />
      <TextField name="firstAid" label="First Aid" type="number" defaultValue={row?.firstAid ?? 0} />
      <TextField name="propertyDamage" label="Property Damage" type="number" defaultValue={row?.propertyDamage ?? 0} />
      <TextField name="nearMissReport" label="Near Miss Report" type="number" defaultValue={row?.nearMissReport ?? 0} />
      <TextField name="environmental" label="Environmental" type="number" defaultValue={row?.environmental ?? 0} />
      {!monthly ? <TextField name="fatigue" label="Fatigue" type="number" defaultValue={row?.fatigue ?? 0} /> : null}
      <TextField name="totalEvents" label="Total Events" type="number" defaultValue={row?.totalEvents ?? 0} />
    </EnterpriseFormGrid>
  )
}

function IncidentFields({ row, options }: { row?: Partial<IncidentRow>; options?: SafetyFormOptions }) {
  return (
    <>
      <EnterpriseFormGrid>
        <TextField name="workerName" label="Nama" defaultValue={row?.workerName} />
        <ComboboxField name="department" label="Departemen" defaultValue={row?.department} options={options?.departments} />
        <TextField name="propertyDamage" label="Property damage" defaultValue={row?.propertyDamage} />
        <ComboboxField name="location" label="Lokasi" defaultValue={row?.location} options={options?.locations} />
        <ComboboxField name="category" label="Category" defaultValue={row?.category} options={options?.categories} />
        <TextField name="incidentDate" label="Tanggal" type="date" defaultValue={formatDateInput(row?.incidentDate ?? null)} />
        <ComboboxField name="status" label="Status" defaultValue={row?.status ?? "open"} options={options?.statuses} />
      </EnterpriseFormGrid>
      <TextAreaField name="incidentDescription" label="Incident" defaultValue={row?.incidentDescription} />
      <TextAreaField name="notes" label="Keterangan" defaultValue={row?.notes} />
    </>
  )
}

function CertificationFields({ row, options }: { row?: Partial<CertificationRow>; options?: SafetyFormOptions }) {
  return (
    <>
      <EnterpriseFormGrid>
        <TextField name="equipmentName" label="Nama alat" defaultValue={row?.equipmentName} />
        <ComboboxField name="picDepartment" label="PIC dept/sec" defaultValue={row?.picDepartment} options={options?.departments} />
        <ComboboxField name="workArea" label="Area kerja" defaultValue={row?.workArea} options={options?.workAreas} />
        <ComboboxField name="equipmentClassification" label="Klasifikasi" defaultValue={row?.equipmentClassification} options={options?.equipmentClassifications} />
        <TextField name="certifier" label="Sertifikator" defaultValue={row?.certifier} />
        <TextField name="certificationDate" label="Waktu sertifikasi" type="date" defaultValue={formatDateInput(row?.certificationDate ?? null)} />
        <TextField name="nextCertificationDate" label="Next sert." type="date" defaultValue={formatDateInput(row?.nextCertificationDate ?? null)} />
        <ComboboxField name="status" label="Status" defaultValue={row?.status ?? "AKTIF"} options={options?.statuses} />
        <ComboboxField name="regulation" label="Regulasi" defaultValue={row?.regulation} options={options?.regulations} />
        <ComboboxField name="workLocation" label="Lokasi kerja" defaultValue={row?.workLocation} options={options?.locations} />
      </EnterpriseFormGrid>
      <TextAreaField name="remarks" label="Keterangan" defaultValue={row?.remarks} />
    </>
  )
}

function PerformanceFields({ row, options }: { row?: Partial<PerformanceRow>; options?: SafetyFormOptions }) {
  return (
    <EnterpriseFormGrid>
      <TextField name="year" label="Tahun" type="number" defaultValue={row?.year ?? new Date().getFullYear()} />
      <TextField name="periodLabel" label="Periode/site" defaultValue={row?.periodLabel} />
      <TextField name="employeeCount" label="Jumlah karyawan" type="number" defaultValue={row?.employeeCount ?? 0} />
      <TextField name="safeManHoursUpToYear" label="Safe manhours" defaultValue={row?.safeManHoursUpToYear ?? "0"} />
      <TextField name="fatalityThreshold" label="Fatality threshold" defaultValue={row?.fatalityThreshold ?? "0"} />
      <TextField name="fatalityActual" label="Fatality actual" defaultValue={row?.fatalityActual ?? "0"} />
      <TextField name="ltiThreshold" label="LTI threshold" defaultValue={row?.ltiThreshold ?? "0"} />
      <TextField name="ltiActual" label="LTI actual" defaultValue={row?.ltiActual ?? "0"} />
      <TextField name="propertyDamageThreshold" label="PD threshold" defaultValue={row?.propertyDamageThreshold ?? "0"} />
      <TextField name="propertyDamageActual" label="PD actual" defaultValue={row?.propertyDamageActual ?? "0"} />
    </EnterpriseFormGrid>
  )
}

function ManHoursFields({ row, monthly = false, options }: { row?: Partial<ManHoursRow & MonthlyManHoursRow>; monthly?: boolean; options?: SafetyFormOptions }) {
  return (
    <EnterpriseFormGrid>
      <ComboboxField name="workLocation" label="Lokasi kerja" defaultValue={row?.workLocation} options={options?.locations} />
      <TextField name="employeeCount" label="Jumlah karyawan" type="number" defaultValue={row?.employeeCount ?? 0} />
      {monthly ? <TextField name="month" label="Bulan" type="date" defaultValue={formatDateInput(row?.month ?? null)} /> : null}
      <TextField name="safetyManHours" label="Safety manhours" defaultValue={row?.safetyManHours ?? "0"} />
      {!monthly ? <TextField name="safeTarget" label="Target aman" defaultValue={row?.safeTarget ?? "0"} /> : null}
      {!monthly ? <TextField name="averageWeeklyRevenue" label="Pendapatan rata-rata" defaultValue={row?.averageWeeklyRevenue ?? ""} /> : null}
    </EnterpriseFormGrid>
  )
}

function UploadFileButton({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  const [url, setUrl] = React.useState(defaultValue ?? "")
  const [uploading, setUploading] = React.useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await uploadFile(fd)
      if (res.success && res.url) {
        setUrl(res.url)
      } else {
        alert("Gagal upload file")
      }
    } catch {
      alert("Gagal upload file")
    } finally {
      setUploading(false)
    }
  }

  const fileName = url ? url.split("/").pop() || url : null

  return (
    <Label className="grid gap-2 text-sm font-medium">
      {label}
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-2.5">
        <Button type="button" variant="secondary" size="sm" disabled={uploading} className="relative overflow-hidden shrink-0">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading..." : "Pilih File"}
          <input type="file" className="absolute inset-0 cursor-pointer opacity-0" accept="image/*,.pdf" onChange={handleUpload} disabled={uploading} />
        </Button>
        {fileName ? (
          <>
            <span className="flex-1 truncate text-xs text-muted-foreground">{fileName}</span>
            <button type="button" onClick={() => setUrl("")} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </>
        ) : (
          <span className="flex-1 text-xs text-muted-foreground">Image / PDF (max 5MB)</span>
        )}
      </div>
    </Label>
  )
}

function WeeklyActivityFields({ row, options }: { row?: Partial<WeeklyActivityRow>; options?: SafetyFormOptions }) {
  return (
    <EnterpriseFormGrid>
      <TextField name="activity" label="Kegiatan" defaultValue={row?.activity} />
      <TextField name="activityDate" label="Tanggal" type="date" defaultValue={formatDateInput(row?.activityDate ?? null)} />
      <ComboboxField name="pic" label="PIC" defaultValue={row?.pic} options={options?.pics} />
      <ComboboxField name="category" label="Kategori" defaultValue={row?.category} options={options?.categories} />
      <UploadFileButton name="imageUrl" label="Image" defaultValue={row?.imageUrl} />
      <UploadFileButton name="evidenceUrl" label="Evidence" defaultValue={row?.evidenceUrl} />
    </EnterpriseFormGrid>
  )
}

export function EvidencePreviewDialog({ imageUrl, evidenceUrl, trigger }: { imageUrl?: string | null; evidenceUrl?: string | null; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const src = imageUrl || evidenceUrl

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <div onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</div> : null}
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto p-0">
        <DialogTitle className="sr-only">Evidence preview</DialogTitle>
        {src ? (
          src.match(/\.(jpe?g|png|gif|webp|svg|bmp)/i) ? (
            <img src={src} alt="Evidence" className="max-h-[85vh] w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <ImageIcon className="size-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">File bukan gambar. Buka di tab baru:</p>
              <Button variant="outline" asChild>
                <a href={src} target="_blank" rel="noopener noreferrer">Buka File</a>
              </Button>
            </div>
          )
        ) : (
          <p className="p-8 text-center text-muted-foreground">Tidak ada evidence</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateDialog({ title, access, action, children }: { title: string; access: TableRbacAccess; action: NativeFormAction; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)
  const mutation = useSafetyMutation(action, () => setOpen(false))

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      mutation.setError(null)
      formRef.current?.reset()
    }
  }

  return (
    <EnterpriseRecordDialog
      trigger={<AddButton>Tambah Data</AddButton>}
      title={title}
      mode="form"
      access={access}
      open={open}
      onOpenChange={handleOpenChange}
      footer={<DialogSubmitButton pending={mutation.pending} onClick={() => formRef.current?.requestSubmit()}>Simpan</DialogSubmitButton>}
    >
      <form
        ref={formRef}
        action={mutation.run}
        className="grid gap-4"
      >
        <input type="hidden" name="intent" value="create" />
        {children}
        <FormError message={mutation.error} />
      </form>
    </EnterpriseRecordDialog>
  )
}

export function CreateIncidentReportButton({ access, options }: { access: TableRbacAccess; options?: SafetyFormOptions }) { return <CreateDialog title="Tambah incident report" access={access} action={manageSafetyIncidentReportAction as unknown as NativeFormAction}><IncidentFields options={options} /></CreateDialog> }
export function CreateYearlySummaryButton({ access, options }: { access: TableRbacAccess; options?: SafetyFormOptions }) { return <CreateDialog title="Tambah rekap tahunan" access={access} action={manageSafetyIncidentSummaryYearlyAction as unknown as NativeFormAction}><SummaryFields options={options} /></CreateDialog> }
export function CreateMonthlySummaryButton({ access, options }: { access: TableRbacAccess; options?: SafetyFormOptions }) { return <CreateDialog title="Tambah rekap bulanan" access={access} action={manageSafetyIncidentSummaryMonthlyAction as unknown as NativeFormAction}><SummaryFields monthly options={options} /></CreateDialog> }
export function CreateCertificationButton({ access, options }: { access: TableRbacAccess; options?: SafetyFormOptions }) { return <CreateDialog title="Tambah sertifikasi" access={access} action={manageSafetyCertificationAction as unknown as NativeFormAction}><CertificationFields options={options} /></CreateDialog> }
export function CreatePerformanceButton({ access, options }: { access: TableRbacAccess; options?: SafetyFormOptions }) { return <CreateDialog title="Tambah performance" access={access} action={manageSafetyPerformanceAction as unknown as NativeFormAction}><PerformanceFields options={options} /></CreateDialog> }
export function CreateManHoursButton({ access, options }: { access: TableRbacAccess; options?: SafetyFormOptions }) {
  const [open, setOpen] = React.useState(false)
  const [inputType, setInputType] = React.useState<"auto" | "manual">("auto")
  const [workLocation, setWorkLocation] = React.useState("")
  const [initialManHours, setInitialManHours] = React.useState("")
  const [safeTarget, setSafeTarget] = React.useState("")
  const [year, setYear] = React.useState(new Date().getFullYear().toString())
  const [monthIndex, setMonthIndex] = React.useState(() => new Date().getMonth().toString())
  const [monthlyValues, setMonthlyValues] = React.useState<Record<string, string>>({
    jan: "", feb: "", mar: "", apr: "", may: "", jun: "", jul: "", aug: "", sep: "", okt: "", nov: "", des: ""
  })
  const [autoPreview, setAutoPreview] = React.useState<{ manHours: number; employeeCount: number; message: string } | null>(null)
  const [loadingAuto, setLoadingAuto] = React.useState(false)
  
  const formRef = React.useRef<HTMLFormElement>(null)
  const mutation = useSafetyMutation(saveBatchMonthlyManHoursAction as unknown as NativeFormAction, () => setOpen(false))

  const monthNames = [
    { key: "jan", label: "Januari" },
    { key: "feb", label: "Februari" },
    { key: "mar", label: "Maret" },
    { key: "apr", label: "April" },
    { key: "may", label: "Mei" },
    { key: "jun", label: "Juni" },
    { key: "jul", label: "Juli" },
    { key: "aug", label: "Agustus" },
    { key: "sep", label: "September" },
    { key: "okt", label: "Oktober" },
    { key: "nov", label: "November" },
    { key: "des", label: "Desember" },
  ]

  const handleFetchAttendance = React.useCallback(async (loc: string, yr: string, mIdx: string) => {
    if (!loc) return
    setLoadingAuto(true)
    try {
      const res = await getAttendanceManHoursAction(loc, Number(yr), Number(mIdx))
      if (res.ok) {
        setAutoPreview({ manHours: res.manHours, employeeCount: res.employeeCount, message: res.message })
      } else {
        setAutoPreview({ manHours: 0, employeeCount: 0, message: res.message })
      }
    } catch {
      setAutoPreview({ manHours: 0, employeeCount: 0, message: "Gagal memuat presensi" })
    } finally {
      setLoadingAuto(false)
    }
  }, [])

  React.useEffect(() => {
    if (inputType === "auto" && workLocation) {
      handleFetchAttendance(workLocation, year, monthIndex)
    }
  }, [inputType, workLocation, year, monthIndex, handleFetchAttendance])

  const calculatedManualTotal = React.useMemo(() => {
    return Object.values(monthlyValues || {}).reduce((acc, curr) => {
      const num = parseFloat(curr.replace(/,/g, ""))
      return acc + (Number.isFinite(num) ? num : 0)
    }, 0)
  }, [monthlyValues])

  return (
    <EnterpriseRecordDialog
      trigger={<AddButton>Tambah Data Man Hours</AddButton>}
      title="Input Data Safety Man Hours"
      description="Pilih metode pengisian: Otomatis via Attendance presensi atau Input Manual per Bulan"
      mode="form"
      access={access}
      open={open}
      onOpenChange={setOpen}
      footer={
        <div className="flex w-full items-center justify-between">
          {inputType === "manual" ? (
            <div className="text-xs text-muted-foreground">
              Total Man Hours Year {year}: <span className="font-bold text-foreground text-sm">{new Intl.NumberFormat('id-ID').format(calculatedManualTotal)} jam</span>
            </div>
          ) : (
            <div />
          )}
          <DialogSubmitButton pending={mutation.pending} onClick={() => formRef.current?.requestSubmit()}>Simpan Data</DialogSubmitButton>
        </div>
      }
    >
      <form ref={formRef} action={mutation.run} className="grid gap-4">
        <input type="hidden" name="inputType" value={inputType} />

        <div className="flex rounded-xl bg-surface-container-low p-1 border border-border/60">
          <button
            type="button"
            onClick={() => setInputType("auto")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
              inputType === "auto" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="size-4 text-emerald-600" />
            Auto (By Attendance)
          </button>
          <button
            type="button"
            onClick={() => setInputType("manual")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
              inputType === "manual" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="size-4 text-blue-600" />
            Input Manual Per Bulan
          </button>
        </div>

        <Label className="grid gap-2 text-sm font-medium">
          Lokasi Site Master
          <input type="hidden" name="workLocation" value={workLocation} />
          <Combobox
            value={workLocation}
            onChange={setWorkLocation}
            options={options?.locations ?? []}
            placeholder="Pilih lokasi site master..."
            allowCustom
          />
        </Label>

        {inputType === "auto" ? (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <Info className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Metode Auto Attendance</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Man Hours dihitung otomatis berdasarkan akumulasi presensi (attendance) karyawan di lokasi ini. Nanti tersimpan dengan keterangan <Badge variant="outline" className="bg-emerald-100 text-emerald-800 text-[10px] ml-1">Otomatis update by attendance</Badge>.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Label className="grid gap-2 text-sm font-medium">
                Tahun
                <select
                  name="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="border-input bg-white h-9 rounded-lg border px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </Label>
              <Label className="grid gap-2 text-sm font-medium">
                Bulan
                <input type="hidden" name="monthIndex" value={monthIndex} />
                <select
                  value={monthIndex}
                  onChange={(e) => setMonthIndex(e.target.value)}
                  className="border-input bg-white h-9 rounded-lg border px-3 text-xs shadow-sm"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m.key} value={idx}>{m.label}</option>
                  ))}
                </select>
              </Label>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Hasil kalkulasi presensi:</span>
                {loadingAuto ? <Loader2 className="size-4 animate-spin text-emerald-600" /> : null}
              </div>
              <p className="font-display text-lg font-bold text-emerald-950 mt-1">
                {autoPreview ? `${new Intl.NumberFormat('id-ID').format(autoPreview.manHours)} Safety Man Hours` : 'Pilih lokasi & bulan'}
              </p>
              {autoPreview?.message ? (
                <p className="text-xs text-emerald-700 mt-0.5">{autoPreview.message}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-border/80 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <Label className="grid gap-2 text-sm font-medium w-44">
                Pilih Tahun
                <select
                  name="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="border-input bg-white h-9 rounded-lg border px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </Label>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Jam Kerja Tahun {year}</p>
                <p className="font-display text-lg font-bold text-primary">{new Intl.NumberFormat('id-ID').format(calculatedManualTotal)} Jam</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-medium">Input jam kerja per bulan (Januari - Desember):</p>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {monthNames.map((m) => (
                <div key={m.key} className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">{m.label}</Label>
                  <Input
                    name={m.key}
                    type="number"
                    placeholder="0"
                    value={monthlyValues[m.key]}
                    onChange={(e) => setMonthlyValues({ ...monthlyValues, [m.key]: e.target.value })}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <FormError message={mutation.error} />
      </form>
    </EnterpriseRecordDialog>
  )
}

export function EditBatchManHoursButton({
  siteRow,
  access,
  options,
}: {
  siteRow: {
    workLocation: string
    employeeCount: number
    initialManHours?: number
    actualMonthlyManHours?: number
    safetyManHours: number
    safeTarget?: string
    monthlyDetails?: Array<any>
  }
  access: TableRbacAccess
  options?: SafetyFormOptions
}) {
  const [open, setOpen] = React.useState(false)
  const [inputType, setInputType] = React.useState<"auto" | "manual">("manual")
  const [initialManHours, setInitialManHours] = React.useState(`${siteRow.initialManHours ?? 0}`)
  const [safeTarget, setSafeTarget] = React.useState(`${siteRow.safeTarget ?? 0}`)
  const [year, setYear] = React.useState(new Date().getFullYear().toString())
  const [monthIndex, setMonthIndex] = React.useState(() => new Date().getMonth().toString())
  const [monthlyValues, setMonthlyValues] = React.useState<Record<string, string>>({
    jan: "", feb: "", mar: "", apr: "", may: "", jun: "", jul: "", aug: "", sep: "", okt: "", nov: "", des: ""
  })
  const [autoPreview, setAutoPreview] = React.useState<{ manHours: number; employeeCount: number; message: string } | null>(null)
  const [loadingAuto, setLoadingAuto] = React.useState(false)

  const formRef = React.useRef<HTMLFormElement>(null)
  const mutation = useSafetyMutation(saveBatchMonthlyManHoursAction as unknown as NativeFormAction, () => setOpen(false))

  const monthNames = [
    { key: "jan", label: "Januari" },
    { key: "feb", label: "Februari" },
    { key: "mar", label: "Maret" },
    { key: "apr", label: "April" },
    { key: "may", label: "Mei" },
    { key: "jun", label: "Juni" },
    { key: "jul", label: "Juli" },
    { key: "aug", label: "Agustus" },
    { key: "sep", label: "September" },
    { key: "okt", label: "Oktober" },
    { key: "nov", label: "November" },
    { key: "des", label: "Desember" },
  ]

  React.useEffect(() => {
    if (open) {
      setInitialManHours(`${siteRow.initialManHours ?? 0}`)
      setSafeTarget(`${siteRow.safeTarget ?? 0}`)
      if (siteRow.monthlyDetails) {
        const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "okt", "nov", "des"]
        const initial: Record<string, string> = {
          jan: "", feb: "", mar: "", apr: "", may: "", jun: "", jul: "", aug: "", sep: "", okt: "", nov: "", des: ""
        }
        siteRow.monthlyDetails.forEach((detail) => {
          const d = new Date(detail.month)
          if (!Number.isNaN(d.getTime())) {
            const mIdx = d.getMonth()
            if (monthKeys[mIdx]) {
              initial[monthKeys[mIdx]] = detail.safetyManHours ? `${detail.safetyManHours}` : ""
            }
          }
        })
        setMonthlyValues(initial)
      }
    }
  }, [open, siteRow])

  const handleFetchAttendance = React.useCallback(async (loc: string, yr: string, mIdx: string) => {
    if (!loc) return
    setLoadingAuto(true)
    try {
      const res = await getAttendanceManHoursAction(loc, Number(yr), Number(mIdx))
      if (res.ok) {
        setAutoPreview({ manHours: res.manHours, employeeCount: res.employeeCount, message: res.message })
      } else {
        setAutoPreview({ manHours: 0, employeeCount: 0, message: res.message })
      }
    } catch {
      setAutoPreview({ manHours: 0, employeeCount: 0, message: "Gagal memuat presensi" })
    } finally {
      setLoadingAuto(false)
    }
  }, [])

  React.useEffect(() => {
    if (inputType === "auto" && siteRow.workLocation) {
      handleFetchAttendance(siteRow.workLocation, year, monthIndex)
    }
  }, [inputType, siteRow.workLocation, year, monthIndex, handleFetchAttendance])

  const calculatedManualTotal = React.useMemo(() => {
    return Object.values(monthlyValues || {}).reduce((acc, curr) => {
      const num = parseFloat(curr.replace(/,/g, ""))
      return acc + (Number.isFinite(num) ? num : 0)
    }, 0)
  }, [monthlyValues])

  if (!access.canEdit) return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="denseIcon"
        onClick={() => setOpen(true)}
        title="Edit Data Man Hours 12 Bulan"
        className="size-7 hover:bg-slate-100"
      >
        <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
      </Button>
      <EnterpriseRecordDialog
        open={open}
        onOpenChange={setOpen}
        title={`Edit Safety Man Hours - ${siteRow.workLocation}`}
        description="Kelola data jam kerja (man hours) per bulan untuk lokasi ini"
        mode="form"
        access={access}
        footer={
          <div className="flex w-full items-center justify-between">
            {inputType === "manual" ? (
              <div className="text-xs text-muted-foreground">
                Total Man Hours Year {year}: <span className="font-bold text-foreground text-sm">{new Intl.NumberFormat('id-ID').format(calculatedManualTotal)} jam</span>
              </div>
            ) : (
              <div />
            )}
            <DialogSubmitButton pending={mutation.pending} onClick={() => formRef.current?.requestSubmit()}>Simpan Perubahan</DialogSubmitButton>
          </div>
        }
      >
        <form ref={formRef} action={mutation.run} className="grid gap-4">
          <input type="hidden" name="inputType" value={inputType} />
          <input type="hidden" name="workLocation" value={siteRow.workLocation} />

          <div className="flex rounded-xl bg-surface-container-low p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setInputType("auto")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                inputType === "auto" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="size-4 text-emerald-600" />
              Auto (By Attendance)
            </button>
            <button
              type="button"
              onClick={() => setInputType("manual")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                inputType === "manual" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="size-4 text-blue-600" />
              Input Manual Per Bulan
            </button>
          </div>

          <div className="rounded-lg border border-border bg-slate-50/70 p-3">
            <p className="text-xs text-muted-foreground font-medium">Lokasi Site Master</p>
            <p className="font-bold text-sm text-foreground">{siteRow.workLocation}</p>
          </div>

          {inputType === "auto" ? (
            <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Info className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Metode Auto Attendance</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Man Hours dihitung otomatis berdasarkan presensi karyawan di lokasi ini. Nanti tersimpan dengan keterangan <Badge variant="outline" className="bg-emerald-100 text-emerald-800 text-[10px] ml-1">Otomatis update by attendance</Badge>.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Label className="grid gap-2 text-sm font-medium">
                  Tahun
                  <select
                    name="year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="border-input bg-white h-9 rounded-lg border px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Label>
                <Label className="grid gap-2 text-sm font-medium">
                  Bulan
                  <input type="hidden" name="monthIndex" value={monthIndex} />
                  <select
                    value={monthIndex}
                    onChange={(e) => setMonthIndex(e.target.value)}
                    className="border-input bg-white h-9 rounded-lg border px-3 text-xs shadow-sm"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={m.key} value={idx}>{m.label}</option>
                    ))}
                  </select>
                </Label>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Hasil kalkulasi presensi:</span>
                  {loadingAuto ? <Loader2 className="size-4 animate-spin text-emerald-600" /> : null}
                </div>
                <p className="font-display text-lg font-bold text-emerald-950 mt-1">
                  {autoPreview ? `${new Intl.NumberFormat('id-ID').format(autoPreview.manHours)} Safety Man Hours` : 'Memuat data presensi...'}
                </p>
                {autoPreview?.message ? (
                  <p className="text-xs text-emerald-700 mt-0.5">{autoPreview.message}</p>
                ) : null}
              </div>
              {/* Pass safeTarget even in auto mode */}
              <input type="hidden" name="safeTarget" value={safeTarget} />
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-border/80 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between">
                <Label className="grid gap-2 text-sm font-medium w-44">
                  Pilih Tahun
                  <select
                    name="year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="border-input bg-white h-9 rounded-lg border px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Label>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Jam Kerja Tahun {year}</p>
                  <p className="font-display text-lg font-bold text-primary">{new Intl.NumberFormat('id-ID').format(calculatedManualTotal)} Jam</p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <Label className="grid gap-1.5 text-xs font-semibold text-amber-900">
                  🎯 Target Aman per Tahun (Jam)
                  <Input
                    name="safeTarget"
                    type="number"
                    step="0.01"
                    placeholder="Contoh: 500000"
                    value={safeTarget}
                    onChange={(e) => setSafeTarget(e.target.value)}
                    className="h-8 text-xs bg-white border-amber-200 focus-visible:ring-amber-400"
                  />
                  <span className="text-[10px] font-normal text-amber-700">
                    Target total jam kerja aman yang ingin dicapai untuk lokasi ini dalam setahun.
                    {safeTarget && parseFloat(safeTarget) > 0 && calculatedManualTotal > 0 ? (
                      <> &nbsp;Pencapaian saat ini: <strong>{Math.round(calculatedManualTotal / parseFloat(safeTarget) * 100)}%</strong></>
                    ) : null}
                  </span>
                </Label>
              </div>

              <p className="text-xs text-muted-foreground font-medium">Input / Edit jam kerja per bulan (Januari - Desember):</p>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {monthNames.map((m) => (
                  <div key={m.key} className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">{m.label}</Label>
                    <Input
                      name={m.key}
                      type="number"
                      placeholder="0"
                      value={monthlyValues[m.key]}
                      onChange={(e) => setMonthlyValues({ ...monthlyValues, [m.key]: e.target.value })}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <FormError message={mutation.error} />
        </form>
      </EnterpriseRecordDialog>
    </>
  )
}

export function EditGlobalStartDataButton({
  globalStartData,
  access,
}: {
  globalStartData?: {
    initialManHours: number
    safeTarget: number
    totalActualMonthlyManHours: number
    totalSystemSafeManHours: number
    lastUpdate: Date | string | null
  }
  access: TableRbacAccess
}) {
  const [open, setOpen] = React.useState(false)
  const [initialManHours, setInitialManHours] = React.useState(`${globalStartData?.initialManHours ?? 0}`)
  const [safeTarget, setSafeTarget] = React.useState(`${globalStartData?.safeTarget ?? 0}`)

  const formRef = React.useRef<HTMLFormElement>(null)
  const mutation = useSafetyMutation(saveGlobalInitialManHoursAction as unknown as NativeFormAction, () => setOpen(false))

  React.useEffect(() => {
    if (open) {
      setInitialManHours(`${globalStartData?.initialManHours ?? 0}`)
      setSafeTarget(`${globalStartData?.safeTarget ?? 0}`)
    }
  }, [open, globalStartData])

  if (!access.canEdit) return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 gap-1.5 text-xs font-semibold bg-white border-blue-200 text-blue-800 hover:bg-blue-50 hover:text-blue-900 shadow-xs"
      >
        <Pencil className="size-3.5 text-blue-600" />
        Set Start Data Gabungan (s/d 2025)
      </Button>

      <EnterpriseRecordDialog
        open={open}
        onOpenChange={setOpen}
        title="Start Data Safety Man Hours (Gabungan Semua Site s/d 2025)"
        description="Kelola akumulasi saldo awal jam kerja aman gabungan seluruh site sebelum tahun 2026."
        mode="form"
        access={access}
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Hasil Total System: <span className="font-bold text-foreground text-sm">{new Intl.NumberFormat('id-ID').format((parseFloat(initialManHours) || 0) + (globalStartData?.totalActualMonthlyManHours || 0))} jam</span>
            </div>
            <DialogSubmitButton pending={mutation.pending} onClick={() => formRef.current?.requestSubmit()}>Simpan Start Data</DialogSubmitButton>
          </div>
        }
      >
        <form ref={formRef} action={mutation.run} className="grid gap-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700">
                <Info className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Start Data Gabungan (Historis s/d 2025)</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Nilai ini adalah akumulasi total jam kerja aman dari seluruh lokasi site sebelum tahun 2026. Nilai aktual bulanan (2026+) akan ditambahkan di atas saldo awal ini.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <Label className="grid gap-1.5 text-xs font-semibold text-slate-800">
                Jam Kerja Awal Gabungan (s/d 2025)
                <Input
                  name="globalInitialManHours"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={initialManHours}
                  onChange={(e) => setInitialManHours(e.target.value)}
                  className="h-9 bg-white text-xs"
                />
              </Label>

              <Label className="grid gap-1.5 text-xs font-semibold text-slate-800">
                Target Safe Hours System
                <Input
                  name="globalSafeTarget"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={safeTarget}
                  onChange={(e) => setSafeTarget(e.target.value)}
                  className="h-9 bg-white text-xs"
                />
              </Label>
            </div>
          </div>

          <FormError message={mutation.error} />
        </form>
      </EnterpriseRecordDialog>
    </>
  )
}

export function CreateMonthlyManHoursButton({ access, options }: { access: TableRbacAccess; options?: SafetyFormOptions }) { return <CreateDialog title="Tambah monthly manhours" access={access} action={manageSafetyMonthlyManHoursAction as unknown as NativeFormAction}><ManHoursFields monthly options={options} /></CreateDialog> }
export function CreateWeeklyActivityButton({ access, options }: { access: TableRbacAccess; options?: SafetyFormOptions }) { return <CreateDialog title="Tambah weekly activity" access={access} action={manageSafetyWeeklyActivityAction as unknown as NativeFormAction}><WeeklyActivityFields options={options} /></CreateDialog> }

function GenericRowActions({ access, title, deleteLabel, action, id, children }: { access: TableRbacAccess; title: string; deleteLabel: string; action: NativeFormAction; id: number; children: React.ReactNode }) {
  const dialog = useDialogMode()
  const formRef = React.useRef<HTMLFormElement>(null)
  const mutation = useSafetyMutation(action, () => dialog.setMode(null))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      mutation.setError(null)
      dialog.setMode(null)
    }
  }

  const submitDelete = () => {
    const formData = new FormData()
    formData.set("intent", "delete")
    formData.set("id", `${id}`)
    mutation.run(formData)
  }

  return (
    <>
      <EnterpriseActionButtons access={access} onView={() => dialog.setMode("view")} onEdit={() => dialog.setMode("edit")} onDelete={() => dialog.setMode("delete")} />
      <EnterpriseRecordDialog
        open={dialog.open}
        onOpenChange={handleOpenChange}
        title={title}
        mode={dialog.mode === "delete" ? "delete" : dialog.mode === "edit" ? "edit" : "view"}
        access={access}
        footer={
          dialog.mode === "delete" ? (
            <DialogSubmitButton pending={mutation.pending} variant="destructive" onClick={submitDelete}>Hapus</DialogSubmitButton>
          ) : dialog.mode === "edit" ? (
            <DialogSubmitButton pending={mutation.pending} onClick={() => formRef.current?.requestSubmit()}>Simpan</DialogSubmitButton>
          ) : undefined
        }
      >
        {dialog.mode === "delete" ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">Hapus {deleteLabel}?</p>
            <FormError message={mutation.error} />
          </div>
        ) : (
          <form ref={formRef} action={mutation.run} className="grid gap-4">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={id} />
            <fieldset disabled={dialog.mode === "view"} className="grid gap-4 border-0 p-0 disabled:opacity-100">
              {children}
            </fieldset>
            <FormError message={mutation.error} />
          </form>
        )}
      </EnterpriseRecordDialog>
    </>
  )
}

export function YearlySummaryRowActions({ row, access, options }: { row: YearlySummaryRow; access: TableRbacAccess; options?: SafetyFormOptions }) { return <GenericRowActions access={access} title="Incident yearly summary" deleteLabel={`rekap tahun ${row.year}`} id={row.id} action={manageSafetyIncidentSummaryYearlyAction as unknown as NativeFormAction}><SummaryFields row={row} options={options} /></GenericRowActions> }
export function MonthlySummaryRowActions({ row, access, options }: { row: MonthlySummaryRow; access: TableRbacAccess; options?: SafetyFormOptions }) { return <GenericRowActions access={access} title="Incident monthly summary" deleteLabel="rekap bulanan" id={row.id} action={manageSafetyIncidentSummaryMonthlyAction as unknown as NativeFormAction}><SummaryFields row={row} monthly options={options} /></GenericRowActions> }
export function IncidentReportRowActions({ row, access, options }: { row: IncidentRow; access: TableRbacAccess; options?: SafetyFormOptions }) { return <GenericRowActions access={access} title="Incident report" deleteLabel={row.workerName || row.category || "incident"} id={row.id} action={manageSafetyIncidentReportAction as unknown as NativeFormAction}><IncidentFields row={row} options={options} /></GenericRowActions> }
export function CertificationRowActions({ row, access, options }: { row: CertificationRow; access: TableRbacAccess; options?: SafetyFormOptions }) { return <GenericRowActions access={access} title="Safety certification" deleteLabel={row.equipmentName} id={row.id} action={manageSafetyCertificationAction as unknown as NativeFormAction}><CertificationFields row={row} options={options} /></GenericRowActions> }
export function WeeklyActivityRowActions({ row, access, options }: { row: WeeklyActivityRow; access: TableRbacAccess; options?: SafetyFormOptions }) { return <GenericRowActions access={access} title="Weekly activity" deleteLabel={row.activity} id={row.id} action={manageSafetyWeeklyActivityAction as unknown as NativeFormAction}><WeeklyActivityFields row={row} options={options} /></GenericRowActions> }
export function PerformanceRowActions({ row, access, options }: { row: PerformanceRow; access: TableRbacAccess; options?: SafetyFormOptions }) { return <GenericRowActions access={access} title="Safety performance" deleteLabel={row.periodLabel} id={row.id} action={manageSafetyPerformanceAction as unknown as NativeFormAction}><PerformanceFields row={row} options={options} /></GenericRowActions> }
export function ManHoursRowActions({ row, access, options }: { row: ManHoursRow; access: TableRbacAccess; options?: SafetyFormOptions }) { return <GenericRowActions access={access} title="Safety manhours" deleteLabel={row.workLocation} id={row.id} action={manageSafetyManHoursAction as unknown as NativeFormAction}><ManHoursFields row={row} options={options} /></GenericRowActions> }
export function MonthlyManHoursRowActions({ row, access, options }: { row: MonthlyManHoursRow; access: TableRbacAccess; options?: SafetyFormOptions }) { return <GenericRowActions access={access} title="Monthly manhours" deleteLabel={row.workLocation} id={row.id} action={manageSafetyMonthlyManHoursAction as unknown as NativeFormAction}><ManHoursFields row={row} monthly options={options} /></GenericRowActions> }
