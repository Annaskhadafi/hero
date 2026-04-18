import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import {
  manageAttendanceRecordAction,
  manageDailyReportAction,
  manageHseIncidentAction,
  manageHseObservationAction,
  managePointEventAction,
  manageTimesheetEntryAction,
  manageTrainingRecordAction,
  manageWellnessRecordAction,
  type AdminMutationState,
} from "@/app/dashboard/admin-actions";

type CrudAction = (formData: FormData) => Promise<AdminMutationState>;
type NativeFormAction = (formData: FormData) => Promise<void>;

type EmployeeOption = {
  id: number;
  name: string;
  role: string;
  email: string;
  siteId: number;
};

type SiteOption = {
  id: number;
  name: string;
  customerName: string;
};

type TimestampValue = Date | string | null | undefined;

type HseObservationRow = {
  id: number;
  siteId: number;
  employeeId: number | null;
  category: string;
  title: string;
  location: string;
  severity: string;
  status: string;
  notes: string;
  observedAt: TimestampValue;
};

type HseIncidentRow = {
  id: number;
  siteId: number;
  type: string;
  title: string;
  unitNumber: string;
  impact: string;
  status: string;
  reportedAt: TimestampValue;
};

type AttendanceRow = {
  id: number;
  employeeId: number;
  siteId: number;
  eventType: string;
  eventTime: TimestampValue;
  status: string;
  locationNote: string;
  photoUrl: string | null;
  latitude: string | null;
  longitude: string | null;
};

type TrainingRow = {
  id: number;
  employeeId: number;
  trainingName: string;
  provider: string;
  expiresAt: TimestampValue;
  status: string;
};

type WellnessRow = {
  id: number;
  employeeId: number;
  metricType: string;
  metricValue: string;
  status: string;
  notes: string;
  recordedAt: TimestampValue;
};

type TimesheetRow = {
  id: number;
  employeeId: number;
  siteId: number;
  periodLabel: string;
  regularMinutes: number;
  overtimeMinutes: number;
  overtimeAmount: number;
  status: string;
};

type DailyReportRow = {
  id: number;
  siteId: number;
  reportDate: TimestampValue;
  customerName: string;
  totalSections: number;
  readySections: number;
  jobsCompleted: number;
  manpowerPresent: number;
  hseSummary: string;
  status: string;
};

type PointEventRow = {
  id: number;
  employeeId: number;
  category: string;
  label: string;
  points: number;
};

function formatDateTimeInput(value: TimestampValue) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDateInput(value: TimestampValue) {
  return formatDateTimeInput(value).slice(0, 10);
}

function SelectField({
  name,
  label,
  children,
  defaultValue,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
      >
        {children}
      </select>
    </label>
  );
}

function TextField({
  name,
  label,
  placeholder,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  defaultValue?: string | number;
}) {
  return (
    <Label className="grid gap-2 text-sm font-medium">
      {label}
      <Input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} />
    </Label>
  );
}

function EmployeeOptions({ employees }: { employees: EmployeeOption[] }) {
  return (
    <>
      <option value="">Pilih karyawan</option>
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.name} - {employee.role}
        </option>
      ))}
    </>
  );
}

function SiteOptions({ sites }: { sites: SiteOption[] }) {
  return (
    <>
      <option value="">Pilih site</option>
      {sites.map((site) => (
        <option key={site.id} value={site.id}>
          {site.name}
        </option>
      ))}
    </>
  );
}

function CrudFormCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action: CrudAction;
  children: React.ReactNode;
}) {
  const formAction = action as unknown as NativeFormAction;

  return (
    <Card className="rounded-lg border border-border bg-card p-0 shadow-sm">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/45">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
              <Plus className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate font-display text-base font-semibold tracking-normal">
              Tambah {title}
            </span>
          </span>
          <span className="rounded-lg bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            Create
          </span>
        </summary>
        <form action={formAction} className="grid gap-4 border-t border-border/70 px-4 py-4">
          <input type="hidden" name="intent" value="create" />
          <p className="sr-only">{description}</p>
          {children}
          <Button type="submit" className="w-fit rounded-lg">
            Simpan data
          </Button>
        </form>
      </details>
    </Card>
  );
}

