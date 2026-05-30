"use client"

import { useMemo, useState, useTransition } from "react"
import { Boxes, Download, Package, PackageCheck, PackageMinus, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createWarehouseRepairInbound,
  createWarehouseRepairOutbound,
  deleteWarehouseRepairInbound,
  deleteWarehouseRepairItem,
  deleteWarehouseRepairOutbound,
  deleteWarehouseRepairType,
  deleteWarehouseRepairUnit,
  upsertWarehouseRepairItem,
  upsertWarehouseRepairType,
  upsertWarehouseRepairUnit,
} from "@/app/actions/warehouse-repair"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EnterpriseActionButtons, EnterpriseFormGrid, EnterpriseRecordDialog, type TableRbacAccess } from "@/components/ui/enterprise-table-kit"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableMultiFilter } from "@/components/ui/table-multi-filter"
import { Textarea } from "@/components/ui/textarea"

type Mode = "overview" | "items" | "types" | "units" | "inbound" | "outbound" | "stock-report" | "inbound-report" | "outbound-report"
type Row = Record<string, any>
type Props = { mode: Mode; data: { items: Row[]; types: Row[]; units: Row[]; inbound: Row[]; outbound: Row[]; metrics?: Record<string, number> } }

const access: TableRbacAccess = { canView: true, canEdit: true, canDelete: true, canSelectAll: true }
const itemColumns = ["Kode", "Nama Barang", "Jenis", "Satuan", "Stok", "Minimum", "Status", "Aksi"]
const masterColumns = ["Kode", "Nama", "Status", "Aksi"]
const trxColumns = ["No Transaksi", "Tanggal", "Kode Barang", "Nama Barang", "Qty", "Keterangan", "Aksi"]
const reportTrxColumns = ["No Transaksi", "Tanggal", "Kode Barang", "Nama Barang", "Qty", "Keterangan"]

function today() { return new Date().toISOString().slice(0, 10) }
function fmtDate(value: unknown) { return value ? String(value).slice(0, 10) : "-" }
function statusLabel(active: unknown) { return active ? "Aktif" : "Nonaktif" }
function reload() { window.location.reload() }

function PageShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
        <div><div className="text-sm text-muted-foreground">Warehouse Repair</div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="text-sm text-muted-foreground">{description}</p></div>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function DetailGrid({ row, labels }: { row: Row; labels: Array<[string, string]> }) {
  return <EnterpriseFormGrid>{labels.map(([key, label]) => <div key={key} className="rounded-xl border border-border/70 bg-muted/20 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 text-sm font-medium">{String(row[key] ?? "-")}</div></div>)}</EnterpriseFormGrid>
}

