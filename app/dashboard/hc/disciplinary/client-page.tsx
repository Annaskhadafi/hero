"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";

import {
  createDisciplinaryAction,
  createViolationCategory,
  deleteDisciplinaryAction,
  deleteViolationCategory,
  updateDisciplinaryAction,
  updateViolationCategory,
  type DisciplinaryActionInput,
  type ViolationCategoryInput,
} from "@/app/actions/disciplinary";
import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner, hcPrimaryActionClassName } from "@/components/hc/hc-workspace-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnterpriseActionButtons, EnterpriseFormGrid, EnterpriseRecordDialog } from "@/components/ui/enterprise-table-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { Textarea } from "@/components/ui/textarea";

const SP_LEVELS = ["SP1", "SP2", "SP3", "Termination"];
const STATUSES = ["active", "expired", "closed", "draft"];
const SEVERITIES = ["Low", "Medium", "High", "Critical"];

type ActionRow = {
  id: number;
  employeeId: number | null;
  categoryId: number | null;
  spLevel: string;
  letterNumber: string;
  violationDate: Date | string;
  description: string;
  actionTaken: string;
  effectiveDate: Date | string;
  expiryDate: Date | string | null;
  issuedBy: string;
  notes: string;
  status: string;
  employeeName: string | null;
  department: string | null;
  position: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  severity: string | null;
};

type BaseActionRow = Omit<ActionRow, "employeeName" | "department" | "position" | "categoryCode" | "categoryName" | "severity">;

type CategoryRow = {
  id: number;
  code: string;
  name: string;
  severity: string;
  defaultSpLevel: string | number;
  description: string;
  isActive: boolean;
};

type EmployeeOption = { id: number; name: string; employeeSn: string; department: string | null; position: string | null };
type Stats = { activeSp: number; expired: number; thisMonth: number; byLevel: { SP1: number; SP2: number; SP3: number; Termination: number } };
type DialogState = | { type: "action"; record?: ActionRow } | { type: "category"; record?: CategoryRow } | { type: "view-action"; record: ActionRow } | { type: "view-category"; record: CategoryRow } | null;

export function DisciplinaryClientPage({ actions, categories, stats, employees }: { actions: ActionRow[]; categories: CategoryRow[]; stats: Stats; employees: EmployeeOption[] }) {
  const [actionRows, setActionRows] = useState(actions);
  const [categoryRows, setCategoryRows] = useState(categories.map(normalizeCategoryRow));
  const [dialog, setDialog] = useState<DialogState>(null);
  const [isPending, startTransition] = useTransition();
  const access = { canView: true, canEdit: true, canDelete: true };
  const scorecards = useScorecards(stats);

  const refreshAction = (record: ActionRow, mode: "create" | "update") => setActionRows((rows) => mode === "create" ? [record, ...rows] : rows.map((row) => row.id === record.id ? record : row));
  const refreshCategory = (record: CategoryRow, mode: "create" | "update") => setCategoryRows((rows) => mode === "create" ? [normalizeCategoryRow(record), ...rows] : rows.map((row) => row.id === record.id ? normalizeCategoryRow(record) : row));

  return (
    <AdminPageShell eyebrow="HC • Disiplin" title="Tindakan Disiplin" description="Kelola surat peringatan, tindakan pembinaan, dan kategori pelanggaran karyawan.">
      <HcWorkspaceBanner
        title="Disciplinary Case Desk"
        description="Kasus, level SP, kategori, dan masa berlaku tindakan dibaca sebagai antrian kerja HC yang rapi dan rendah noise."
        items={[
          { label: "Kasus", value: actionRows.length, tone: "slate" },
          { label: "Kategori", value: categoryRows.length, tone: "sky" },
          { label: "Aktif", value: stats.activeSp, tone: "amber" },
        ]}
      />

      <div className="grid gap-8">
        <MinimalTableShell label="tindakan disiplin" title="Tindakan Disiplin" description="Daftar SP dan tindakan disiplin karyawan." fileName="tindakan-disiplin-hc" searchPlaceholder="Cari karyawan, nomor surat, kategori..." scorecards={scorecards} access={access} filters={<ActionFilters categories={categoryRows} />} primaryAction={<Button onClick={() => setDialog({ type: "action" })} className={hcPrimaryActionClassName}><Plus className="size-4" />Tambah Tindakan</Button>} columnOptions={actionColumns}>
          <ActionTable rows={actionRows} onView={(record) => setDialog({ type: "view-action", record })} onEdit={(record) => setDialog({ type: "action", record })} onDelete={(record) => removeAction(record.id, setActionRows)} />
        </MinimalTableShell>

        <MinimalTableShell label="kategori pelanggaran" title="Kategori Pelanggaran" description="Master kategori pelanggaran dan default level SP." fileName="kategori-pelanggaran-hc" searchPlaceholder="Cari kode atau nama kategori..." access={access} filters={<CategoryFilters />} primaryAction={<Button onClick={() => setDialog({ type: "category" })} variant="outline"><Plus className="size-4" />Tambah Kategori</Button>} columnOptions={categoryColumns}>
          <CategoryTable rows={categoryRows} onView={(record) => setDialog({ type: "view-category", record })} onEdit={(record) => setDialog({ type: "category", record })} onDelete={(record) => removeCategory(record.id, setCategoryRows)} />
        </MinimalTableShell>
      </div>

      {dialog?.type === "action" ? <ActionDialog open record={dialog.record} employees={employees} categories={categoryRows} isPending={isPending} onOpenChange={(open) => !open && setDialog(null)} onSaved={refreshAction} startTransition={startTransition} /> : null}
      {dialog?.type === "category" ? <CategoryDialog open record={dialog.record} isPending={isPending} onOpenChange={(open) => !open && setDialog(null)} onSaved={refreshCategory} startTransition={startTransition} /> : null}
      {dialog?.type === "view-action" ? <ActionView record={dialog.record} onOpenChange={() => setDialog(null)} /> : null}
      {dialog?.type === "view-category" ? <CategoryView record={dialog.record} onOpenChange={() => setDialog(null)} /> : null}
    </AdminPageShell>
  );
}