export function RowStatusDeleteActions({
  id,
  action,
  statusOptions,
  currentStatus,
  deleteLabel = "Hapus",
}: {
  id: number;
  action: CrudAction;
  statusOptions: string[];
  currentStatus: string;
  deleteLabel?: string;
}) {
  const formAction = action as unknown as NativeFormAction;

  return (
    <div className="flex min-w-[220px] flex-wrap gap-2">
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="intent" value="update-status" />
        <input type="hidden" name="id" value={id} />
        <select
          name="status"
          defaultValue={currentStatus}
          className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline" className="h-9 rounded-lg px-3">
          Update
        </Button>
      </form>
      <form action={formAction}>
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={id} />
        <Button type="submit" size="sm" variant="outline" className="h-9 rounded-lg px-3 text-red-600">
          {deleteLabel}
        </Button>
      </form>
    </div>
  );
}

function RowEditShell({
  id,
  title = "Edit Detail",
  action,
  children,
}: {
  id: number;
  title?: string;
  action: CrudAction;
  children: React.ReactNode;
}) {
  const formAction = action as unknown as NativeFormAction;

  return (
    <details className="min-w-[280px] rounded-lg border border-input bg-background p-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {title}
      </summary>
      <form action={formAction} className="mt-3 grid gap-3">
        <input type="hidden" name="intent" value="update" />
        <input type="hidden" name="id" value={id} />
        {children}
        <Button type="submit" size="sm" className="h-9 w-fit rounded-lg px-3">
          Simpan Detail
        </Button>
      </form>
    </details>
  );
}

function PointDeleteAction({ id }: { id: number }) {
  const formAction = managePointEventAction as unknown as NativeFormAction;

  return (
    <form action={formAction}>
      <input type="hidden" name="intent" value="delete" />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" className="h-9 rounded-lg px-3 text-red-600">
        Hapus
      </Button>
    </form>
  );
}

export function HseObservationRowActions({
  row,
  employees,
  sites,
}: {
  row: HseObservationRow;
  employees: EmployeeOption[];
  sites: SiteOption[];
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageHseObservationAction}
        statusOptions={hseObservationStatusOptions}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageHseObservationAction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="siteId" label="Site" defaultValue={`${row.siteId}`}>
            <SiteOptions sites={sites} />
          </SelectField>
          <SelectField
            name="employeeId"
            label="Reporter"
            defaultValue={row.employeeId ? `${row.employeeId}` : "none"}
          >
            <option value="none">Tanpa reporter</option>
            <EmployeeOptions employees={employees} />
          </SelectField>
          <TextField name="category" label="Kategori" defaultValue={row.category} />
          <TextField name="severity" label="Severity" defaultValue={row.severity} />
          <TextField name="title" label="Judul" defaultValue={row.title} />
          <TextField name="location" label="Lokasi" defaultValue={row.location} />
          <TextField name="observedAt" label="Waktu observasi" type="datetime-local" defaultValue={formatDateTimeInput(row.observedAt)} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {hseObservationStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
        </div>
        <Textarea name="notes" defaultValue={row.notes} rows={3} />
      </RowEditShell>
    </div>
  );
}

export function HseIncidentRowActions({
  row,
  sites,
}: {
  row: HseIncidentRow;
  sites: SiteOption[];
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageHseIncidentAction}
        statusOptions={hseIncidentStatusOptions}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageHseIncidentAction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="siteId" label="Site" defaultValue={`${row.siteId}`}>
            <SiteOptions sites={sites} />
          </SelectField>
          <TextField name="type" label="Tipe" defaultValue={row.type} />
          <TextField name="title" label="Judul" defaultValue={row.title} />
          <TextField name="unitNumber" label="Unit / Area" defaultValue={row.unitNumber} />
          <TextField name="reportedAt" label="Waktu laporan" type="datetime-local" defaultValue={formatDateTimeInput(row.reportedAt)} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {hseIncidentStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
        </div>
        <Textarea name="impact" defaultValue={row.impact} rows={3} />
      </RowEditShell>
    </div>
  );
}

export function AttendanceRowActions({
  row,
  employees,
  sites,
}: {
  row: AttendanceRow;
  employees: EmployeeOption[];
  sites: SiteOption[];
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageAttendanceRecordAction}
        statusOptions={attendanceStatusOptions}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageAttendanceRecordAction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="employeeId" label="Karyawan" defaultValue={`${row.employeeId}`}>
            <EmployeeOptions employees={employees} />
          </SelectField>
          <SelectField name="siteId" label="Site" defaultValue={`${row.siteId}`}>
            <SiteOptions sites={sites} />
          </SelectField>
          <SelectField name="eventType" label="Event" defaultValue={row.eventType}>
            <option value="checked-in">Clock In</option>
            <option value="checked-out">Clock Out</option>
          </SelectField>
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {attendanceStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
          <TextField name="eventTime" label="Waktu" type="datetime-local" defaultValue={formatDateTimeInput(row.eventTime)} />
          <TextField name="locationNote" label="Lokasi / Catatan" defaultValue={row.locationNote} />
          <TextField name="latitude" label="Latitude" defaultValue={row.latitude ?? ""} />
          <TextField name="longitude" label="Longitude" defaultValue={row.longitude ?? ""} />
          <TextField name="photoUrl" label="URL foto" defaultValue={row.photoUrl ?? ""} />
        </div>
      </RowEditShell>
    </div>
  );
}