function MasterDialog({ kind, row, types, units, trigger }: { kind: "item" | "type" | "unit"; row?: Row; types: Row[]; units: Row[]; trigger: React.ReactNode }) {
  const [pending, start] = useTransition()
  const [form, setForm] = useState<Row>(row ?? { itemName: "", minimumStock: 0, typeId: null, unitId: null, typeName: "", unitName: "", isActive: true })
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const title = `${row ? "Edit" : "Tambah"} ${kind === "item" ? "Barang" : kind === "type" ? "Jenis Barang" : "Satuan"}`
  const save = () => start(async () => {
    const res = kind === "item"
      ? await upsertWarehouseRepairItem({ itemCode: form.itemCode, itemName: form.itemName, minimumStock: Number(form.minimumStock || 0), typeId: form.typeId ? Number(form.typeId) : null, unitId: form.unitId ? Number(form.unitId) : null, photoUrl: form.photoUrl ?? "", isActive: form.isActive ?? true }, row?.id)
      : kind === "type"
        ? await upsertWarehouseRepairType({ typeCode: form.typeCode, typeName: form.typeName, isActive: form.isActive ?? true }, row?.id)
        : await upsertWarehouseRepairUnit({ unitCode: form.unitCode, unitName: form.unitName, isActive: form.isActive ?? true }, row?.id)
    if (res.success) { toast.success("Data tersimpan"); reload() } else toast.error(res.error)
  })
  return (
    <EnterpriseRecordDialog trigger={trigger} title={title} mode="form" access={access} footer={<><Button variant="outline" onClick={reload}>Batal</Button><Button disabled={pending} onClick={save}>Simpan</Button></>}>
      <EnterpriseFormGrid>
        {kind === "item" ? <>
          <Field label="Kode Barang"><Input value={form.itemCode ?? ""} placeholder="Auto jika kosong" onChange={(e) => set("itemCode", e.target.value)} /></Field>
          <Field label="Nama Barang"><Input value={form.itemName ?? ""} onChange={(e) => set("itemName", e.target.value)} /></Field>
          <Field label="Jenis"><Select value={String(form.typeId ?? "none")} onValueChange={(v) => set("typeId", v === "none" ? null : Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-</SelectItem>{types.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.typeName}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Satuan"><Select value={String(form.unitId ?? "none")} onValueChange={(v) => set("unitId", v === "none" ? null : Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-</SelectItem>{units.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.unitName}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Stok Minimum"><Input type="number" value={form.minimumStock ?? 0} onChange={(e) => set("minimumStock", e.target.value)} /></Field>
        </> : kind === "type" ? <><Field label="Kode Jenis"><Input value={form.typeCode ?? ""} placeholder="Auto jika kosong" onChange={(e) => set("typeCode", e.target.value)} /></Field><Field label="Nama Jenis"><Input value={form.typeName ?? ""} onChange={(e) => set("typeName", e.target.value)} /></Field></> : <><Field label="Kode Satuan"><Input value={form.unitCode ?? ""} placeholder="Auto jika kosong" onChange={(e) => set("unitCode", e.target.value)} /></Field><Field label="Nama Satuan"><Input value={form.unitName ?? ""} onChange={(e) => set("unitName", e.target.value)} /></Field></>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive ?? true} onChange={(e) => set("isActive", e.target.checked)} /> Aktif</label>
      </EnterpriseFormGrid>
    </EnterpriseRecordDialog>
  )
}

function TransactionDialog({ kind, items }: { kind: "in" | "out"; items: Row[] }) {
  const [pending, start] = useTransition()
  const [form, setForm] = useState({ transactionDate: today(), itemId: "", quantity: 1, note: "" })
  const save = () => start(async () => {
    const action = kind === "in" ? createWarehouseRepairInbound : createWarehouseRepairOutbound
    const res = await action({ transactionDate: form.transactionDate, itemId: Number(form.itemId), quantity: Number(form.quantity), note: form.note })
    if (res.success) { toast.success("Transaksi tersimpan"); reload() } else toast.error(res.error)
  })
  return (
    <EnterpriseRecordDialog trigger={<Button><Plus className="mr-2 h-4 w-4" />Entri Data</Button>} title={`Barang ${kind === "in" ? "Masuk" : "Keluar"}`} mode="form" access={access} footer={<Button disabled={pending || !form.itemId} onClick={save}>Simpan</Button>}>
      <EnterpriseFormGrid>
        <Field label="Tanggal"><Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} /></Field>
        <Field label="Barang"><Select value={form.itemId} onValueChange={(v) => setForm({ ...form, itemId: v })}><SelectTrigger><SelectValue placeholder="Pilih barang" /></SelectTrigger><SelectContent>{items.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.itemCode} - {i.itemName} (stok {i.stock})</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Jumlah"><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
        <Field label="Keterangan"><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
      </EnterpriseFormGrid>
    </EnterpriseRecordDialog>
  )
}

function ItemTable({ rows, types, units, title, report = false }: { rows: Row[]; types: Row[]; units: Row[]; title: string; report?: boolean }) {
  const typeOptions = useMemo(() => types.map((t) => ({ value: t.typeName, label: t.typeName })), [types])
  const unitOptions = useMemo(() => units.map((u) => ({ value: u.unitName, label: u.unitName })), [units])
  return <MinimalTableShell label={title.toLowerCase()} fileName={title} searchPlaceholder={`Cari ${title.toLowerCase()}...`} showImport={!report} access={access} filters={<><TableMultiFilter label="jenis" filterKey="type" options={typeOptions} /><TableMultiFilter label="satuan" filterKey="unit" options={unitOptions} /><TableMultiFilter label="status stok" filterKey="stock" options={[{ value: "low", label: "Low stock" }, { value: "safe", label: "Stok aman" }]} /></>} primaryAction={!report ? <MasterDialog kind="item" types={types} units={units} trigger={<Button><Plus className="mr-2 h-4 w-4" />Tambah Barang</Button>} /> : undefined} columnOptions={itemColumns.map((c, i) => ({ key: c, label: c, required: i < 2 }))} dateFilter={false} scorecards={[{ label: "Barang", value: rows.length, icon: <Boxes className="size-4 text-primary" />, tone: "info" }, { label: "Total Stok", value: rows.reduce((s, i) => s + Number(i.stock ?? 0), 0), tone: "default" }, { label: "Low Stock", value: rows.filter((i) => Number(i.stock ?? 0) <= Number(i.minimumStock ?? 0)).length, tone: "warning" }, { label: "Aktif", value: rows.filter((i) => i.isActive).length, tone: "success" }]}>
    <Table><TableHeader><TableRow>{itemColumns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows.map((r) => <TableRow key={r.id} data-filter-type={r.typeName ?? ""} data-filter-unit={r.unitName ?? ""} data-filter-stock={Number(r.stock ?? 0) <= Number(r.minimumStock ?? 0) ? "low" : "safe"}><TableCell className="font-mono text-xs font-semibold text-primary">{r.itemCode}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.typeName ?? "-"}</TableCell><TableCell>{r.unitName ?? "-"}</TableCell><TableCell>{r.stock}</TableCell><TableCell>{r.minimumStock}</TableCell><TableCell><Badge variant={r.isActive ? "default" : "outline"}>{statusLabel(r.isActive)}</Badge></TableCell><TableCell>{report ? null : <EnterpriseActionButtons access={access} onView={() => toast.info(`${r.itemCode} - ${r.itemName}`)} onEdit={() => {}} onDelete={() => deleteWarehouseRepairItem(r.id).then(reload)} />}</TableCell></TableRow>) : <TableRow><TableCell colSpan={itemColumns.length} className="h-24 text-center text-muted-foreground">Belum ada data barang.</TableCell></TableRow>}</TableBody></Table>
  </MinimalTableShell>
}

