import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  createPenaltyEvent,
  resolveDisputeAction,
  manageWellnessRecordAction,
  type AdminMutationState,
} from "@/app/dashboard/admin-actions";
import type { MasterCategoryOptionMap } from "@/lib/master-categories";

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
  completedYear: number;
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

type CategoryType =
  | "point_event_category"
  | "hse_observation_category"
  | "hse_incident_type"
  | "hse_severity"
  | "hse_observation_status"
  | "hse_incident_status"
  | "attendance_event_type"
  | "attendance_status"
  | "training_status"
  | "wellness_metric_type"
  | "wellness_status"
  | "timesheet_status"
  | "daily_report_status";

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

function getCategoryOptions(
  categoryOptions: MasterCategoryOptionMap | undefined,
  type: CategoryType,
  fallback: Array<{ code: string; label: string }>,
) {
  const options = categoryOptions?.[type]?.filter((option) => option.isActive) ?? [];

  if (options.length === 0) {
    return fallback;
  }

  return options.map((option) => ({
    code: option.code,
    label: option.label,
  }));
}

function CategorySelectField({
  name,
  label,
  type,
  defaultValue,
  categoryOptions,
  fallback,
}: {
  name: string;
  label: string;
  type: CategoryType;
  defaultValue?: string;
  categoryOptions?: MasterCategoryOptionMap;
  fallback: Array<{ code: string; label: string }>;
}) {
  const options = getCategoryOptions(categoryOptions, type, fallback);
  const hasCurrentValue = defaultValue ? options.some((option) => option.code === defaultValue) : true;

  return (
    <SelectField name={name} label={label} defaultValue={defaultValue}>
      {!hasCurrentValue && defaultValue ? (
        <option value={defaultValue}>{defaultValue}</option>
      ) : null}
      {options.map((option) => (
        <option key={`${type}-${option.code}`} value={option.code}>
          {option.label}
        </option>
      ))}
    </SelectField>
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
  triggerLabel,
}: {
  title: string;
  description: string;
  action: CrudAction;
  children: React.ReactNode;
  triggerLabel?: string;
}) {
  const formAction = action as unknown as NativeFormAction;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="dense" className="rounded-lg px-3">
          <Plus className="size-4" aria-hidden="true" />
          {triggerLabel ?? `Tambah ${title}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto rounded-[1.4rem] border-0 bg-surface-bright p-0 shadow-[0_24px_70px_rgba(8,32,51,0.22)]">
        <Card className="border-0 bg-transparent p-0 shadow-none">
          <DialogHeader className="space-y-3 px-6 pb-0 pt-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Plus className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="font-display text-xl font-semibold tracking-normal text-foreground">
                  Tambah {title}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form action={formAction} className="grid gap-4 px-6 py-6">
            <input type="hidden" name="intent" value="create" />
            {children}
            <div className="flex justify-end">
              <Button type="submit" className="rounded-xl px-5">
                Simpan data
              </Button>
            </div>
          </form>
        </Card>
      </DialogContent>
    </Dialog>
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
  categoryOptions,
}: {
  row: HseObservationRow;
  employees: EmployeeOption[];
  sites: SiteOption[];
  categoryOptions?: MasterCategoryOptionMap;
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageHseObservationAction}
        statusOptions={getCategoryOptions(categoryOptions, "hse_observation_status", hseObservationStatusOptions.map((status) => ({ code: status, label: status }))).map((status) => status.code)}
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
          <CategorySelectField
            name="category"
            label="Kategori"
            type="hse_observation_category"
            defaultValue={row.category}
            categoryOptions={categoryOptions}
            fallback={[
              { code: "Unsafe condition", label: "Unsafe condition" },
              { code: "Unsafe act", label: "Unsafe act" },
              { code: "Observation", label: "Observation" },
            ]}
          />
          <CategorySelectField
            name="severity"
            label="Severity"
            type="hse_severity"
            defaultValue={row.severity}
            categoryOptions={categoryOptions}
            fallback={[
              { code: "Low", label: "Low" },
              { code: "Medium", label: "Medium" },
              { code: "High", label: "High" },
              { code: "Critical", label: "Critical" },
            ]}
          />
          <TextField name="title" label="Judul" defaultValue={row.title} />
          <TextField name="location" label="Lokasi" defaultValue={row.location} />
          <TextField name="observedAt" label="Waktu observasi" type="datetime-local" defaultValue={formatDateTimeInput(row.observedAt)} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {getCategoryOptions(
              categoryOptions,
              "hse_observation_status",
              hseObservationStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
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
  categoryOptions,
}: {
  row: HseIncidentRow;
  sites: SiteOption[];
  categoryOptions?: MasterCategoryOptionMap;
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageHseIncidentAction}
        statusOptions={getCategoryOptions(categoryOptions, "hse_incident_status", hseIncidentStatusOptions.map((status) => ({ code: status, label: status }))).map((status) => status.code)}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageHseIncidentAction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="siteId" label="Site" defaultValue={`${row.siteId}`}>
            <SiteOptions sites={sites} />
          </SelectField>
          <CategorySelectField
            name="type"
            label="Tipe"
            type="hse_incident_type"
            defaultValue={row.type}
            categoryOptions={categoryOptions}
            fallback={[
              { code: "Near miss", label: "Near miss" },
              { code: "Property damage", label: "Property damage" },
              { code: "Incident", label: "Incident" },
            ]}
          />
          <TextField name="title" label="Judul" defaultValue={row.title} />
          <TextField name="unitNumber" label="Unit / Area" defaultValue={row.unitNumber} />
          <TextField name="reportedAt" label="Waktu laporan" type="datetime-local" defaultValue={formatDateTimeInput(row.reportedAt)} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {getCategoryOptions(
              categoryOptions,
              "hse_incident_status",
              hseIncidentStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
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
  categoryOptions,
}: {
  row: AttendanceRow;
  employees: EmployeeOption[];
  sites: SiteOption[];
  categoryOptions?: MasterCategoryOptionMap;
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageAttendanceRecordAction}
        statusOptions={getCategoryOptions(categoryOptions, "attendance_status", attendanceStatusOptions.map((status) => ({ code: status, label: status }))).map((status) => status.code)}
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
          <CategorySelectField
            name="eventType"
            label="Event"
            type="attendance_event_type"
            defaultValue={row.eventType}
            categoryOptions={categoryOptions}
            fallback={[
              { code: "checked-in", label: "Clock In" },
              { code: "checked-out", label: "Clock Out" },
            ]}
          />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {getCategoryOptions(
              categoryOptions,
              "attendance_status",
              attendanceStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
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
  categoryOptions,
}: {
  row: TrainingRow;
  employees: EmployeeOption[];
  categoryOptions?: MasterCategoryOptionMap;
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageTrainingRecordAction}
        statusOptions={getCategoryOptions(categoryOptions, "training_status", trainingStatusOptions.map((status) => ({ code: status, label: status }))).map((status) => status.code)}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageTrainingRecordAction}>
        <SelectField name="employeeId" label="Karyawan" defaultValue={`${row.employeeId}`}>
          <EmployeeOptions employees={employees} />
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="trainingName" label="Training" defaultValue={row.trainingName} />
          <TextField name="provider" label="Provider" defaultValue={row.provider} />
          <TextField name="completedYear" label="Tahun selesai" type="number" defaultValue={row.completedYear} />
          <TextField name="expiresAt" label="Tanggal expiry" type="date" defaultValue={formatDateInput(row.expiresAt)} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {getCategoryOptions(
              categoryOptions,
              "training_status",
              trainingStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
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
  categoryOptions,
}: {
  row: WellnessRow;
  employees: EmployeeOption[];
  categoryOptions?: MasterCategoryOptionMap;
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageWellnessRecordAction}
        statusOptions={getCategoryOptions(categoryOptions, "wellness_status", wellnessStatusOptions.map((status) => ({ code: status, label: status }))).map((status) => status.code)}
        currentStatus={row.status}
      />
      <RowEditShell id={row.id} action={manageWellnessRecordAction}>
        <SelectField name="employeeId" label="Karyawan" defaultValue={`${row.employeeId}`}>
          <EmployeeOptions employees={employees} />
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CategorySelectField
            name="metricType"
            label="Metrik"
            type="wellness_metric_type"
            defaultValue={row.metricType}
            categoryOptions={categoryOptions}
            fallback={[
              { code: "Fit for Work", label: "Fit for Work" },
              { code: "MCU", label: "MCU" },
              { code: "BMI", label: "BMI" },
            ]}
          />
          <TextField name="metricValue" label="Nilai" defaultValue={row.metricValue} />
          <TextField name="recordedAt" label="Waktu catat" type="datetime-local" defaultValue={formatDateTimeInput(row.recordedAt)} />
          <SelectField name="status" label="Status" defaultValue={row.status}>
            {getCategoryOptions(
              categoryOptions,
              "wellness_status",
              wellnessStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
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
  categoryOptions,
}: {
  row: TimesheetRow;
  employees: EmployeeOption[];
  sites: SiteOption[];
  categoryOptions?: MasterCategoryOptionMap;
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageTimesheetEntryAction}
        statusOptions={getCategoryOptions(categoryOptions, "timesheet_status", timesheetStatusOptions.map((status) => ({ code: status, label: status }))).map((status) => status.code)}
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
            {getCategoryOptions(
              categoryOptions,
              "timesheet_status",
              timesheetStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
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
  categoryOptions,
}: {
  row: DailyReportRow;
  sites: SiteOption[];
  categoryOptions?: MasterCategoryOptionMap;
}) {
  return (
    <div className="grid min-w-[300px] gap-2">
      <RowStatusDeleteActions
        id={row.id}
        action={manageDailyReportAction}
        statusOptions={getCategoryOptions(categoryOptions, "daily_report_status", dailyReportStatusOptions.map((status) => ({ code: status, label: status }))).map((status) => status.code)}
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
            {getCategoryOptions(
              categoryOptions,
              "daily_report_status",
              dailyReportStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
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
  categoryOptions,
}: {
  row: PointEventRow;
  employees: EmployeeOption[];
  categoryOptions?: MasterCategoryOptionMap;
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
          <CategorySelectField
            name="category"
            label="Kategori"
            type="point_event_category"
            defaultValue={row.category}
            categoryOptions={categoryOptions}
            fallback={[
              { code: "Manual Adjustment", label: "Manual Adjustment" },
              { code: "Bonus", label: "Bonus" },
              { code: "Penalty", label: "Penalty" },
            ]}
          />
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
  categoryOptions,
  mode = "all",
}: {
  employees: EmployeeOption[];
  sites: SiteOption[];
  categoryOptions?: MasterCategoryOptionMap;
  mode?: "all" | "observation" | "incident";
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {mode !== "incident" ? <CrudFormCard
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
          <CategorySelectField
            name="category"
            label="Kategori"
            type="hse_observation_category"
            categoryOptions={categoryOptions}
            fallback={[
              { code: "Unsafe condition", label: "Unsafe condition" },
              { code: "Unsafe act", label: "Unsafe act" },
              { code: "Observation", label: "Observation" },
            ]}
          />
          <CategorySelectField
            name="severity"
            label="Severity"
            type="hse_severity"
            defaultValue="Low"
            categoryOptions={categoryOptions}
            fallback={[
              { code: "Low", label: "Low" },
              { code: "Medium", label: "Medium" },
              { code: "High", label: "High" },
              { code: "Critical", label: "Critical" },
            ]}
          />
          <TextField name="title" label="Judul" placeholder="Temuan area kerja" />
          <TextField name="location" label="Lokasi" placeholder="Workshop / pit / office" />
          <TextField name="observedAt" label="Waktu observasi" type="datetime-local" />
          <SelectField name="status" label="Status" defaultValue="open">
            {getCategoryOptions(
              categoryOptions,
              "hse_observation_status",
              hseObservationStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </SelectField>
        </div>
        <Textarea name="notes" placeholder="Catatan temuan dan tindakan awal" rows={3} />
      </CrudFormCard> : null}

      {mode !== "observation" ? <CrudFormCard
        title="Incident HSE"
        description="Catat incident recordable, near miss, property damage, atau investigasi."
        action={manageHseIncidentAction}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="siteId" label="Site">
            <SiteOptions sites={sites} />
          </SelectField>
          <CategorySelectField
            name="type"
            label="Tipe"
            type="hse_incident_type"
            categoryOptions={categoryOptions}
            fallback={[
              { code: "Near miss", label: "Near miss" },
              { code: "Property damage", label: "Property damage" },
              { code: "Incident", label: "Incident" },
            ]}
          />
          <TextField name="title" label="Judul" placeholder="Ringkasan incident" />
          <TextField name="unitNumber" label="Unit / Area" placeholder="Unit-001" defaultValue="-" />
          <TextField name="reportedAt" label="Waktu laporan" type="datetime-local" />
          <SelectField name="status" label="Status" defaultValue="investigating">
            {getCategoryOptions(
              categoryOptions,
              "hse_incident_status",
              hseIncidentStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </SelectField>
        </div>
        <Textarea name="impact" placeholder="Dampak dan tindak lanjut awal" rows={3} />
      </CrudFormCard> : null}
    </div>
  );
}

export function HcCrudForms({
  employees,
  sites,
  categoryOptions,
  mode = "all",
}: {
  employees: EmployeeOption[];
  sites: SiteOption[];
  categoryOptions?: MasterCategoryOptionMap;
  mode?: "all" | "attendance" | "training" | "wellness";
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {mode === "all" || mode === "attendance" ? <CrudFormCard
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
          <CategorySelectField
            name="eventType"
            label="Event"
            type="attendance_event_type"
            defaultValue="checked-in"
            categoryOptions={categoryOptions}
            fallback={[
              { code: "checked-in", label: "Clock In" },
              { code: "checked-out", label: "Clock Out" },
            ]}
          />
          <SelectField name="status" label="Status" defaultValue="verified">
            {getCategoryOptions(
              categoryOptions,
              "attendance_status",
              attendanceStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
            ).map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </SelectField>
          <TextField name="eventTime" label="Waktu" type="datetime-local" />
          <TextField name="locationNote" label="Lokasi / Catatan" placeholder="GPS / area kerja" />
          <TextField name="latitude" label="Latitude" placeholder="Opsional" />
          <TextField name="longitude" label="Longitude" placeholder="Opsional" />
        </div>
      </CrudFormCard> : null}

      {mode === "all" || mode === "training" ? <CrudFormCard
        title="Training Record"
        description="Catat sertifikasi, expiry, dan status training karyawan."
        action={manageTrainingRecordAction}
      >
        <SelectField name="employeeId" label="Karyawan">
          <EmployeeOptions employees={employees} />
        </SelectField>
        <TextField name="trainingName" label="Training" placeholder="Nama training / sertifikasi" />
        <TextField name="provider" label="Provider" placeholder="Provider training" defaultValue="-" />
        <TextField name="completedYear" label="Tahun selesai" type="number" defaultValue={new Date().getFullYear()} />
        <TextField name="expiresAt" label="Tanggal expiry" type="date" placeholder="Opsional" />
        <SelectField name="status" label="Status" defaultValue="active">
          {getCategoryOptions(
            categoryOptions,
            "training_status",
            trainingStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
          ).map((status) => (
            <option key={status.code} value={status.code}>
              {status.label}
            </option>
          ))}
        </SelectField>
      </CrudFormCard> : null}

      {mode === "all" || mode === "wellness" ? <CrudFormCard
        title="Wellness Record"
        description="Catat hasil fit-to-work, MCU, BMI, atau follow-up kesehatan."
        action={manageWellnessRecordAction}
      >
        <SelectField name="employeeId" label="Karyawan">
          <EmployeeOptions employees={employees} />
        </SelectField>
        <CategorySelectField
          name="metricType"
          label="Metrik"
          type="wellness_metric_type"
          categoryOptions={categoryOptions}
          fallback={[
            { code: "Fit for Work", label: "Fit for Work" },
            { code: "MCU", label: "MCU" },
            { code: "BMI", label: "BMI" },
          ]}
        />
        <TextField name="metricValue" label="Nilai" placeholder="Fit / 24.1 / normal" />
        <TextField name="recordedAt" label="Waktu catat" type="datetime-local" />
        <SelectField name="status" label="Status" defaultValue="healthy">
          {getCategoryOptions(
            categoryOptions,
            "wellness_status",
            wellnessStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
          ).map((status) => (
            <option key={status.code} value={status.code}>
              {status.label}
            </option>
          ))}
        </SelectField>
        <Textarea name="notes" placeholder="Catatan HC/wellness" rows={3} />
      </CrudFormCard> : null}
    </div>
  );
}

export function TimesheetCrudForm({
  employees,
  sites,
  categoryOptions,
}: {
  employees: EmployeeOption[];
  sites: SiteOption[];
  categoryOptions?: MasterCategoryOptionMap;
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
          {getCategoryOptions(
            categoryOptions,
            "timesheet_status",
            timesheetStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
          ).map((status) => (
            <option key={status.code} value={status.code}>
              {status.label}
            </option>
          ))}
        </SelectField>
        <TextField name="regularMinutes" label="Menit reguler" type="number" defaultValue={480} />
        <TextField name="overtimeMinutes" label="Menit lembur" type="number" defaultValue={0} />
        <TextField name="overtimeAmount" label="Nilai lembur" type="number" defaultValue={0} />
      </div>
    </CrudFormCard>
  );
}

export function DailyReportCrudForm({
  sites,
  categoryOptions,
}: {
  sites: SiteOption[];
  categoryOptions?: MasterCategoryOptionMap;
}) {
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
          {getCategoryOptions(
            categoryOptions,
            "daily_report_status",
            dailyReportStatusOptions.map((status) => ({ code: status, label: status.replaceAll("_", " ") })),
          ).map((status) => (
            <option key={status.code} value={status.code}>
              {status.label}
            </option>
          ))}
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

export function PointEventCrudForm({
  employees,
  categoryOptions,
}: {
  employees: EmployeeOption[];
  categoryOptions?: MasterCategoryOptionMap;
}) {
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
        <CategorySelectField
          name="category"
          label="Kategori"
          type="point_event_category"
          defaultValue="Manual Adjustment"
          categoryOptions={categoryOptions}
          fallback={[
            { code: "Manual Adjustment", label: "Manual Adjustment" },
            { code: "Bonus", label: "Bonus" },
            { code: "Penalty", label: "Penalty" },
          ]}
        />
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
export const dailyReportStatusOptions = ["draft", "submitted", "approved"];

export function PenaltyEventCrudForm({
  employees,
}: {
  employees: EmployeeOption[];
}) {
  return (
    <CrudFormCard
      title="Manual Penalty"
      description="Tambahkan catatan penalti manual untuk karyawan (mengurangi poin)."
      action={createPenaltyEvent as unknown as CrudAction}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <SelectField name="employeeId" label="Karyawan">
          <EmployeeOptions employees={employees} />
        </SelectField>
        <TextField name="penaltyCode" label="Kode Penalti" placeholder="Misal: ALPA" />
        <TextField name="pointsDeducted" label="Potongan Poin" type="number" defaultValue={50} />
      </div>
      <Textarea name="description" placeholder="Deskripsi atau alasan penalti" rows={2} className="mt-3" />
    </CrudFormCard>
  );
}

export function DisputeReviewActions({
  disputeId,
}: {
  disputeId: number;
}) {
  const formAction = resolveDisputeAction as unknown as NativeFormAction;
  
  return (
    <details className="min-w-[280px] rounded-lg border border-input bg-background p-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        Review Dispute
      </summary>
      <form action={formAction} className="mt-3 grid gap-3">
        <input type="hidden" name="disputeId" value={disputeId} />
        <Textarea name="resolutionNotes" placeholder="Catatan hasil review" rows={2} />
        <div className="flex gap-2">
          <Button type="submit" name="status" value="accepted" size="sm" variant="default" className="w-full">
            Terima (Refund Poin)
          </Button>
          <Button type="submit" name="status" value="rejected" size="sm" variant="destructive" className="w-full">
            Tolak
          </Button>
        </div>
      </form>
    </details>
  );
}