export function TrainingRowActions({
  row,
  employees,
}: {
  row: TrainingRow;
  employees: EmployeeOption[];
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageTrainingRecordAction}
        statusOptions={trainingStatusOptions}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageTrainingRecordAction}>
        <SelectField name="employeeId" label="Karyawan" defaultValue={`${row.employeeId}`}>
          <EmployeeOptions employees={employees} />
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="trainingName" label="Training" defaultValue={row.trainingName} />
          <TextField name="provider" label="Provider" defaultValue={row.provider} />
          <TextField name="expiresAt" label="Tanggal expiry" type="date" defaultValue={formatDateInput(row.expiresAt)} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {trainingStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
        </div>
      </RowEditShell>
    </div>
  );
}

export function WellnessRowActions({
  row,
  employees,
}: {
  row: WellnessRow;
  employees: EmployeeOption[];
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageWellnessRecordAction}
        statusOptions={wellnessStatusOptions}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageWellnessRecordAction}>
        <SelectField name="employeeId" label="Karyawan" defaultValue={`${row.employeeId}`}>
          <EmployeeOptions employees={employees} />
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="metricType" label="Metrik" defaultValue={row.metricType} />
          <TextField name="metricValue" label="Nilai" defaultValue={row.metricValue} />
          <TextField name="recordedAt" label="Waktu catat" type="datetime-local" defaultValue={formatDateTimeInput(row.recordedAt)} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {wellnessStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
        </div>
        <Textarea name="notes" defaultValue={row.notes} rows={3} />
      </RowEditShell>
    </div>
  );
}

export function TimesheetRowActions({
  row,
  employees,
  sites,
}: {
  row: TimesheetRow;
  employees: EmployeeOption[];
  sites: SiteOption[];
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageTimesheetEntryAction}
        statusOptions={timesheetStatusOptions}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageTimesheetEntryAction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="employeeId" label="Karyawan" defaultValue={`${row.employeeId}`}>
            <EmployeeOptions employees={employees} />
          </SelectField>
          <SelectField name="siteId" label="Site" defaultValue={`${row.siteId}`}>
            <SiteOptions sites={sites} />
          </SelectField>
          <TextField name="periodLabel" label="Periode" defaultValue={row.periodLabel} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {timesheetStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
          <TextField name="regularMinutes" label="Menit reguler" type="number" defaultValue={row.regularMinutes} />
          <TextField name="overtimeMinutes" label="Menit lembur" type="number" defaultValue={row.overtimeMinutes} />
          <TextField name="overtimeAmount" label="Nilai lembur" type="number" defaultValue={row.overtimeAmount} />
        </div>
      </RowEditShell>
    </div>
  );
}

export function DailyReportRowActions({
  row,
  sites,
}: {
  row: DailyReportRow;
  sites: SiteOption[];
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageDailyReportAction}
        statusOptions={dailyReportStatusOptions}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageDailyReportAction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="siteId" label="Site" defaultValue={`${row.siteId}`}>
            <SiteOptions sites={sites} />
          </SelectField>
          <TextField name="reportDate" label="Tanggal report" type="date" defaultValue={formatDateInput(row.reportDate)} />
          <TextField name="customerName" label="Customer" defaultValue={row.customerName} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {dailyReportStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
          <TextField name="totalSections" label="Total section" type="number" defaultValue={row.totalSections} />
          <TextField name="readySections" label="Section siap" type="number" defaultValue={row.readySections} />
          <TextField name="jobsCompleted" label="Job selesai" type="number" defaultValue={row.jobsCompleted} />
          <TextField name="manpowerPresent" label="Manpower hadir" type="number" defaultValue={row.manpowerPresent} />
        </div>
        <Textarea name="hseSummary" defaultValue={row.hseSummary} rows={3} />
      </RowEditShell>
    </div>
  );
}