function useScorecards(stats: Stats) {
  return useMemo(() => [
    { label: "SP Aktif", value: stats.activeSp, description: `${stats.expired} sudah kedaluwarsa`, tone: "info" as const },
    { label: "SP1", value: stats.byLevel.SP1, description: "Peringatan tingkat 1", tone: "success" as const },
    { label: "SP2", value: stats.byLevel.SP2, description: "Peringatan tingkat 2", tone: "warning" as const },
    { label: "SP3/Terminasi", value: stats.byLevel.SP3 + stats.byLevel.Termination, description: `${stats.thisMonth} kasus bulan ini`, tone: "danger" as const },
  ], [stats]);
}

function ActionFilters({ categories }: { categories: CategoryRow[] }) {
  const severities = Array.from(new Set(categories.map((item) => item.severity))).filter(Boolean);
  return <><TableMultiFilter label="Level SP" filterKey="spLevel" options={SP_LEVELS.map(toOption)} /><TableMultiFilter label="Status" filterKey="status" options={STATUSES.map(toOption)} /><TableMultiFilter label="Severity" filterKey="severity" options={severities.map(toOption)} /></>;
}
function CategoryFilters() { return <><TableMultiFilter label="Severity" filterKey="severity" options={SEVERITIES.map(toOption)} /><TableMultiFilter label="Level SP" filterKey="spLevel" options={SP_LEVELS.map(toOption)} /></>; }