function MasterTable({ kind, rows, types, units, title }: { kind: "type" | "unit"; rows: Row[]; types: Row[]; units: Row[]; title: string }) {
  const deleteAction = kind === "type" ? deleteWarehouseRepairType : deleteWarehouseRepairUnit
  return <MinimalTableShell label={title.toLowerCase()} fileName={title} access={access} primaryAction={<MasterDialog kind={kind} types={types} units={units} trigger={<Button><Plus className="mr-2 h-4 w-4" />Tambah {title}</Button>} />} columnOptions={masterColumns.map((c, i) => ({ key: c, label: c, required: i < 2 }))} dateFilter={false}>
    <Table><TableHeader><TableRow>{masterColumns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows.map((r) => <TableRow key={r.id}><TableCell className="font-mono text-xs font-semibold text-primary">{kind === "type" ? r.typeCode : r.unitCode}</TableCell><TableCell>{kind === "type" ? r.typeName : r.unitName}</TableCell><TableCell><Badge variant={r.isActive ? "default" : "outline"}>{statusLabel(r.isActive)}</Badge></TableCell><TableCell><div className="flex gap-1"><MasterDialog kind={kind} row={r} types={types} units={units} trigger={<Button variant="ghost" size="denseIcon"><Pencil className="size-4" /></Button>} /><Button variant="ghost" size="denseIcon" onClick={() => deleteAction(r.id).then(reload)}><Trash2 className="size-4 text-destructive" /></Button></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={masterColumns.length} className="h-24 text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>}</TableBody></Table>
  </MinimalTableShell>
}

function TransactionTable({ rows, items, title, kind, report = false }: { rows: Row[]; items: Row[]; title: string; kind: "in" | "out"; report?: boolean }) {
  const columns = report ? reportTrxColumns : trxColumns
  const deleteAction = kind === "in" ? deleteWarehouseRepairInbound : deleteWarehouseRepairOutbound
  const itemOptions = useMemo(() => items.map((i) => ({ value: i.itemName, label: i.itemName })), [items])
  return <MinimalTableShell label={title.toLowerCase()} fileName={title} showImport={false} access={access} dateFilter filters={<TableMultiFilter label="barang" filterKey="item" options={itemOptions} />} primaryAction={!report ? <TransactionDialog kind={kind} items={items} /> : undefined} columnOptions={columns.map((c, i) => ({ key: c, label: c, required: i < 2 }))} scorecards={[{ label: "Transaksi", value: rows.length, tone: "info", icon: kind === "in" ? <PackagePlus className="size-4 text-primary" /> : <PackageMinus className="size-4 text-primary" /> }, { label: "Total Qty", value: rows.reduce((s, r) => s + Number(r.quantity ?? 0), 0), tone: "default" }, { label: "Barang", value: new Set(rows.map((r) => r.itemId ?? r.itemCode)).size, tone: "success" }, { label: "Export", value: <Download className="size-5" />, tone: "warning" }]}>
    <Table><TableHeader><TableRow>{columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows.map((r) => <TableRow key={r.id} data-date-value={fmtDate(r.transactionDate)} data-filter-item={r.itemName ?? ""}><TableCell className="font-mono text-xs font-semibold text-primary">{r.transactionNo}</TableCell><TableCell>{fmtDate(r.transactionDate)}</TableCell><TableCell>{r.itemCode}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.quantity}</TableCell><TableCell>{r.note || "-"}</TableCell>{!report ? <TableCell><EnterpriseActionButtons access={access} onView={() => toast.info(r.transactionNo)} onDelete={() => deleteAction(r.id).then(reload)} /></TableCell> : null}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">Belum ada data transaksi.</TableCell></TableRow>}</TableBody></Table>
  </MinimalTableShell>
}

export function WarehouseRepairClient({ mode, data }: Props) {
  const metrics = data.metrics ?? { items: data.items.length, lowStock: data.items.filter((i) => i.stock <= i.minimumStock).length, inbound: data.inbound.length, outbound: data.outbound.length, totalStock: data.items.reduce((s, i) => s + i.stock, 0) }
  if (mode === "overview") return <PageShell title="Dashboard" description="Ringkasan stok, transaksi masuk, dan transaksi keluar warehouse repair."><MinimalTableShell label="stok minimum" fileName="warehouse-repair-low-stock" showImport={false} searchPlaceholder="Cari stok minimum..." dateFilter={false} scorecards={[{ label: "Barang", value: metrics.items, tone: "info", icon: <Boxes className="size-4 text-primary" /> }, { label: "Total Stok", value: metrics.totalStock, tone: "default" }, { label: "Low Stock", value: metrics.lowStock, tone: "warning" }, { label: "Transaksi", value: Number(metrics.inbound ?? 0) + Number(metrics.outbound ?? 0), tone: "success" }]}><Table><TableHeader><TableRow>{itemColumns.slice(0, -1).map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{data.items.filter((i) => i.stock <= i.minimumStock).map((r) => <TableRow key={r.id}><TableCell>{r.itemCode}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.typeName ?? "-"}</TableCell><TableCell>{r.unitName ?? "-"}</TableCell><TableCell>{r.stock}</TableCell><TableCell>{r.minimumStock}</TableCell><TableCell><Badge variant="outline">Low stock</Badge></TableCell></TableRow>)}</TableBody></Table></MinimalTableShell></PageShell>
  if (mode === "items") return <PageShell title="Data Barang" description="Master barang dan posisi stok warehouse repair."><ItemTable rows={data.items} types={data.types} units={data.units} title="Data Barang" /></PageShell>
  if (mode === "types") return <PageShell title="Jenis Barang" description="Master kategori/jenis barang warehouse repair."><MasterTable kind="type" rows={data.types} types={data.types} units={data.units} title="Jenis Barang" /></PageShell>
  if (mode === "units") return <PageShell title="Satuan" description="Master satuan barang warehouse repair."><MasterTable kind="unit" rows={data.units} types={data.types} units={data.units} title="Satuan" /></PageShell>
  if (mode === "inbound") return <PageShell title="Barang Masuk" description="Pencatatan barang masuk dan penambahan stok."><TransactionTable rows={data.inbound} items={data.items} title="Barang Masuk" kind="in" /></PageShell>
  if (mode === "outbound") return <PageShell title="Barang Keluar" description="Pencatatan barang keluar dan pengurangan stok."><TransactionTable rows={data.outbound} items={data.items} title="Barang Keluar" kind="out" /></PageShell>
  if (mode === "stock-report") return <PageShell title="Laporan Stok" description="Laporan posisi stok dan minimum stock."><ItemTable rows={data.items} types={data.types} units={data.units} title="Laporan Stok" report /></PageShell>
  if (mode === "inbound-report") return <PageShell title="Laporan Barang Masuk" description="Laporan riwayat transaksi barang masuk."><TransactionTable rows={data.inbound} items={data.items} title="Laporan Barang Masuk" kind="in" report /></PageShell>
  return <PageShell title="Laporan Barang Keluar" description="Laporan riwayat transaksi barang keluar."><TransactionTable rows={data.outbound} items={data.items} title="Laporan Barang Keluar" kind="out" report /></PageShell>
}