export function PointEventRowActions({
  row,
  employees,
}: {
  row: PointEventRow;
  employees: EmployeeOption[];
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <div className="flex flex-wrap gap-2">
        <PointDeleteAction id={row.id} />
      </div>
      <RowEditShell id={row.id} action={managePointEventAction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="employeeId" label="Karyawan" defaultValue={`${row.employeeId}`}>
            <EmployeeOptions employees={employees} />
          </SelectField>
          <TextField name="category" label="Kategori" defaultValue={row.category} />
          <TextField name="label" label="Label" defaultValue={row.label} />
          <TextField name="points" label="Poin" type="number" defaultValue={row.points} />
        </div>
      </RowEditShell>
    </div>
  );
}

export function HseCrudForms({
  employees,
  sites,
}: {
  employees: EmployeeOption[];
  sites: SiteOption[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <CrudFormCard
        title="Observasi HSE"
        description="Catat unsafe act, unsafe condition, patrol finding, atau tindakan korektif."
        action={manageHseObservationAction}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="siteId" label="Site">
            <SiteOptions sites={sites} />
          </SelectField>
          <SelectField name="employeeId" label="Reporter">
            <option value="none">Tanpa reporter</option>
            <EmployeeOptions employees={employees} />
          </SelectField>
          <TextField name="category" label="Kategori" placeholder="Unsafe condition" />
          <TextField name="severity" label="Severity" placeholder="Low / Medium / High" defaultValue="Low" />
          <TextField name="title" label="Judul" placeholder="Temuan area kerja" />
          <TextField name="location" label="Lokasi" placeholder="Workshop / pit / office" />
          <TextField name="observedAt" label="Waktu observasi" type="datetime-local" />
          <SelectField name="status" label="Status" defaultValue="open">
            <option value="open">Open</option>
            <option value="action_taken">Action Taken</option>
            <option value="closed">Closed</option>
          </SelectField>
        </div>
        <Textarea name="notes" placeholder="Catatan temuan dan tindakan awal" rows={3} />
      </CrudFormCard>

      <CrudFormCard
        title="Incident HSE"
        description="Catat incident recordable, near miss, property damage, atau investigasi."
        action={manageHseIncidentAction}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="siteId" label="Site">
            <SiteOptions sites={sites} />
          </SelectField>
          <TextField name="type" label="Tipe" placeholder="Near miss / property damage" />
          <TextField name="title" label="Judul" placeholder="Ringkasan incident" />
          <TextField name="unitNumber" label="Unit / Area" placeholder="Unit-001" defaultValue="-" />
          <TextField name="reportedAt" label="Waktu laporan" type="datetime-local" />
          <SelectField name="status" label="Status" defaultValue="investigating">
            <option value="investigating">Investigating</option>
            <option value="closed">Closed</option>
            <option value="open">Open</option>
          </SelectField>
        </div>
        <Textarea name="impact" placeholder="Dampak dan tindak lanjut awal" rows={3} />
      </CrudFormCard>
    </div>
  );
}

export function HcCrudForms({
  employees,
  sites,
}: {
  employees: EmployeeOption[];
  sites: SiteOption[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <CrudFormCard
        title="Attendance Manual"
        description="Tambah atau koreksi record attendance dari sisi admin."
        action={manageAttendanceRecordAction}
      >
        <SelectField name="employeeId" label="Karyawan">
          <EmployeeOptions employees={employees} />
        </SelectField>
        <SelectField name="siteId" label="Site">
          <SiteOptions sites={sites} />
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="eventType" label="Event" defaultValue="checked-in">
            <option value="checked-in">Clock In</option>
            <option value="checked-out">Clock Out</option>
          </SelectField>
          <SelectField name="status" label="Status" defaultValue="verified">
            <option value="verified">Verified</option>
            <option value="needs_review">Needs Review</option>
            <option value="overtime">Overtime</option>
          </SelectField>
          <TextField name="eventTime" label="Waktu" type="datetime-local" />
          <TextField name="locationNote" label="Lokasi / Catatan" placeholder="GPS / area kerja" />
          <TextField name="latitude" label="Latitude" placeholder="Opsional" />
          <TextField name="longitude" label="Longitude" placeholder="Opsional" />
        </div>
      </CrudFormCard>

      <CrudFormCard
        title="Training Record"
        description="Catat sertifikasi, expiry, dan status training karyawan."
        action={manageTrainingRecordAction}
      >
        <SelectField name="employeeId" label="Karyawan">
          <EmployeeOptions employees={employees} />
        </SelectField>
        <TextField name="trainingName" label="Training" placeholder="Nama training / sertifikasi" />
        <TextField name="provider" label="Provider" placeholder="Provider training" />
        <TextField name="expiresAt" label="Tanggal expiry" type="date" />
        <SelectField name="status" label="Status" defaultValue="active">
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="urgent">Urgent</option>
        </SelectField>
      </CrudFormCard>

      <CrudFormCard
        title="Wellness Record"
        description="Catat hasil fit-to-work, MCU, BMI, atau follow-up kesehatan."
        action={manageWellnessRecordAction}
      >
        <SelectField name="employeeId" label="Karyawan">
          <EmployeeOptions employees={employees} />
        </SelectField>
        <TextField name="metricType" label="Metrik" placeholder="Fit for Work / MCU / BMI" />
        <TextField name="metricValue" label="Nilai" placeholder="Fit / 24.1 / normal" />
        <TextField name="recordedAt" label="Waktu catat" type="datetime-local" />
        <SelectField name="status" label="Status" defaultValue="healthy">
          <option value="healthy">Healthy</option>
          <option value="follow_up">Follow Up</option>
          <option value="attention">Attention</option>
        </SelectField>
        <Textarea name="notes" placeholder="Catatan HC/wellness" rows={3} />
      </CrudFormCard>
    </div>
  );
}

export function TimesheetCrudForm({
  employees,
  sites,
}: {
  employees: EmployeeOption[];
  sites: SiteOption[];
}) {
  return (
    <CrudFormCard
      title="Timesheet Entry"
      description="Tambah jam reguler, jam lembur, estimasi nilai lembur, dan status payroll."
      action={manageTimesheetEntryAction}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <SelectField name="employeeId" label="Karyawan">
          <EmployeeOptions employees={employees} />
        </SelectField>
        <SelectField name="siteId" label="Site">
          <SiteOptions sites={sites} />
        </SelectField>
        <TextField name="periodLabel" label="Periode" placeholder="April 2026 - Week 3" />
        <SelectField name="status" label="Status" defaultValue="pending">
          <option value="pending">Pending</option>
          <option value="ready_for_payroll">Ready for Payroll</option>
          <option value="needs_correction">Needs Correction</option>
        </SelectField>
        <TextField name="regularMinutes" label="Menit reguler" type="number" defaultValue={480} />
        <TextField name="overtimeMinutes" label="Menit lembur" type="number" defaultValue={0} />
        <TextField name="overtimeAmount" label="Nilai lembur" type="number" defaultValue={0} />
      </div>
    </CrudFormCard>
  );
}

export function DailyReportCrudForm({ sites }: { sites: SiteOption[] }) {
  return (
    <CrudFormCard
      title="Daily Report"
      description="Tambah report harian customer dengan readiness section, manpower, pekerjaan, dan HSE summary."
      action={manageDailyReportAction}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <SelectField name="siteId" label="Site">
          <SiteOptions sites={sites} />
        </SelectField>
        <TextField name="reportDate" label="Tanggal report" type="date" />
        <TextField name="customerName" label="Customer" placeholder="Nama customer" />
        <SelectField name="status" label="Status" defaultValue="draft">
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="sent">Sent</option>
        </SelectField>
        <TextField name="totalSections" label="Total section" type="number" defaultValue={4} />
        <TextField name="readySections" label="Section siap" type="number" defaultValue={0} />
        <TextField name="jobsCompleted" label="Job selesai" type="number" defaultValue={0} />
        <TextField name="manpowerPresent" label="Manpower hadir" type="number" defaultValue={0} />
      </div>
      <Textarea name="hseSummary" placeholder="Ringkasan HSE untuk report" rows={3} />
    </CrudFormCard>
  );
}

export function PointEventCrudForm({ employees }: { employees: EmployeeOption[] }) {
  return (
    <CrudFormCard
      title="Point Event"
      description="Tambah adjustment poin, reward, penalty, atau bonus performa karyawan."
      action={managePointEventAction}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <SelectField name="employeeId" label="Karyawan">
          <EmployeeOptions employees={employees} />
        </SelectField>
        <TextField name="category" label="Kategori" placeholder="Manual Adjustment" />
        <TextField name="label" label="Label" placeholder="Bonus kedisiplinan" />
        <TextField name="points" label="Poin" type="number" defaultValue={5} />
      </div>
    </CrudFormCard>
  );
}

export const hseObservationStatusOptions = ["open", "action_taken", "closed"];
export const hseIncidentStatusOptions = ["open", "investigating", "closed"];
export const attendanceStatusOptions = ["verified", "needs_review", "overtime"];
export const trainingStatusOptions = ["active", "expiring_soon", "urgent"];
export const wellnessStatusOptions = ["healthy", "follow_up", "attention"];
export const timesheetStatusOptions = ["pending", "ready_for_payroll", "needs_correction"];
export const dailyReportStatusOptions = ["draft", "ready", "sent"];