function ActionTable({ rows, onView, onEdit, onDelete }: { rows: ActionRow[]; onView: (record: ActionRow) => void; onEdit: (record: ActionRow) => void; onDelete: (record: ActionRow) => void }) {
  return <Table><TableHeader><TableRow><TableHead>Karyawan</TableHead><TableHead>Departemen</TableHead><TableHead>Kategori Pelanggaran</TableHead><TableHead>Level SP</TableHead><TableHead>Tanggal Pelanggaran</TableHead><TableHead>Efektif</TableHead><TableHead>Kedaluwarsa</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id} data-filter-sp-level={row.spLevel} data-filter-status={row.status} data-filter-severity={row.severity ?? ""} data-date-value={dateValue(row.violationDate)}><TableCell className="min-w-52 font-medium">{row.employeeName ?? "-"}<div className="text-xs text-muted-foreground">{row.position ?? "-"}</div></TableCell><TableCell>{row.department ?? "-"}</TableCell><TableCell>{row.categoryName ?? "-"}<div className="text-xs text-muted-foreground">{row.categoryCode ?? ""}</div></TableCell><TableCell><SpBadge value={row.spLevel} /></TableCell><TableCell>{formatDate(row.violationDate)}</TableCell><TableCell>{formatDate(row.effectiveDate)}</TableCell><TableCell>{formatDate(row.expiryDate)}</TableCell><TableCell><StatusBadge value={row.status} /></TableCell><TableCell><EnterpriseActionButtons access={{ canView: true, canEdit: true, canDelete: true }} labels={actionLabels} onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /></TableCell></TableRow>)}</TableBody></Table>;
}

function CategoryTable({ rows, onView, onEdit, onDelete }: { rows: CategoryRow[]; onView: (record: CategoryRow) => void; onEdit: (record: CategoryRow) => void; onDelete: (record: CategoryRow) => void }) {
  return <Table><TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Severity</TableHead><TableHead>Default Level SP</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id} data-filter-severity={row.severity} data-filter-sp-level={String(row.defaultSpLevel)} data-filter-status={row.isActive ? "Aktif" : "Nonaktif"}><TableCell className="font-semibold">{row.code}</TableCell><TableCell>{row.name}<div className="text-xs text-muted-foreground">{row.description}</div></TableCell><TableCell><SeverityBadge value={row.severity} /></TableCell><TableCell><SpBadge value={String(row.defaultSpLevel)} /></TableCell><TableCell><StatusBadge value={row.isActive ? "Aktif" : "Nonaktif"} /></TableCell><TableCell><EnterpriseActionButtons access={{ canView: true, canEdit: true, canDelete: true }} labels={actionLabels} onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /></TableCell></TableRow>)}</TableBody></Table>;
}

function ActionDialog(props: { open: boolean; record?: ActionRow; employees: EmployeeOption[]; categories: CategoryRow[]; isPending: boolean; onOpenChange: (open: boolean) => void; onSaved: (record: ActionRow, mode: "create" | "update") => void; startTransition: (callback: () => void) => void }) {
  const [form, setForm] = useState(actionInitial(props.record));
  const save = () => props.startTransition(() => { void saveAction(props, form); });
  return <EnterpriseRecordDialog open={props.open} onOpenChange={props.onOpenChange} mode="form" title={props.record ? "Ubah Tindakan Disiplin" : "Tambah Tindakan Disiplin"} description="Lengkapi data SP dan tindakan pembinaan." footer={<FormFooter disabled={props.isPending} onCancel={() => props.onOpenChange(false)} onSave={save} />}><EnterpriseFormGrid><SelectField label="Karyawan" value={form.employeeId} onChange={(employeeId) => setForm({ ...form, employeeId })} options={props.employees.map((employee) => ({ value: String(employee.id), label: `${employee.name} • ${employee.department ?? "-"}` }))} /><SelectField label="Kategori" value={form.categoryId} onChange={(categoryId) => setForm({ ...form, categoryId })} options={props.categories.map((category) => ({ value: String(category.id), label: `${category.code} • ${category.name}` }))} /><SelectField label="Level SP" value={form.spLevel} onChange={(spLevel) => setForm({ ...form, spLevel })} options={SP_LEVELS.map(toOption)} /><TextField label="Nomor Surat" value={form.letterNumber ?? ""} onChange={(letterNumber) => setForm({ ...form, letterNumber })} /><TextField label="Tanggal Pelanggaran" type="date" value={String(form.violationDate)} onChange={(violationDate) => setForm({ ...form, violationDate })} /><TextField label="Tanggal Efektif" type="date" value={String(form.effectiveDate)} onChange={(effectiveDate) => setForm({ ...form, effectiveDate })} /><TextField label="Tanggal Kedaluwarsa" type="date" value={String(form.expiryDate ?? "")} onChange={(expiryDate) => setForm({ ...form, expiryDate })} /><TextField label="Diterbitkan Oleh" value={form.issuedBy ?? ""} onChange={(issuedBy) => setForm({ ...form, issuedBy })} /></EnterpriseFormGrid><TextAreaField label="Deskripsi Pelanggaran" value={form.description ?? ""} onChange={(description) => setForm({ ...form, description })} /><TextAreaField label="Tindakan yang Diambil" value={form.actionTaken ?? ""} onChange={(actionTaken) => setForm({ ...form, actionTaken })} /><TextAreaField label="Catatan" value={form.notes ?? ""} onChange={(notes) => setForm({ ...form, notes })} /></EnterpriseRecordDialog>;
}

