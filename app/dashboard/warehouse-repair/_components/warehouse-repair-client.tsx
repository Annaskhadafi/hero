"use client"
// Invalidate Turbopack HMR cache

import { useMemo, useState, useTransition } from "react"
import { ArrowRightLeft, Boxes, Check, ChevronsUpDown, Download, Eye, FilePenLine, FileText, Package, PackageMinus, PackagePlus, Plus, Printer, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { uploadFile } from "@/app/actions/upload"
import { createCargoManifestFromOutbound, type CargoManifestRecord } from "@/app/actions/cargo-manifest"
import { CargoManifestPdfDialog } from "@/components/cargo-manifest-panels"
import { resolveClientUploadUrl } from "@/lib/client-url"

import {
  createWarehouseRepairInbound,
  createWarehouseRepairOutbound,
  deleteWarehouseRepairInbound,
  deleteWarehouseRepairItem,
  deleteWarehouseRepairOutbound,
  deleteWarehouseRepairType,
  deleteWarehouseRepairUnit,
  updateWarehouseRepairInbound,
  updateWarehouseRepairOutbound,
  upsertWarehouseRepairItem,
  upsertWarehouseRepairType,
  upsertWarehouseRepairUnit,
  bulkImportWarehouseRepairItems,
  createWarehouseRepairTransfer,
} from "@/app/actions/warehouse-repair"
import { Badge } from "@/components/ui/badge"
import { AdminImportDialog } from "@/components/admin/admin-import-dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { EnterpriseFormGrid, EnterpriseRecordDialog, type TableRbacAccess } from "@/components/ui/enterprise-table-kit"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableMultiFilter } from "@/components/ui/table-multi-filter"
import { Textarea } from "@/components/ui/textarea"

type Mode = "overview" | "items" | "types" | "units" | "inbound" | "outbound" | "stock-report" | "inbound-report" | "outbound-report"
type Row = Record<string, any>
type Props = { mode: Mode; data: { items: Row[]; types: Row[]; units: Row[]; inbound: Row[]; outbound: Row[]; metrics?: Record<string, number> } }
type ActionResult = { success: boolean; error?: string }

const access: TableRbacAccess = { canView: true, canEdit: true, canDelete: true, canSelectAll: false }
const itemColumns = ["Kode", "Material Desc", "Nama Barang", "Category/Jenis", "Satuan/UOM", "S-Loc", "S-Loc Desc", "Stok/Qty", "Minimum", "Status", "Aksi"]
const itemReportColumns = itemColumns.slice(0, -1)
const masterColumns = ["Kode", "Nama", "Status", "Aksi"]
const trxColumns = ["No Transaksi", "Tanggal", "Kode Barang", "Material Desc", "Nama Barang", "Category/Jenis", "Satuan/UOM", "S-Loc", "S-Loc Desc", "Qty", "Keterangan", "Aksi"]
const reportTrxColumns = ["No Transaksi", "Tanggal", "Kode Barang", "Material Desc", "Nama Barang", "Category/Jenis", "Satuan/UOM", "S-Loc", "S-Loc Desc", "Qty", "Keterangan"]

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
  return <EnterpriseFormGrid>{labels.map(([key, label]) => <div key={key} className="rounded-xl border border-border/70 bg-muted/20 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 break-words text-sm font-medium">{String(row[key] ?? "-")}</div></div>)}</EnterpriseFormGrid>
}


function ActionIconButton({ kind, label, onClick }: { kind: "view" | "edit" | "delete"; label: string; onClick: () => void }) {
  const Icon = kind === "view" ? Eye : kind === "edit" ? FilePenLine : Trash2
  return (
    <Button type="button" variant="ghost" size="denseIcon" aria-label={label} onClick={onClick}>
      <Icon className={kind === "delete" ? "size-4 text-destructive" : "size-4"} />
    </Button>
  )
}

function DialogActionButtons({ onView, onEdit, onDelete }: { onView?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex min-w-max items-center justify-end gap-1.5">
      {onView ? <ActionIconButton kind="view" label="View detail" onClick={onView} /> : null}
      {onEdit ? <ActionIconButton kind="edit" label="Edit data" onClick={onEdit} /> : null}
      {onDelete ? <ActionIconButton kind="delete" label="Delete data" onClick={onDelete} /> : null}
    </div>
  )
}

