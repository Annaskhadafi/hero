"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, FileText, LinkIcon, Plus, ShieldCheck } from "lucide-react";

import { createCertificate, deleteCertificate, updateCertificate, type CertificateStatus } from "@/app/actions/certificate";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnterpriseActionButtons, EnterpriseFormGrid, EnterpriseRecordDialog, type EnterpriseScorecardItem } from "@/components/ui/enterprise-table-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";

const ACCESS = { canView: true, canEdit: true, canDelete: true };
const STATUS_LABELS: Record<CertificateStatus, string> = { Active: "Aktif", Expiring: "Akan Habis", Expired: "Kedaluwarsa" };

export type CertificateRow = {
  id: number;
  employeeId: number | null;
  employeeName: string;
  employeeCode?: string | null;
  departmentName?: string | null;
  certificateType: string;
  licenseNumber: string;
  issuedDate: Date | string;
  expiryDate: Date | string;
  documentUrl: string;
  daysLeft: number;
  expiryStatus: CertificateStatus;
};

type EmployeeOption = { id: number; name: string; employeeCode?: string | null; departmentName?: string | null };
type CertificateStats = { active: number; expiring30: number; expired: number; complianceRate: number };
type DialogMode = "create" | "edit" | "view";
type CertificateForm = { employeeId: string; certificateType: string; licenseNumber: string; issuedDate: string; expiryDate: string; documentUrl: string };

type CertificateClientPageProps = {
  certificates: CertificateRow[];
  stats: CertificateStats;
  certificateTypes: string[];
  employees: EmployeeOption[];
};

export function CertificateClientPage(props: CertificateClientPageProps) {
  const [rows, setRows] = React.useState(props.certificates);
  const [selected, setSelected] = React.useState<CertificateRow | null>(null);
  const [mode, setMode] = React.useState<DialogMode>("create");
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<CertificateForm>(getEmptyForm(props.certificateTypes));

  const scorecards = React.useMemo(() => buildScorecards(props.stats), [props.stats]);
  const filters = <CertificateFilters rows={rows} certificateTypes={props.certificateTypes} />;

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    setForm(getEmptyForm(props.certificateTypes));
    setOpen(true);
  };

  const openEdit = (row: CertificateRow) => {
    setSelected(row);
    setMode("edit");
    setForm(toForm(row));
    setOpen(true);
  };

  const openView = (row: CertificateRow) => {
    setSelected(row);
    setMode("view");
    setOpen(true);
  };

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveCertificate(mode, selected, form, props.employees, setRows, setSaving, setOpen);
  };

  return (
    <AdminPageShell eyebrow="HC • Certificate" title="Manajemen Sertifikat HC" description="Pantau masa berlaku sertifikasi karyawan, dokumen lisensi, dan status kepatuhan HERO HC.">
      <MinimalTableShell
        label="sertifikat"
        title="Daftar Sertifikat Karyawan"
        description="Gunakan pencarian, filter tipe sertifikat, filter status, ekspor Excel, dan impor data untuk administrasi sertifikat."
        searchPlaceholder="Cari karyawan, nomor lisensi, departemen..."
        fileName="sertifikat-hc"
        filters={filters}
        scorecards={scorecards}
        access={ACCESS}
        primaryAction={<Button onClick={openCreate}><Plus className="size-4" />Tambah Sertifikat</Button>}
        columnOptions={COLUMN_OPTIONS}
        tableViewportClassName="max-h-[72vh]"
      >
        <CertificateTable rows={rows} onView={openView} onEdit={openEdit} onDelete={(row) => removeCertificate(row, setRows)} />
      </MinimalTableShell>

      <CertificateDialog
        mode={mode}
        open={open}
        saving={saving}
        form={form}
        selected={selected}
        employees={props.employees}
        certificateTypes={props.certificateTypes}
        onFormChange={setForm}
        onOpenChange={setOpen}
        onSubmit={submitForm}
      />
    </AdminPageShell>
  );
}