function CategoryDialog(props: { open: boolean; record?: CategoryRow; isPending: boolean; onOpenChange: (open: boolean) => void; onSaved: (record: CategoryRow, mode: "create" | "update") => void; startTransition: (callback: () => void) => void }) {
  const [form, setForm] = useState(categoryInitial(props.record));
  const save = () => props.startTransition(() => { void saveCategory(props, form); });
  return <EnterpriseRecordDialog open={props.open} onOpenChange={props.onOpenChange} mode="form" title={props.record ? "Ubah Kategori" : "Tambah Kategori"} description="Atur master kategori pelanggaran." footer={<FormFooter disabled={props.isPending} onCancel={() => props.onOpenChange(false)} onSave={save} />}><EnterpriseFormGrid><TextField label="Kode" value={form.code} onChange={(code) => setForm({ ...form, code })} /><TextField label="Nama" value={form.name} onChange={(name) => setForm({ ...form, name })} /><SelectField label="Severity" value={form.severity} onChange={(severity) => setForm({ ...form, severity })} options={SEVERITIES.map(toOption)} /><SelectField label="Default Level SP" value={form.defaultSpLevel} onChange={(defaultSpLevel) => setForm({ ...form, defaultSpLevel })} options={SP_LEVELS.map(toOption)} /></EnterpriseFormGrid><TextAreaField label="Deskripsi" value={form.description ?? ""} onChange={(description) => setForm({ ...form, description })} /></EnterpriseRecordDialog>;
}

