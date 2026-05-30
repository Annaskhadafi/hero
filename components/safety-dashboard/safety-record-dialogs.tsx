"use client"

import * as React from "react"

import {
  manageSafetyCertificationAction,
  manageSafetyIncidentReportAction,
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

type NativeFormAction = (formData: FormData) => Promise<void>
type TimestampValue = Date | string | null

type IncidentRow = {
  id: number
  workerName: string
  department: string
  incidentDescription: string
  propertyDamage: string
  location: string
  category: string
  incidentDate: TimestampValue
  notes: string
  status: string
}

type CertificationRow = {
  id: number
  equipmentName: string
  picDepartment: string
  workArea: string
  equipmentClassification: string
  certifier: string
  certificationDate: TimestampValue
  nextCertificationDate: TimestampValue
  status: string
  regulation: string
  remarks: string
  workLocation: string
}

type WeeklyActivityRow = {
  id: number
  activity: string
  activityDate: TimestampValue
  pic: string
  category: string
  imageUrl: string
  evidenceUrl: string
}

type PerformanceRow = {
  id: number
  year: number
  periodLabel: string
  employeeCount: number
  safeManHoursUpToYear: string
  fatalityThreshold: string
  fatalityActual: string
  ltiThreshold: string
  ltiActual: string
  propertyDamageThreshold: string
  propertyDamageActual: string
}

type ManHoursRow = {
  id: number
  workLocation: string
  employeeCount: number
  safetyManHours: string
  safeTarget: string
  averageWeeklyRevenue: string | null
}

type MonthlyManHoursRow = {
  id: number
  workLocation: string
  employeeCount: number
  month: TimestampValue
  safetyManHours: string
}

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

function DeleteFooter({ id, action }: { id: number; action: NativeFormAction }) {
  return (
    <form action={action} className="ml-auto flex gap-2">
      <input type="hidden" name="intent" value="delete" />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive">Hapus</Button>
    </form>
  )
}

function SubmitFooter() {
  return <Button type="submit" className="ml-auto">Simpan</Button>
}

function useDialogMode() {
  const [mode, setMode] = React.useState<"view" | "edit" | "delete" | null>(null)
  return { mode, setMode, open: mode != null, onOpenChange: (open: boolean) => !open && setMode(null) }
}

export function IncidentReportRowActions({ row, access }: { row: IncidentRow; access: TableRbacAccess }) {
  const dialog = useDialogMode()
  const action = manageSafetyIncidentReportAction as unknown as NativeFormAction
  return (
    <>
      <EnterpriseActionButtons access={access} onView={() => dialog.setMode("view")} onEdit={() => dialog.setMode("edit")} onDelete={() => dialog.setMode("delete")} />
      <EnterpriseRecordDialog open={dialog.open} onOpenChange={dialog.onOpenChange} title="Incident report" mode={dialog.mode ?? "view"} access={access} footer={dialog.mode === "delete" ? <DeleteFooter id={row.id} action={action} /> : undefined}>
        {dialog.mode === "delete" ? <p className="text-sm text-muted-foreground">Hapus incident report untuk {row.workerName || row.category}?</p> : (
          <form action={action} className="grid gap-4">
            <input type="hidden" name="intent" value={dialog.mode === "edit" ? "update" : "create"} />
            <input type="hidden" name="id" value={row.id} />
            <EnterpriseFormGrid>
              <TextField name="workerName" label="Nama" defaultValue={row.workerName} />
              <TextField name="department" label="Departemen" defaultValue={row.department} />
              <TextField name="propertyDamage" label="Property damage" defaultValue={row.propertyDamage} />
              <TextField name="location" label="Lokasi" defaultValue={row.location} />
              <TextField name="category" label="Category" defaultValue={row.category} />
              <TextField name="incidentDate" label="Tanggal" type="date" defaultValue={formatDateInput(row.incidentDate)} />
              <TextField name="status" label="Status" defaultValue={row.status} />
            </EnterpriseFormGrid>
            <Textarea name="incidentDescription" defaultValue={row.incidentDescription} rows={3} />
            <Textarea name="notes" defaultValue={row.notes} rows={3} />
            {dialog.mode === "edit" ? <SubmitFooter /> : null}
          </form>
        )}
      </EnterpriseRecordDialog>
    </>
  )
}

export function CertificationRowActions({ row, access }: { row: CertificationRow; access: TableRbacAccess }) {
  const dialog = useDialogMode()
  const action = manageSafetyCertificationAction as unknown as NativeFormAction
  return (
    <>
      <EnterpriseActionButtons access={access} onView={() => dialog.setMode("view")} onEdit={() => dialog.setMode("edit")} onDelete={() => dialog.setMode("delete")} />
      <EnterpriseRecordDialog open={dialog.open} onOpenChange={dialog.onOpenChange} title="Safety certification" mode={dialog.mode ?? "view"} access={access} footer={dialog.mode === "delete" ? <DeleteFooter id={row.id} action={action} /> : undefined}>
        {dialog.mode === "delete" ? <p className="text-sm text-muted-foreground">Hapus sertifikasi {row.equipmentName}?</p> : (
          <form action={action} className="grid gap-4">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={row.id} />
            <EnterpriseFormGrid>
              <TextField name="equipmentName" label="Nama alat" defaultValue={row.equipmentName} />
              <TextField name="picDepartment" label="PIC dept/sec" defaultValue={row.picDepartment} />
              <TextField name="workArea" label="Area kerja" defaultValue={row.workArea} />
              <TextField name="equipmentClassification" label="Klasifikasi" defaultValue={row.equipmentClassification} />
              <TextField name="certifier" label="Sertifikator" defaultValue={row.certifier} />
              <TextField name="certificationDate" label="Waktu sertifikasi" type="date" defaultValue={formatDateInput(row.certificationDate)} />
              <TextField name="nextCertificationDate" label="Next sert." type="date" defaultValue={formatDateInput(row.nextCertificationDate)} />
              <TextField name="status" label="Status" defaultValue={row.status} />
              <TextField name="regulation" label="Regulasi" defaultValue={row.regulation} />
              <TextField name="workLocation" label="Lokasi kerja" defaultValue={row.workLocation} />
            </EnterpriseFormGrid>
            <Textarea name="remarks" defaultValue={row.remarks} rows={3} />
            {dialog.mode === "edit" ? <SubmitFooter /> : null}
          </form>
        )}
      </EnterpriseRecordDialog>
    </>
  )
}

export function WeeklyActivityRowActions({ row, access }: { row: WeeklyActivityRow; access: TableRbacAccess }) {
  const dialog = useDialogMode()
  const action = manageSafetyWeeklyActivityAction as unknown as NativeFormAction
  return (
    <>
      <EnterpriseActionButtons access={access} onView={() => dialog.setMode("view")} onEdit={() => dialog.setMode("edit")} onDelete={() => dialog.setMode("delete")} />
      <EnterpriseRecordDialog open={dialog.open} onOpenChange={dialog.onOpenChange} title="Weekly activity" mode={dialog.mode ?? "view"} access={access} footer={dialog.mode === "delete" ? <DeleteFooter id={row.id} action={action} /> : undefined}>
        {dialog.mode === "delete" ? <p className="text-sm text-muted-foreground">Hapus aktivitas {row.activity}?</p> : (
          <form action={action} className="grid gap-4">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={row.id} />
            <EnterpriseFormGrid>
              <TextField name="activity" label="Kegiatan" defaultValue={row.activity} />
              <TextField name="activityDate" label="Tanggal" type="date" defaultValue={formatDateInput(row.activityDate)} />
              <TextField name="pic" label="PIC" defaultValue={row.pic} />
              <TextField name="category" label="Kategori" defaultValue={row.category} />
              <TextField name="imageUrl" label="Image link" defaultValue={row.imageUrl} />
              <TextField name="evidenceUrl" label="Evidence link" defaultValue={row.evidenceUrl} />
            </EnterpriseFormGrid>
            {dialog.mode === "edit" ? <SubmitFooter /> : null}
          </form>
        )}
      </EnterpriseRecordDialog>
    </>
  )
}

export function PerformanceRowActions({ row, access }: { row: PerformanceRow; access: TableRbacAccess }) {
  const dialog = useDialogMode()
  const action = manageSafetyPerformanceAction as unknown as NativeFormAction
  return (
    <>
      <EnterpriseActionButtons access={access} onEdit={() => dialog.setMode("edit")} onDelete={() => dialog.setMode("delete")} />
      <EnterpriseRecordDialog open={dialog.open} onOpenChange={dialog.onOpenChange} title="Safety performance" mode={dialog.mode ?? "edit"} access={access} footer={dialog.mode === "delete" ? <DeleteFooter id={row.id} action={action} /> : undefined}>
        {dialog.mode === "delete" ? <p className="text-sm text-muted-foreground">Hapus metric {row.periodLabel}?</p> : (
          <form action={action} className="grid gap-4">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={row.id} />
            <EnterpriseFormGrid>
              <TextField name="year" label="Tahun" type="number" defaultValue={row.year} />
              <TextField name="periodLabel" label="Periode/site" defaultValue={row.periodLabel} />
              <TextField name="employeeCount" label="Jumlah karyawan" type="number" defaultValue={row.employeeCount} />
              <TextField name="safeManHoursUpToYear" label="Safe manhours" defaultValue={row.safeManHoursUpToYear} />
              <TextField name="fatalityThreshold" label="Fatality threshold" defaultValue={row.fatalityThreshold} />
              <TextField name="fatalityActual" label="Fatality actual" defaultValue={row.fatalityActual} />
              <TextField name="ltiThreshold" label="LTI threshold" defaultValue={row.ltiThreshold} />
              <TextField name="ltiActual" label="LTI actual" defaultValue={row.ltiActual} />
              <TextField name="propertyDamageThreshold" label="PD threshold" defaultValue={row.propertyDamageThreshold} />
              <TextField name="propertyDamageActual" label="PD actual" defaultValue={row.propertyDamageActual} />
            </EnterpriseFormGrid>
            <SubmitFooter />
          </form>
        )}
      </EnterpriseRecordDialog>
    </>
  )
}

export function ManHoursRowActions({ row, access }: { row: ManHoursRow; access: TableRbacAccess }) {
  const dialog = useDialogMode()
  const action = manageSafetyManHoursAction as unknown as NativeFormAction
  return (
    <>
      <EnterpriseActionButtons access={access} onEdit={() => dialog.setMode("edit")} onDelete={() => dialog.setMode("delete")} />
      <EnterpriseRecordDialog open={dialog.open} onOpenChange={dialog.onOpenChange} title="Safety manhours" mode={dialog.mode ?? "edit"} access={access} footer={dialog.mode === "delete" ? <DeleteFooter id={row.id} action={action} /> : undefined}>
        {dialog.mode === "delete" ? <p className="text-sm text-muted-foreground">Hapus manhours {row.workLocation}?</p> : (
          <form action={action} className="grid gap-4">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={row.id} />
            <EnterpriseFormGrid>
              <TextField name="workLocation" label="Lokasi kerja" defaultValue={row.workLocation} />
              <TextField name="employeeCount" label="Jumlah karyawan" type="number" defaultValue={row.employeeCount} />
              <TextField name="safetyManHours" label="Safety manhours" defaultValue={row.safetyManHours} />
              <TextField name="safeTarget" label="Target aman" defaultValue={row.safeTarget} />
              <TextField name="averageWeeklyRevenue" label="Pendapatan rata-rata" defaultValue={row.averageWeeklyRevenue} />
            </EnterpriseFormGrid>
            <SubmitFooter />
          </form>
        )}
      </EnterpriseRecordDialog>
    </>
  )
}

export function MonthlyManHoursRowActions({ row, access }: { row: MonthlyManHoursRow; access: TableRbacAccess }) {
  const dialog = useDialogMode()
  const action = manageSafetyMonthlyManHoursAction as unknown as NativeFormAction
  return (
    <>
      <EnterpriseActionButtons access={access} onEdit={() => dialog.setMode("edit")} onDelete={() => dialog.setMode("delete")} />
      <EnterpriseRecordDialog open={dialog.open} onOpenChange={dialog.onOpenChange} title="Monthly manhours" mode={dialog.mode ?? "edit"} access={access} footer={dialog.mode === "delete" ? <DeleteFooter id={row.id} action={action} /> : undefined}>
        {dialog.mode === "delete" ? <p className="text-sm text-muted-foreground">Hapus monthly manhours {row.workLocation}?</p> : (
          <form action={action} className="grid gap-4">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={row.id} />
            <EnterpriseFormGrid>
              <TextField name="workLocation" label="Lokasi kerja" defaultValue={row.workLocation} />
              <TextField name="employeeCount" label="Jumlah karyawan" type="number" defaultValue={row.employeeCount} />
              <TextField name="month" label="Bulan" type="date" defaultValue={formatDateInput(row.month)} />
              <TextField name="safetyManHours" label="Safety manhours" defaultValue={row.safetyManHours} />
            </EnterpriseFormGrid>
            <SubmitFooter />
          </form>
        )}
      </EnterpriseRecordDialog>
    </>
  )
}