function CertificateFilters({ rows, certificateTypes }: { rows: CertificateRow[]; certificateTypes: string[] }) {
  const typeOptions = certificateTypes.map((type) => ({ value: type, label: type }));
  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <>
      <TableMultiFilter label="Jenis Sertifikat" filterKey="certificate-type" options={typeOptions} />
      <TableMultiFilter label="Status" filterKey="status" options={statusOptions} widthClassName="w-[190px]" />
      <Badge variant="outline" className="h-9 rounded-lg border-border/70 bg-white px-3 text-[13px]">{rows.length} data</Badge>
    </>
  );
}

function CertificateTable({ rows, onView, onEdit, onDelete }: { rows: CertificateRow[]; onView: (row: CertificateRow) => void; onEdit: (row: CertificateRow) => void; onDelete: (row: CertificateRow) => void }) {
  return (
    <table className="min-w-[1120px] border-separate border-spacing-0 overflow-hidden rounded-[1.1rem] bg-white text-sm shadow-sm">
      <thead className="sticky top-0 z-10 bg-surface-container-low text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
        <tr>{TABLE_HEADERS.map((header) => <th key={header} className="border-b px-4 py-3 font-semibold">{header}</th>)}</tr>
      </thead>
      <tbody>{rows.length ? rows.map((row, index) => <CertificateTableRow key={row.id} row={row} index={index} onView={onView} onEdit={onEdit} onDelete={onDelete} />) : <EmptyRow />}</tbody>
    </table>
  );
}

function CertificateTableRow({ row, index, onView, onEdit, onDelete }: { row: CertificateRow; index: number; onView: (row: CertificateRow) => void; onEdit: (row: CertificateRow) => void; onDelete: (row: CertificateRow) => void }) {
  return (
    <tr data-filter-certificate-type={row.certificateType} data-filter-status={row.expiryStatus} data-date-value={toInputDate(row.expiryDate)} className="border-b transition-colors hover:bg-muted/30">
      <td className="border-b px-4 py-3 tabular-nums text-muted-foreground">{index + 1}</td>
      <td className="border-b px-4 py-3"><EmployeeCell row={row} /></td>
      <td className="border-b px-4 py-3"><Badge variant="secondary">{row.certificateType}</Badge></td>
      <td className="border-b px-4 py-3 font-mono text-xs">{row.licenseNumber}</td>
      <td className="border-b px-4 py-3" data-date-value={toInputDate(row.issuedDate)}>{formatDate(row.issuedDate)}</td>
      <td className="border-b px-4 py-3" data-date-value={toInputDate(row.expiryDate)}>{formatDate(row.expiryDate)}</td>
      <td className="border-b px-4 py-3 tabular-nums">{formatDaysLeft(row.daysLeft)}</td>
      <td className="border-b px-4 py-3"><DocumentLink url={row.documentUrl} compact /></td>
      <td className="border-b px-4 py-3"><StatusBadge status={row.expiryStatus} /></td>
      <td className="border-b px-4 py-3 text-right"><EnterpriseActionButtons access={ACCESS} onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} labels={{ view: "Lihat", edit: "Ubah", delete: "Hapus" }} /></td>
    </tr>
  );
}