async function saveAction(props: { record?: ActionRow; employees: EmployeeOption[]; categories: CategoryRow[]; onSaved: (record: ActionRow, mode: "create" | "update") => void; onOpenChange: (open: boolean) => void }, form: DisciplinaryActionInput) { const saved = props.record ? await updateDisciplinaryAction(props.record.id, form) : await createDisciplinaryAction(form); props.onSaved(enrichAction(saved as BaseActionRow, props.employees, props.categories), props.record ? "update" : "create"); props.onOpenChange(false); }
async function saveCategory(props: { record?: CategoryRow; onSaved: (record: CategoryRow, mode: "create" | "update") => void; onOpenChange: (open: boolean) => void }, form: ViolationCategoryInput) { const saved = props.record ? await updateViolationCategory(props.record.id, form) : await createViolationCategory(form); props.onSaved(saved as CategoryRow, props.record ? "update" : "create"); props.onOpenChange(false); }
function ActionView({ record, onOpenChange }: { record: ActionRow; onOpenChange: () => void }) { return <EnterpriseRecordDialog open onOpenChange={onOpenChange} title="Detail Tindakan Disiplin"><div className="grid gap-2 text-sm"><b>{record.employeeName}</b><span>{record.categoryName} • {record.spLevel}</span><span>Nomor surat: {record.letterNumber || "-"}</span><span>{record.description}</span><span>{record.actionTaken}</span></div></EnterpriseRecordDialog>; }
function CategoryView({ record, onOpenChange }: { record: CategoryRow; onOpenChange: () => void }) { return <EnterpriseRecordDialog open onOpenChange={onOpenChange} title="Detail Kategori Pelanggaran"><div className="grid gap-2 text-sm"><b>{record.code} • {record.name}</b><span>Severity: {record.severity}</span><span>Default SP: {record.defaultSpLevel}</span><span>{record.description || "Tidak ada deskripsi."}</span></div></EnterpriseRecordDialog>; }
function FormFooter({ disabled, onCancel, onSave }: { disabled: boolean; onCancel: () => void; onSave: () => void }) { return <><Button variant="outline" onClick={onCancel}>Batal</Button><Button disabled={disabled} onClick={onSave}>{disabled ? "Menyimpan..." : "Simpan"}</Button></>; }
function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string | number; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) { return <div className="space-y-2"><Label>{label}</Label><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Pilih {label}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>; }
function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <div className="space-y-2"><Label>{label}</Label><Textarea value={value} onChange={(event) => onChange(event.target.value)} /></div>; }
function SpBadge({ value }: { value: string }) { const tone = value === "SP1" ? "bg-emerald-50 text-emerald-700" : value === "SP2" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"; return <Badge variant="outline" className={`border-0 ${tone}`}>{value}</Badge>; }
function StatusBadge({ value }: { value: string }) { const tone = ["active", "Active", "Aktif"].includes(value) ? "bg-sky-50 text-sky-700" : ["expired", "Expired"].includes(value) ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"; return <Badge variant="outline" className={`border-0 ${tone}`}>{value}</Badge>; }
function SeverityBadge({ value }: { value: string }) { const tone = value === "Critical" ? "bg-rose-50 text-rose-700" : value === "High" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700"; return <Badge variant="outline" className={`border-0 ${tone}`}>{value}</Badge>; }
function removeAction(id: number, setter: (value: (rows: ActionRow[]) => ActionRow[]) => void) { if (!confirm("Hapus tindakan disiplin ini?")) return; setter((rows) => rows.filter((row) => row.id !== id)); void deleteDisciplinaryAction(id); }
function removeCategory(id: number, setter: (value: (rows: CategoryRow[]) => CategoryRow[]) => void) { if (!confirm("Hapus kategori pelanggaran ini?")) return; setter((rows) => rows.filter((row) => row.id !== id)); void deleteViolationCategory(id); }
function actionInitial(record?: ActionRow): DisciplinaryActionInput { return { employeeId: String(record?.employeeId ?? ""), categoryId: String(record?.categoryId ?? ""), spLevel: record?.spLevel ?? "SP1", letterNumber: record?.letterNumber ?? "", violationDate: dateValue(record?.violationDate), description: record?.description ?? "", actionTaken: record?.actionTaken ?? "", effectiveDate: dateValue(record?.effectiveDate), expiryDate: dateValue(record?.expiryDate), issuedBy: record?.issuedBy ?? "", notes: record?.notes ?? "", status: record?.status ?? "active" }; }
function categoryInitial(record?: CategoryRow): ViolationCategoryInput { return { code: record?.code ?? "", name: record?.name ?? "", severity: record?.severity ?? "Medium", defaultSpLevel: String(record?.defaultSpLevel ?? "SP1"), description: record?.description ?? "", isActive: record?.isActive ?? true }; }
function enrichAction(record: BaseActionRow, employees: EmployeeOption[], categories: CategoryRow[]): ActionRow { const employee = employees.find((item) => item.id === Number(record.employeeId)); const category = categories.find((item) => item.id === Number(record.categoryId)); return { ...record, employeeName: employee?.name ?? null, department: employee?.department ?? null, position: employee?.position ?? null, categoryCode: category?.code ?? null, categoryName: category?.name ?? null, severity: category?.severity ?? null }; }
function formatDate(value?: Date | string | null) { if (!value) return "-"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID"); }
function dateValue(value?: Date | string | null) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10); }
function toOption(value: string) { return { value, label: value === "Termination" ? "Terminasi" : value }; }
function normalizeCategoryRow(row: CategoryRow): CategoryRow { return { ...row, defaultSpLevel: typeof row.defaultSpLevel === "number" ? `SP${row.defaultSpLevel}` : row.defaultSpLevel }; }
const actionLabels = { view: "Lihat", edit: "Ubah", delete: "Hapus" };
const actionColumns = ["Karyawan", "Departemen", "Kategori Pelanggaran", "Level SP", "Tanggal Pelanggaran", "Efektif", "Kedaluwarsa", "Status", "Aksi"].map((label) => ({ key: label, label, required: label === "Aksi" }));
const categoryColumns = ["Kode", "Nama", "Severity", "Default Level SP", "Status", "Aksi"].map((label) => ({ key: label, label, required: label === "Aksi" }));