function DeleteDialog({ title, description, open, onOpenChange, row, labels, action }: { title: string; description: string; open: boolean; onOpenChange: (open: boolean) => void; row: Row; labels: Array<[string, string]>; action: () => Promise<ActionResult> }) {
  const [pending, start] = useTransition()
  const remove = () => start(async () => {
    const res = await action()
    if (res.success) { toast.success("Data berhasil dihapus"); reload() } else toast.error(res.error ?? "Gagal menghapus data")
  })
  return (
    <EnterpriseRecordDialog open={open} onOpenChange={onOpenChange} title={title} description={description} mode="delete" access={access} footer={<Button variant="destructive" disabled={pending} onClick={remove}>Hapus Data</Button>}>
      <DetailGrid row={row} labels={labels} />
    </EnterpriseRecordDialog>
  )
}

function ViewDialog({
  title,
  open,
  onOpenChange,
  row,
  labels,
  onEditClick,
  onPrintCargo,
}: {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  row: Row
  labels: Array<[string, string]>
  onEditClick?: () => void
  onPrintCargo?: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <EnterpriseRecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      mode="view"
      access={access}
      className="sm:max-w-4xl"
    >
      <div className="flex flex-col gap-6 md:flex-row">
        {row.photoUrl && row.photoUrl.trim() ? (
          <div className="flex flex-col items-center gap-2 md:w-1/3">
            <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border bg-muted/30 flex items-center justify-center">
              {!imgError ? (
                <img
                  src={resolveClientUploadUrl(row.photoUrl)}
                  alt={row.itemName || "Foto produk"}
                  className="h-full w-full object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center gap-2">
                  <Package className="size-12 opacity-30" />
                  <span className="text-xs font-medium">Foto tidak dapat dimuat</span>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Foto Produk</div>
          </div>
        ) : null}

        <div className="flex-1 space-y-6">
          <div className="rounded-xl border border-border/70 bg-muted/10 p-5">
            <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Spesifikasi Item
              </span>
              <div className="flex items-center gap-2">
                {onPrintCargo && (
                  <Button
                    onClick={onPrintCargo}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950"
                  >
                    <FileText className="size-4" /> Cargo Manifest
                  </Button>
                )}
                {onEditClick && (
                  <Button
                    onClick={() => {
                      onOpenChange(false)
                      onEditClick()
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <FilePenLine className="size-4" /> Edit Data
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {labels.map(([key, label]) => {
                if (key === "photoUrl" || key === "status") return null
                return (
                  <div key={key} className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <p className="break-words text-sm font-semibold text-foreground">
                      {String(row[key] ?? "-")}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/10 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Status Aktif:</span>
              <Badge variant={row.isActive ? "default" : "outline"}>
                {row.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </EnterpriseRecordDialog>
  )
}

function MasterDialog({ kind, row, types, units, trigger, open, onOpenChange }: { kind: "item" | "type" | "unit"; row?: Row; types: Row[]; units: Row[]; trigger?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [pending, start] = useTransition()
  const [form, setForm] = useState<Row>(row ?? { itemName: "", materialDesc: "", storageLocation: "", storageLocationDesc: "", minimumStock: 0, typeId: null, unitId: null, typeName: "", unitName: "", isActive: true })
  const [previewUrl, setPreviewUrl] = useState("")
  const [previewError, setPreviewError] = useState(false)
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const title = `${row ? "Edit" : "Tambah"} ${kind === "item" ? "Barang" : kind === "type" ? "Jenis Barang" : "Satuan"}`
  const save = () => start(async () => {
    const res = kind === "item"
      ? await upsertWarehouseRepairItem({ itemCode: form.itemCode, itemName: form.itemName, materialDesc: form.materialDesc, storageLocation: form.storageLocation, storageLocationDesc: form.storageLocationDesc, minimumStock: Number(form.minimumStock || 0), typeId: form.typeId ? Number(form.typeId) : null, unitId: form.unitId ? Number(form.unitId) : null, photoUrl: form.photoUrl ?? "", isActive: form.isActive ?? true }, row?.id)
      : kind === "type"
        ? await upsertWarehouseRepairType({ typeCode: form.typeCode, typeName: form.typeName, isActive: form.isActive ?? true }, row?.id)
        : await upsertWarehouseRepairUnit({ unitCode: form.unitCode, unitName: form.unitName, isActive: form.isActive ?? true }, row?.id)
    if (res.success) { toast.success("Data tersimpan"); reload() } else toast.error(res.error)
  })
  return (
    <EnterpriseRecordDialog trigger={trigger} open={open} onOpenChange={onOpenChange} title={title} mode="form" access={access} footer={<Button disabled={pending} onClick={save}>Simpan</Button>}>
      <EnterpriseFormGrid>
        {kind === "item" ? <>
          <Field label="Kode Barang"><Input value={form.itemCode ?? ""} placeholder="Auto jika kosong" onChange={(e) => set("itemCode", e.target.value)} /></Field>
          <Field label="Material Desc"><Input value={form.materialDesc ?? ""} onChange={(e) => set("materialDesc", e.target.value)} /></Field>
          <Field label="Nama Barang"><Input value={form.itemName ?? ""} onChange={(e) => set("itemName", e.target.value)} /></Field>
          <Field label="Jenis"><Select value={String(form.typeId ?? "none")} onValueChange={(v) => set("typeId", v === "none" ? null : Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-</SelectItem>{types.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.typeName}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Satuan"><Select value={String(form.unitId ?? "none")} onValueChange={(v) => set("unitId", v === "none" ? null : Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-</SelectItem>{units.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.unitName}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="S-Loc"><Input value={form.storageLocation ?? ""} onChange={(e) => set("storageLocation", e.target.value)} /></Field>
          <Field label="S-Loc Desc"><Input value={form.storageLocationDesc ?? ""} onChange={(e) => set("storageLocationDesc", e.target.value)} /></Field>
          <Field label="Stok Minimum"><Input type="number" value={form.minimumStock ?? 0} onChange={(e) => set("minimumStock", e.target.value)} /></Field>
          <Field label="Foto Produk">
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const localPreview = URL.createObjectURL(file);
                  setPreviewUrl(localPreview);
                  setPreviewError(false);
                  const formData = new FormData();
                  formData.append("file", file);
                  const toastId = toast.loading("Mengunggah foto...");
                  try {
                    const res = await uploadFile(formData);
                    if (res.success && res.url) {
                      set("photoUrl", res.url);
                      toast.success("Foto berhasil diunggah", { id: toastId });
                    } else {
                      toast.error(res.error || "Gagal mengunggah foto", { id: toastId });
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Gagal mengunggah foto", { id: toastId });
                  }
                }}
              />
              {(previewUrl || form.photoUrl) && (
                <div className="relative mt-2 h-32 w-32 overflow-hidden rounded-lg border border-border bg-muted/20">
                  {previewError ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted-foreground">
                      <Package className="size-8 opacity-30" />
                      Foto tidak dapat dimuat
                    </div>
                  ) : (
                    <img
                      src={resolveClientUploadUrl(previewUrl || form.photoUrl)}
                      alt="Preview produk"
                      className="h-full w-full object-cover"
                      onError={() => setPreviewError(true)}
                    />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="denseIcon"
                    className="absolute right-1 top-1"
                    onClick={() => {
                      setPreviewUrl("");
                      setPreviewError(false);
                      set("photoUrl", "");
  const detailLabels: Array<[string, string]> = [["itemCode", "Kode Barang"], ["materialDesc", "Material Desc"], ["itemName", "Nama Barang"], ["typeName", "Jenis"], ["unitName", "Satuan"], ["storageLocation", "S-Loc"], ["storageLocationDesc", "S-Loc Desc"], ["stock", "Stok"], ["minimumStock", "Minimum"], ["status", "Status"], ["photoUrl", "Foto URL"]]
  
  const importFields = [
    { key: "itemCode", label: "Kode Barang (Material Number)", required: true },
    { key: "itemName", label: "Nama Barang", required: true },
    { key: "materialDesc", label: "Material Desc (Technical Description)", required: false },
    { key: "categoryName", label: "Category / Jenis", required: false },
    { key: "unitName", label: "UOM / Satuan", required: false },
    { key: "storageLocation", label: "S-Loc", required: false },
    { key: "storageLocationDesc", label: "S-Loc Description", required: false },
    { key: "stock", label: "Stok / Qty", required: false },
    { key: "minimumStock", label: "Stok Minimum", required: false },
  ]

  const handleImport = async (payload: any) => {
    const toastId = toast.loading("Mengimport data barang...");
    const items = payload.rows.map((row: any) => {
      const item: any = {};
      for (const field of importFields) {
        const fileCol = payload.mapping[field.key];
        const colIndex = payload.headers.indexOf(fileCol);
        item[field.key] = colIndex !== -1 ? row[colIndex] : "";
      }
      return item;
    });

    try {
      const res = await bulkImportWarehouseRepairItems(items);
      if (res.success) {
        toast.success("Data barang berhasil diimport", { id: toastId });
        reload();
      } else {
        toast.error(res.error || "Gagal mengimport data barang", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengimport data barang", { id: toastId });
    }
  };

  const importAction = (
    <AdminImportDialog
      title="Import Data Barang"
      fields={importFields}
      onConfirm={handleImport}
    />
  )

  return <MinimalTableShell label={title.toLowerCase()} fileName={title} searchPlaceholder={`Cari ${title.toLowerCase()}...`} showImport={!report} importAction={importAction} access={access} filters={<><TableMultiFilter label="jenis" filterKey="type" options={typeOptions} /><TableMultiFilter label="satuan" filterKey="unit" options={unitOptions} /><TableMultiFilter label="status stok" filterKey="stock" options={[{ value: "low", label: "Low stock" }, { value: "safe", label: "Stok aman" }]} /></>} primaryAction={!report ? <div className="flex items-center gap-2"><MasterDialog kind="item" types={types} units={units} trigger={<Button><Plus className="mr-2 h-4 w-4" />Tambah Barang</Button>} /><TransferDialog items={rows} trigger={<Button variant="outline"><ArrowRightLeft className="mr-2 h-4 w-4" />Transfer Stok</Button>} /></div> : undefined} columnOptions={columns.map((c, i) => ({ key: c, label: c, required: i < 2 }))} dateFilter={false} scorecards={[{ label: "Barang", value: rows.length, icon: <Boxes className="size-4 text-primary" />, tone: "info" }, { label: "Total Stok", value: rows.reduce((s, i) => s + Number(i.stock ?? 0), 0), tone: "default" }, { label: "Low Stock", value: rows.filter((i) => Number(i.stock ?? 0) <= Number(i.minimumStock ?? 0)).length, tone: "warning" }, { label: "Aktif", value: rows.filter((i) => i.isActive).length, tone: "success" }]}>
    <Table><TableHeader><TableRow>{columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows.map((r) => { const detailRow = { ...r, status: statusLabel(r.isActive) }; return <TableRow key={r.id} data-filter-type={r.typeName ?? ""} data-filter-unit={r.unitName ?? ""} data-filter-stock={Number(r.stock ?? 0) <= Number(r.minimumStock ?? 0) ? "low" : "safe"}><TableCell className="font-mono text-xs font-semibold text-primary">{r.itemCode}</TableCell><TableCell>{r.materialDesc ?? "-"}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.typeName ?? "-"}</TableCell><TableCell>{r.unitName ?? "-"}</TableCell><TableCell>{r.storageLocation ?? "-"}</TableCell><TableCell>{r.storageLocationDesc ?? "-"}</TableCell><TableCell>{r.stock}</TableCell><TableCell>{r.minimumStock}</TableCell><TableCell><Badge variant={r.isActive ? "default" : "outline"}>{statusLabel(r.isActive)}</Badge></TableCell>{!report ? <TableCell><ItemActions row={r} types={types} units={units} labels={detailLabels} /></TableCell> : null}</TableRow> }) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">Belum ada data barang.</TableCell></TableRow>}</TableBody></Table>
  </MinimalTableShell>
}

function MasterTable({ kind, rows, types, units, title }: { kind: "type" | "unit"; rows: Row[]; types: Row[]; units: Row[]; title: string }) {
  const deleteAction = kind === "type" ? deleteWarehouseRepairType : deleteWarehouseRepairUnit
  const detailLabels: Array<[string, string]> = [["code", "Kode"], ["name", "Nama"], ["status", "Status"]]
  return <MinimalTableShell label={title.toLowerCase()} fileName={title} access={access} primaryAction={<MasterDialog kind={kind} types={types} units={units} trigger={<Button><Plus className="mr-2 h-4 w-4" />Tambah {title}</Button>} />} columnOptions={masterColumns.map((c, i) => ({ key: c, label: c, required: i < 2 }))} dateFilter={false}>
    <Table><TableHeader><TableRow>{masterColumns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows.map((r) => { const detailRow = { code: kind === "type" ? r.typeCode : r.unitCode, name: kind === "type" ? r.typeName : r.unitName, status: statusLabel(r.isActive) }; return <TableRow key={r.id}><TableCell className="font-mono text-xs font-semibold text-primary">{detailRow.code}</TableCell><TableCell>{detailRow.name}</TableCell><TableCell><Badge variant={r.isActive ? "default" : "outline"}>{detailRow.status}</Badge></TableCell><TableCell><MasterActions kind={kind} row={r} types={types} units={units} title={title} labels={detailLabels} deleteAction={deleteAction} /></TableCell></TableRow> }) : <TableRow><TableCell colSpan={masterColumns.length} className="h-24 text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>}</TableBody></Table>
  </MinimalTableShell>
}

function TransactionTable({ rows, items, title, kind, report = false }: { rows: Row[]; items: Row[]; title: string; kind: "in" | "out"; report?: boolean }) {
  const columns = report ? reportTrxColumns : trxColumns
  const deleteAction = kind === "in" ? deleteWarehouseRepairInbound : deleteWarehouseRepairOutbound
  const itemOptions = useMemo(() => items.map((i) => ({ value: i.itemName, label: i.itemName })), [items])
  const detailLabels: Array<[string, string]> = [
    ["transactionNo", "No Transaksi"],
    ["date", "Tanggal"],
    ["itemCode", "Kode Barang"],
    ["materialDesc", "Material Desc"],
    ["itemName", "Nama Barang"],
    ["typeName", "Category/Jenis"],
    ["unitName", "Satuan/UOM"],
    ["storageLocation", "S-Loc"],
    ["storageLocationDesc", "S-Loc Desc"],
    ["quantity", "Qty"],
    ["note", "Keterangan"]
  ]
  return <MinimalTableShell label={title.toLowerCase()} fileName={title} showImport={false} access={access} dateFilter filters={<TableMultiFilter label="barang" filterKey="item" options={itemOptions} />} primaryAction={!report ? <TransactionDialog kind={kind} items={items} trigger={<Button><Plus className="mr-2 h-4 w-4" />Entri Data</Button>} /> : undefined} columnOptions={columns.map((c, i) => ({ key: c, label: c, required: i < 2 }))} scorecards={[{ label: "Transaksi", value: rows.length, tone: "info", icon: kind === "in" ? <PackagePlus className="size-4 text-primary" /> : <PackageMinus className="size-4 text-primary" /> }, { label: "Total Qty", value: rows.reduce((s, r) => s + Number(r.quantity ?? 0), 0), tone: "default" }, { label: "Barang", value: new Set(rows.map((r) => r.itemId ?? r.itemCode)).size, tone: "success" }, { label: "Export", value: <Download className="size-5" />, tone: "warning" }]}>
    <Table><TableHeader><TableRow>{columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows.map((r) => { const detailRow = { ...r, date: fmtDate(r.transactionDate), note: r.note || "-" }; return <TableRow key={r.id} data-date-value={fmtDate(r.transactionDate)} data-filter-item={r.itemName ?? ""}><TableCell className="font-mono text-xs font-semibold text-primary">{r.transactionNo}</TableCell><TableCell>{fmtDate(r.transactionDate)}</TableCell><TableCell>{r.itemCode}</TableCell><TableCell>{r.materialDesc ?? "-"}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.typeName ?? "-"}</TableCell><TableCell>{r.unitName ?? "-"}</TableCell><TableCell>{r.storageLocation ?? "-"}</TableCell><TableCell>{r.storageLocationDesc ?? "-"}</TableCell><TableCell>{r.quantity}</TableCell><TableCell>{r.note || "-"}</TableCell>{!report ? <TableCell><TransactionActions kind={kind} row={r} items={items} title={title} labels={detailLabels} deleteAction={deleteAction} /></TableCell> : null}</TableRow> }) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">Belum ada data transaksi.</TableCell></TableRow>}</TableBody></Table>
  </MinimalTableShell>
}

export function WarehouseRepairClient({ mode, data }: Props) {
  const metrics = data.metrics ?? { items: data.items.length, lowStock: data.items.filter((i) => i.stock <= i.minimumStock).length, inbound: data.inbound.length, outbound: data.outbound.length, totalStock: data.items.reduce((s, i) => s + i.stock, 0) }
  if (mode === "overview") return <PageShell title="Dashboard" description="Ringkasan stok, transaksi masuk, dan transaksi keluar warehouse repair."><MinimalTableShell label="stok minimum" fileName="warehouse-repair-low-stock" showImport={false} searchPlaceholder="Cari stok minimum..." dateFilter={false} scorecards={[{ label: "Barang", value: metrics.items, tone: "info", icon: <Boxes className="size-4 text-primary" /> }, { label: "Total Stok", value: metrics.totalStock, tone: "default" }, { label: "Low Stock", value: metrics.lowStock, tone: "warning" }, { label: "Transaksi", value: Number(metrics.inbound ?? 0) + Number(metrics.outbound ?? 0), tone: "success" }]}><Table><TableHeader><TableRow>{itemReportColumns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{data.items.filter((i) => i.stock <= i.minimumStock).map((r) => <TableRow key={r.id}><TableCell className="font-mono text-xs font-semibold text-primary">{r.itemCode}</TableCell><TableCell>{r.materialDesc ?? "-"}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.typeName ?? "-"}</TableCell><TableCell>{r.unitName ?? "-"}</TableCell><TableCell>{r.storageLocation ?? "-"}</TableCell><TableCell>{r.storageLocationDesc ?? "-"}</TableCell><TableCell>{r.stock}</TableCell><TableCell>{r.minimumStock}</TableCell><TableCell><Badge variant="outline">Low stock</Badge></TableCell></TableRow>)}</TableBody></Table></MinimalTableShell></PageShell>
  if (mode === "items") return <PageShell title="Data Barang" description="Master barang dan posisi stok warehouse repair."><ItemTable rows={data.items} types={data.types} units={data.units} title="Data Barang" /></PageShell>
  if (mode === "types") return <PageShell title="Jenis Barang" description="Master kategori/jenis barang warehouse repair."><MasterTable kind="type" rows={data.types} types={data.types} units={data.units} title="Jenis Barang" /></PageShell>
  if (mode === "units") return <PageShell title="Satuan" description="Master satuan barang warehouse repair."><MasterTable kind="unit" rows={data.units} types={data.types} units={data.units} title="Satuan" /></PageShell>
  if (mode === "inbound") return <PageShell title="Barang Masuk" description="Pencatatan barang masuk dan penambahan stok."><TransactionTable rows={data.inbound} items={data.items} title="Barang Masuk" kind="in" /></PageShell>
  if (mode === "outbound") return <PageShell title="Barang Keluar" description="Pencatatan barang keluar dan pengurangan stok."><TransactionTable rows={data.outbound} items={data.items} title="Barang Keluar" kind="out" /></PageShell>
  if (mode === "stock-report") return <PageShell title="Laporan Stok" description="Laporan posisi stok dan minimum stock."><ItemTable rows={data.items} types={data.types} units={data.units} title="Laporan Stok" report /></PageShell>
  if (mode === "inbound-report") return <PageShell title="Laporan Barang Masuk" description="Laporan riwayat transaksi barang masuk."><TransactionTable rows={data.inbound} items={data.items} title="Laporan Barang Masuk" kind="in" report /></PageShell>
  return <PageShell title="Laporan Barang Keluar" description="Laporan riwayat transaksi barang keluar."><TransactionTable rows={data.outbound} items={data.items} title="Laporan Barang Keluar" kind="out" report /></PageShell>
}