function CertificateDialog(props: { mode: DialogMode; open: boolean; saving: boolean; form: CertificateForm; selected: CertificateRow | null; employees: EmployeeOption[]; certificateTypes: string[]; onFormChange: (form: CertificateForm) => void; onOpenChange: (open: boolean) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const isView = props.mode === "view";
  const title = props.mode === "create" ? "Tambah Sertifikat" : props.mode === "edit" ? "Ubah Sertifikat" : "Detail Sertifikat";

  return (
    <EnterpriseRecordDialog title={title} description="Lengkapi data sertifikat dan tautan dokumen pendukung." mode={isView ? "view" : "form"} open={props.open} onOpenChange={props.onOpenChange} access={ACCESS} footer={isView ? <Button variant="outline" onClick={() => props.onOpenChange(false)}>Tutup</Button> : null}>
      {isView && props.selected ? <CertificateDetail row={props.selected} /> : <CertificateFormView {...props} />}
    </EnterpriseRecordDialog>
  );
}

function CertificateFormView(props: { saving: boolean; form: CertificateForm; employees: EmployeeOption[]; certificateTypes: string[]; onFormChange: (form: CertificateForm) => void; onOpenChange: (open: boolean) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const setField = (field: keyof CertificateForm, value: string) => props.onFormChange({ ...props.form, [field]: value });

  return (
    <form onSubmit={props.onSubmit} className="space-y-4">
      <EnterpriseFormGrid>
        <SelectField label="Karyawan" value={props.form.employeeId} onChange={(value) => setField("employeeId", value)} required options={props.employees.map((employee) => ({ value: `${employee.id}`, label: formatEmployeeOption(employee) }))} />
        <SelectField label="Jenis Sertifikat" value={props.form.certificateType} onChange={(value) => setField("certificateType", value)} required options={props.certificateTypes.map((type) => ({ value: type, label: type }))} />
        <TextField label="Nomor Lisensi" value={props.form.licenseNumber} onChange={(value) => setField("licenseNumber", value)} required placeholder="Contoh: SIO-12345" />
        <TextField label="URL Dokumen" value={props.form.documentUrl} onChange={(value) => setField("documentUrl", value)} placeholder="https://..." />
        <TextField label="Tanggal Terbit" type="date" value={props.form.issuedDate} onChange={(value) => setField("issuedDate", value)} required />
        <TextField label="Tanggal Kedaluwarsa" type="date" value={props.form.expiryDate} onChange={(value) => setField("expiryDate", value)} required />
      </EnterpriseFormGrid>
      <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>Batal</Button><Button type="submit" disabled={props.saving}>{props.saving ? "Menyimpan..." : "Simpan"}</Button></div>
    </form>
  );
}

function CertificateDetail({ row }: { row: CertificateRow }) {
  const details = [["Karyawan", row.employeeName], ["NIK", row.employeeCode ?? "-"], ["Departemen", row.departmentName ?? "-"], ["Jenis Sertifikat", row.certificateType], ["Nomor Lisensi", row.licenseNumber], ["Tanggal Terbit", formatDate(row.issuedDate)], ["Tanggal Kedaluwarsa", formatDate(row.expiryDate)], ["Sisa Hari", formatDaysLeft(row.daysLeft)]];

  return <div className="space-y-4"><EnterpriseFormGrid>{details.map(([label, value]) => <ReadOnlyField key={label} label={label} value={value} />)}</EnterpriseFormGrid><div className="rounded-xl border p-4"><Label>Dokumen</Label><div className="mt-2"><DocumentLink url={row.documentUrl} /></div></div><StatusBadge status={row.expiryStatus} /></div>;
}

function SelectField({ label, value, options, required, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; required?: boolean; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- Pilih {label} --</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

function TextField({ label, value, onChange, required, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; type?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type={type} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-muted/20 p-3"><p className="text-xs font-medium uppercase text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}

function StatusBadge({ status }: { status: CertificateStatus }) {
  const variants = { Active: "bg-emerald-50 text-emerald-700", Expiring: "bg-amber-50 text-amber-700", Expired: "bg-rose-50 text-rose-700" };
  return <Badge variant="outline" className={`${variants[status]} border-0`}>{STATUS_LABELS[status]}</Badge>;
}

function DocumentLink({ url, compact = false }: { url: string; compact?: boolean }) {
  if (!url) return <span className="text-muted-foreground">Tidak ada</span>;
  return <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline"><LinkIcon className="size-4" />{compact ? "Buka" : url}</a>;
}

async function saveCertificate(mode: DialogMode, selected: CertificateRow | null, form: CertificateForm, employees: EmployeeOption[], setRows: React.Dispatch<React.SetStateAction<CertificateRow[]>>, setSaving: (saving: boolean) => void, setOpen: (open: boolean) => void) {
  setSaving(true);
  try {
    const payload = { ...form, employeeName: employees.find((employee) => `${employee.id}` === form.employeeId)?.name };
    const saved = mode === "edit" && selected ? await updateCertificate(selected.id, payload) : await createCertificate(payload);
    setRows((current) => upsertRow(current, saved as CertificateRow));
    setOpen(false);
  } finally {
    setSaving(false);
  }
}

async function removeCertificate(row: CertificateRow, setRows: React.Dispatch<React.SetStateAction<CertificateRow[]>>) {
  if (!window.confirm(`Hapus sertifikat ${row.certificateType} milik ${row.employeeName}?`)) return;
  await deleteCertificate(row.id);
  setRows((current) => current.filter((item) => item.id !== row.id));
}

function upsertRow(rows: CertificateRow[], row: CertificateRow) {
  const exists = rows.some((item) => item.id === row.id);
  const nextRows = exists ? rows.map((item) => item.id === row.id ? row : item) : [...rows, row];
  return nextRows.sort((left, right) => new Date(left.expiryDate).getTime() - new Date(right.expiryDate).getTime());
}

function buildScorecards(stats: CertificateStats): EnterpriseScorecardItem[] {
  return [
    { label: "Aktif", value: stats.active, description: "Sertifikat masih berlaku", tone: "success", icon: <CheckCircle2 className="size-5" /> },
    { label: "Akan Habis 30 Hari", value: stats.expiring30, description: "Perlu perpanjangan segera", tone: "warning", icon: <AlertTriangle className="size-5" /> },
    { label: "Kedaluwarsa", value: stats.expired, description: "Tidak memenuhi kepatuhan", tone: "danger", icon: <FileText className="size-5" /> },
    { label: "Compliance Rate", value: `${stats.complianceRate}%`, description: "Rasio sertifikat valid", tone: "info", icon: <ShieldCheck className="size-5" /> },
  ];
}

function getEmptyForm(types: string[]): CertificateForm {
  return { employeeId: "", certificateType: types[0] ?? "SIO", licenseNumber: "", issuedDate: "", expiryDate: "", documentUrl: "" };
}

function toForm(row: CertificateRow): CertificateForm {
  return { employeeId: row.employeeId ? `${row.employeeId}` : "", certificateType: row.certificateType, licenseNumber: row.licenseNumber, issuedDate: toInputDate(row.issuedDate), expiryDate: toInputDate(row.expiryDate), documentUrl: row.documentUrl ?? "" };
}

function formatEmployeeOption(employee: EmployeeOption) {
  return [employee.name, employee.employeeCode, employee.departmentName].filter(Boolean).join(" • ");
}

function EmployeeCell({ row }: { row: CertificateRow }) {
  return <div><p className="font-medium">{row.employeeName}</p><p className="text-xs text-muted-foreground">{[row.employeeCode, row.departmentName].filter(Boolean).join(" • ") || "-"}</p></div>;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function toInputDate(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDaysLeft(days: number) {
  if (days < 0) return `${Math.abs(days)} hari lewat`;
  if (days === 0) return "Hari ini";
  return `${days} hari`;
}

const TABLE_HEADERS = ["No", "Karyawan", "Jenis Sertifikat", "Nomor Lisensi", "Tanggal Terbit", "Tanggal Kedaluwarsa", "Sisa Hari", "Dokumen", "Status", "Aksi"];
const COLUMN_OPTIONS = TABLE_HEADERS.map((label) => ({ key: label.toLowerCase().replace(/\s+/g, "-"), label, required: label === "Aksi" || label === "Karyawan" }));

function EmptyRow() {
  return <tr><td colSpan={TABLE_HEADERS.length} className="px-4 py-10 text-center text-muted-foreground">Belum ada data sertifikat.</td></tr>;
}
