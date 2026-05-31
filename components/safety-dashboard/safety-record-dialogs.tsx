"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import {
  manageSafetyCertificationAction,
  manageSafetyIncidentReportAction,
  manageSafetyIncidentSummaryMonthlyAction,
  manageSafetyIncidentSummaryYearlyAction,
  manageSafetyManHoursAction,
  manageSafetyMonthlyManHoursAction,
  manageSafetyPerformanceAction,
  manageSafetyWeeklyActivityAction,
} from "@/app/dashboard/safety/actions"
import { Button } from "@/components/ui/button"
import { EnterpriseActionButtons, EnterpriseFormGrid, EnterpriseRecordDialog, type TableRbacAccess } from "@/components/ui/enterprise-table-kit"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type SafetyActionResult = { ok: boolean; message: string }
type NativeFormAction = (formData: FormData) => Promise<SafetyActionResult>
type TimestampValue = Date | string | null

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

function SummaryFields({ row, monthly = false }: { row?: Partial<YearlySummaryRow & MonthlySummaryRow>; monthly?: boolean }) {
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

function IncidentFields({ row }: { row?: Partial<IncidentRow> }) {
  return (
    <>
      <EnterpriseFormGrid>
        <TextField name="workerName" label="Nama" defaultValue={row?.workerName} />
        <TextField name="department" label="Departemen" defaultValue={row?.department} />
        <TextField name="propertyDamage" label="Property damage" defaultValue={row?.propertyDamage} />
        <TextField name="location" label="Lokasi" defaultValue={row?.location} />
        <TextField name="category" label="Category" defaultValue={row?.category} />
        <TextField name="incidentDate" label="Tanggal" type="date" defaultValue={formatDateInput(row?.incidentDate ?? null)} />
        <TextField name="status" label="Status" defaultValue={row?.status ?? "open"} />
      </EnterpriseFormGrid>
      <TextAreaField name="incidentDescription" label="Incident" defaultValue={row?.incidentDescription} />
      <TextAreaField name="notes" label="Keterangan" defaultValue={row?.notes} />
    </>
  )
}

function CertificationFields({ row }: { row?: Partial<CertificationRow> }) {
  return (
    <>
      <EnterpriseFormGrid>
        <TextField name="equipmentName" label="Nama alat" defaultValue={row?.equipmentName} />
        <TextField name="picDepartment" label="PIC dept/sec" defaultValue={row?.picDepartment} />
        <TextField name="workArea" label="Area kerja" defaultValue={row?.workArea} />
        <TextField name="equipmentClassification" label="Klasifikasi" defaultValue={row?.equipmentClassification} />
        <TextField name="certifier" label="Sertifikator" defaultValue={row?.certifier} />
        <TextField name="certificationDate" label="Waktu sertifikasi" type="date" defaultValue={formatDateInput(row?.certificationDate ?? null)} />
        <TextField name="nextCertificationDate" label="Next sert." type="date" defaultValue={formatDateInput(row?.nextCertificationDate ?? null)} />
        <TextField name="status" label="Status" defaultValue={row?.status ?? "AKTIF"} />
        <TextField name="regulation" label="Regulasi" defaultValue={row?.regulation} />
        <TextField name="workLocation" label="Lokasi kerja" defaultValue={row?.workLocation} />
      </EnterpriseFormGrid>
      <TextAreaField name="remarks" label="Keterangan" defaultValue={row?.remarks} />
    </>
  )
}

function PerformanceFields({ row }: { row?: Partial<PerformanceRow> }) {
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

function ManHoursFields({ row, monthly = false }: { row?: Partial<ManHoursRow & MonthlyManHoursRow>; monthly?: boolean }) {
  return (
    <EnterpriseFormGrid>
      <TextField name="workLocation" label="Lokasi kerja" defaultValue={row?.workLocation} />
      <TextField name="employeeCount" label="Jumlah karyawan" type="number" defaultValue={row?.employeeCount ?? 0} />
      {monthly ? <TextField name="month" label="Bulan" type="date" defaultValue={formatDateInput(row?.month ?? null)} /> : null}
      <TextField name="safetyManHours" label="Safety manhours" defaultValue={row?.safetyManHours ?? "0"} />
      {!monthly ? <TextField name="safeTarget" label="Target aman" defaultValue={row?.safeTarget ?? "0"} /> : null}
      {!monthly ? <TextField name="averageWeeklyRevenue" label="Pendapatan rata-rata" defaultValue={row?.averageWeeklyRevenue ?? ""} /> : null}
    </EnterpriseFormGrid>
  )
}

function WeeklyActivityFields({ row }: { row?: Partial<WeeklyActivityRow> }) {
  return (
    <EnterpriseFormGrid>
      <TextField name="activity" label="Kegiatan" defaultValue={row?.activity} />
      <TextField name="activityDate" label="Tanggal" type="date" defaultValue={formatDateInput(row?.activityDate ?? null)} />
      <TextField name="pic" label="PIC" defaultValue={row?.pic} />
      <TextField name="category" label="Kategori" defaultValue={row?.category} />
      <TextField name="imageUrl" label="Image link" defaultValue={row?.imageUrl} />
      <TextField name="evidenceUrl" label="Evidence link" defaultValue={row?.evidenceUrl} />
    </EnterpriseFormGrid>
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

export function CreateIncidentReportButton({ access }: { access: TableRbacAccess }) { return <CreateDialog title="Tambah incident report" access={access} action={manageSafetyIncidentReportAction as unknown as NativeFormAction}><IncidentFields /></CreateDialog> }
export function CreateYearlySummaryButton({ access }: { access: TableRbacAccess }) { return <CreateDialog title="Tambah rekap tahunan" access={access} action={manageSafetyIncidentSummaryYearlyAction as unknown as NativeFormAction}><SummaryFields /></CreateDialog> }
export function CreateMonthlySummaryButton({ access }: { access: TableRbacAccess }) { return <CreateDialog title="Tambah rekap bulanan" access={access} action={manageSafetyIncidentSummaryMonthlyAction as unknown as NativeFormAction}><SummaryFields monthly /></CreateDialog> }
export function CreateCertificationButton({ access }: { access: TableRbacAccess }) { return <CreateDialog title="Tambah sertifikasi" access={access} action={manageSafetyCertificationAction as unknown as NativeFormAction}><CertificationFields /></CreateDialog> }
export function CreatePerformanceButton({ access }: { access: TableRbacAccess }) { return <CreateDialog title="Tambah performance" access={access} action={manageSafetyPerformanceAction as unknown as NativeFormAction}><PerformanceFields /></CreateDialog> }
export function CreateManHoursButton({ access }: { access: TableRbacAccess }) { return <CreateDialog title="Tambah safety manhours" access={access} action={manageSafetyManHoursAction as unknown as NativeFormAction}><ManHoursFields /></CreateDialog> }
export function CreateMonthlyManHoursButton({ access }: { access: TableRbacAccess }) { return <CreateDialog title="Tambah monthly manhours" access={access} action={manageSafetyMonthlyManHoursAction as unknown as NativeFormAction}><ManHoursFields monthly /></CreateDialog> }
export function CreateWeeklyActivityButton({ access }: { access: TableRbacAccess }) { return <CreateDialog title="Tambah weekly activity" access={access} action={manageSafetyWeeklyActivityAction as unknown as NativeFormAction}><WeeklyActivityFields /></CreateDialog> }

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

export function YearlySummaryRowActions({ row, access }: { row: YearlySummaryRow; access: TableRbacAccess }) { return <GenericRowActions access={access} title="Incident yearly summary" deleteLabel={`rekap tahun ${row.year}`} id={row.id} action={manageSafetyIncidentSummaryYearlyAction as unknown as NativeFormAction}><SummaryFields row={row} /></GenericRowActions> }
export function MonthlySummaryRowActions({ row, access }: { row: MonthlySummaryRow; access: TableRbacAccess }) { return <GenericRowActions access={access} title="Incident monthly summary" deleteLabel="rekap bulanan" id={row.id} action={manageSafetyIncidentSummaryMonthlyAction as unknown as NativeFormAction}><SummaryFields row={row} monthly /></GenericRowActions> }
export function IncidentReportRowActions({ row, access }: { row: IncidentRow; access: TableRbacAccess }) { return <GenericRowActions access={access} title="Incident report" deleteLabel={row.workerName || row.category || "incident"} id={row.id} action={manageSafetyIncidentReportAction as unknown as NativeFormAction}><IncidentFields row={row} /></GenericRowActions> }
export function CertificationRowActions({ row, access }: { row: CertificationRow; access: TableRbacAccess }) { return <GenericRowActions access={access} title="Safety certification" deleteLabel={row.equipmentName} id={row.id} action={manageSafetyCertificationAction as unknown as NativeFormAction}><CertificationFields row={row} /></GenericRowActions> }
export function WeeklyActivityRowActions({ row, access }: { row: WeeklyActivityRow; access: TableRbacAccess }) { return <GenericRowActions access={access} title="Weekly activity" deleteLabel={row.activity} id={row.id} action={manageSafetyWeeklyActivityAction as unknown as NativeFormAction}><WeeklyActivityFields row={row} /></GenericRowActions> }
export function PerformanceRowActions({ row, access }: { row: PerformanceRow; access: TableRbacAccess }) { return <GenericRowActions access={access} title="Safety performance" deleteLabel={row.periodLabel} id={row.id} action={manageSafetyPerformanceAction as unknown as NativeFormAction}><PerformanceFields row={row} /></GenericRowActions> }
export function ManHoursRowActions({ row, access }: { row: ManHoursRow; access: TableRbacAccess }) { return <GenericRowActions access={access} title="Safety manhours" deleteLabel={row.workLocation} id={row.id} action={manageSafetyManHoursAction as unknown as NativeFormAction}><ManHoursFields row={row} /></GenericRowActions> }
export function MonthlyManHoursRowActions({ row, access }: { row: MonthlyManHoursRow; access: TableRbacAccess }) { return <GenericRowActions access={access} title="Monthly manhours" deleteLabel={row.workLocation} id={row.id} action={manageSafetyMonthlyManHoursAction as unknown as NativeFormAction}><ManHoursFields row={row} monthly /></GenericRowActions> }
