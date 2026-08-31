"use client"
// Invalidate Turbopack HMR cache

import { useMemo, useState, useTransition } from "react"
import { ArrowRightLeft, Boxes, Check, ChevronsUpDown, Download, Eye, FilePenLine, FileText, Package, PackageMinus, PackagePlus, Plus, Printer, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/lib/auth-client"
import { uploadFile } from "@/app/actions/upload"
import { createCargoManifestFromOutbound, createCargoManifestFromMultipleOutbound, type CargoManifestRecord } from "@/app/actions/cargo-manifest"
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
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </Field>
        </> : kind === "type" ? <><Field label="Kode Jenis"><Input value={form.typeCode ?? ""} placeholder="Auto jika kosong" onChange={(e) => set("typeCode", e.target.value)} /></Field><Field label="Nama Jenis"><Input value={form.typeName ?? ""} onChange={(e) => set("typeName", e.target.value)} /></Field></> : <><Field label="Kode Satuan"><Input value={form.unitCode ?? ""} placeholder="Auto jika kosong" onChange={(e) => set("unitCode", e.target.value)} /></Field><Field label="Nama Satuan"><Input value={form.unitName ?? ""} onChange={(e) => set("unitName", e.target.value)} /></Field></>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive ?? true} onChange={(e) => set("isActive", e.target.checked)} /> Aktif</label>
      </EnterpriseFormGrid>
    </EnterpriseRecordDialog>
  )
}

function ItemTable({ rows, types, units, title, report = false }: { rows: Row[]; types: Row[]; units: Row[]; title: string; report?: boolean }) {
  const typeOptions = useMemo(() => types.map((t) => ({ value: t.typeName, label: t.typeName })), [types])
  const unitOptions = useMemo(() => units.map((u) => ({ value: u.unitName, label: u.unitName })), [units])
  const columns = report ? itemReportColumns : itemColumns
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

function ItemActions({ row, types, units, labels }: { row: Row; types: Row[]; units: Row[]; labels: Array<[string, string]> }) {
  const [openView, setOpenView] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <ActionIconButton kind="view" label="Detail" onClick={() => setOpenView(true)} />
        <ActionIconButton kind="edit" label="Edit" onClick={() => setOpenEdit(true)} />
        <ActionIconButton kind="delete" label="Hapus" onClick={() => setOpenDelete(true)} />
      </div>
      <ViewDialog title="Detail Barang" open={openView} onOpenChange={setOpenView} row={row} labels={labels} onEditClick={() => { setOpenView(false); setOpenEdit(true) }} />
      <MasterDialog kind="item" row={row} types={types} units={units} open={openEdit} onOpenChange={setOpenEdit} />
      <DeleteDialog title="Hapus Barang" description="Apakah Anda yakin ingin menghapus data barang ini?" open={openDelete} onOpenChange={setOpenDelete} row={row} labels={labels} action={() => deleteWarehouseRepairItem(row.id)} />
    </>
  )
}

function MasterActions({ kind, row, types, units, title, labels, deleteAction }: { kind: "type" | "unit"; row: Row; types: Row[]; units: Row[]; title: string; labels: Array<[string, string]>; deleteAction: (id: number) => Promise<{ success: boolean; error?: string }> }) {
  const [openView, setOpenView] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <ActionIconButton kind="view" label="Detail" onClick={() => setOpenView(true)} />
        <ActionIconButton kind="edit" label="Edit" onClick={() => setOpenEdit(true)} />
        <ActionIconButton kind="delete" label="Hapus" onClick={() => setOpenDelete(true)} />
      </div>
      <ViewDialog title={`Detail ${title}`} open={openView} onOpenChange={setOpenView} row={row} labels={labels} onEditClick={() => { setOpenView(false); setOpenEdit(true) }} />
      <MasterDialog kind={kind} row={row} types={types} units={units} open={openEdit} onOpenChange={setOpenEdit} />
      <DeleteDialog title={`Hapus ${title}`} description="Apakah Anda yakin ingin menghapus data ini?" open={openDelete} onOpenChange={setOpenDelete} row={row} labels={labels} action={() => deleteAction(row.id)} />
    </>
  )
}

function MasterTable({ kind, rows, types, units, title }: { kind: "type" | "unit"; rows: Row[]; types: Row[]; units: Row[]; title: string }) {
  const deleteAction = kind === "type" ? deleteWarehouseRepairType : deleteWarehouseRepairUnit
  const detailLabels: Array<[string, string]> = [["code", "Kode"], ["name", "Nama"], ["status", "Status"]]
  return <MinimalTableShell label={title.toLowerCase()} fileName={title} access={access} primaryAction={<MasterDialog kind={kind} types={types} units={units} trigger={<Button><Plus className="mr-2 h-4 w-4" />Tambah {title}</Button>} />} columnOptions={masterColumns.map((c, i) => ({ key: c, label: c, required: i < 2 }))} dateFilter={false}>
    <Table><TableHeader><TableRow>{masterColumns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows.map((r) => { const detailRow = { code: kind === "type" ? r.typeCode : r.unitCode, name: kind === "type" ? r.typeName : r.unitName, status: statusLabel(r.isActive) }; return <TableRow key={r.id}><TableCell className="font-mono text-xs font-semibold text-primary">{detailRow.code}</TableCell><TableCell>{detailRow.name}</TableCell><TableCell><Badge variant={r.isActive ? "default" : "outline"}>{detailRow.status}</Badge></TableCell><TableCell><MasterActions kind={kind} row={r} types={types} units={units} title={title} labels={detailLabels} deleteAction={deleteAction} /></TableCell></TableRow> }) : <TableRow><TableCell colSpan={masterColumns.length} className="h-24 text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>}</TableBody></Table>
  </MinimalTableShell>
}

function ItemCombobox({
  items,
  value,
  onChange,
}: {
  items: Row[]
  value: string
  onChange: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedItem = items.find((i) => String(i.id) === String(value))

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (i) =>
        (i.itemCode && i.itemCode.toLowerCase().includes(q)) ||
        (i.itemName && i.itemName.toLowerCase().includes(q)) ||
        (i.materialDesc && i.materialDesc.toLowerCase().includes(q)) ||
        (i.storageLocation && i.storageLocation.toLowerCase().includes(q)) ||
        (i.typeName && i.typeName.toLowerCase().includes(q))
    )
  }, [items, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 px-3 text-xs font-normal"
        >
          <span className="truncate">
            {selectedItem
              ? `${selectedItem.itemCode} - ${selectedItem.materialDesc ? selectedItem.materialDesc + " | " : ""}${selectedItem.itemName}`
              : "Cari & Pilih Barang..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Ketik kode, nama, material desc, s-loc..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[280px] overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                Barang tidak ditemukan.
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredItems.map((i) => {
                  const isSelected = String(i.id) === String(value)
                  return (
                    <CommandItem
                      key={i.id}
                      value={String(i.id)}
                      onSelect={() => {
                        onChange(String(i.id))
                        setOpen(false)
                      }}
                      className="flex items-start justify-between gap-2 p-2.5 text-xs cursor-pointer rounded-md hover:bg-accent"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-primary font-semibold">{i.itemCode}</span>
                          <span className="font-semibold text-foreground">{i.itemName}</span>
                        </div>
                        {i.materialDesc && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[340px]">
                            {i.materialDesc}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>S-Loc: {i.storageLocation || "-"}</span>
                          <span>Jenis: {i.typeName || "-"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          Stok: {i.stock}
                        </Badge>
                        {isSelected && <Check className="size-3.5 text-primary" />}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const PRESET_SLOCS = [
  { code: "RS01", desc: "Balikpapan" },
  { code: "RS02", desc: "Samarinda" },
  { code: "RS03", desc: "Sangatta" },
  { code: "RS04", desc: "Tabang" },
  { code: "RS05", desc: "Berau" },
  { code: "HO01", desc: "Jakarta Head Office" },
]

function TransferDialog({
  items,
  defaultItem,
  trigger,
  open,
  onOpenChange,
}: {
  items: Row[]
  defaultItem?: Row
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [pending, start] = useTransition()
  const [itemId, setItemId] = useState(defaultItem ? String(defaultItem.id) : "")
  const [transactionDate, setTransactionDate] = useState(today())
  const [toSLoc, setToSLoc] = useState("RS02")
  const [toSLocDesc, setToSLocDesc] = useState("Samarinda")
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")
  const [updateItemLocation, setUpdateItemLocation] = useState(false)

  const selectedItem = items.find((i) => String(i.id) === String(itemId))

  const handleSelectPreset = (code: string, desc: string) => {
    setToSLoc(code)
    setToSLocDesc(desc)
  }

  const save = () =>
    start(async () => {
      if (!selectedItem) {
        toast.error("Pilih barang terlebih dahulu")
        return
      }
      if (quantity > selectedItem.stock) {
        toast.error(`Stok tidak mencukupi (stok saat ini: ${selectedItem.stock})`)
        return
      }

      const res = await createWarehouseRepairTransfer({
        transactionDate,
        itemId: Number(itemId),
        fromSLoc: selectedItem.storageLocation || "RS01",
        fromSLocDesc: selectedItem.storageLocationDesc || "Balikpapan",
        toSLoc,
        toSLocDesc,
        quantity: Number(quantity),
        note,
        updateItemLocation,
      })

      if (res.success) {
        toast.success("Transfer stok berhasil dilakukan")
        reload()
      } else {
        toast.error(res.error)
      }
    })

  return (
    <EnterpriseRecordDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer Stok Antar Warehouse (S-Loc)"
      mode="form"
      access={access}
      footer={
        <Button disabled={pending || !itemId || quantity <= 0} onClick={save}>
          Proses Transfer
        </Button>
      }
    >
      <EnterpriseFormGrid>
        <Field label="Tanggal Transfer">
          <Input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </Field>

        <Field label="Pilih Barang">
          <ItemCombobox items={items} value={itemId} onChange={(val) => setItemId(val)} />
        </Field>

        {selectedItem && (
          <div className="col-span-full rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary">
                {selectedItem.itemCode} — {selectedItem.itemName}
              </span>
              <Badge variant="outline">Stok Tersedia: {selectedItem.stock}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
              <div>
                <span className="font-medium text-foreground">S-Loc Asal:</span>{" "}
                {selectedItem.storageLocation || "-"} ({selectedItem.storageLocationDesc || "-"})
              </div>
              <div>
                <span className="font-medium text-foreground">Material Desc:</span>{" "}
                {selectedItem.materialDesc || "-"}
              </div>
            </div>
          </div>
        )}

        <div className="col-span-full space-y-2">
          <Label className="text-xs font-medium">Pilih Preset S-Loc Tujuan (Warehouse)</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SLOCS.map((preset) => (
              <Button
                key={preset.code}
                type="button"
                variant={toSLoc === preset.code ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => handleSelectPreset(preset.code, preset.desc)}
              >
                {preset.code} - {preset.desc}
              </Button>
            ))}
          </div>
        </div>

        <Field label="S-Loc Kode Tujuan">
          <Input
            value={toSLoc}
            placeholder="Contoh: RS02"
            onChange={(e) => setToSLoc(e.target.value)}
          />
        </Field>
        <Field label="S-Loc Deskripsi Tujuan">
          <Input
            value={toSLocDesc}
            placeholder="Contoh: Samarinda Warehouse"
            onChange={(e) => setToSLocDesc(e.target.value)}
          />
        </Field>

        <Field label="Jumlah Transfer (Qty)">
          <Input
            type="number"
            min={1}
            max={selectedItem?.stock || 99999}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </Field>

        <Field label="Keterangan">
          <Textarea
            value={note}
            placeholder="Catatan transfer stok..."
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <label className="col-span-full flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={updateItemLocation}
            onChange={(e) => setUpdateItemLocation(e.target.checked)}
            className="rounded border-border"
          />
          Update lokasi utama barang ke S-Loc Tujuan ({toSLoc} - {toSLocDesc})
        </label>
      </EnterpriseFormGrid>
    </EnterpriseRecordDialog>
  )
}

function TransactionDialog({ kind, items, row, trigger, open, onOpenChange }: { kind: "in" | "out"; items: Row[]; row?: Row; trigger?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [pending, start] = useTransition()
  const [form, setForm] = useState({
    transactionDate: fmtDate(row?.transactionDate ?? today()),
    itemId: row?.itemId ? String(row.itemId) : "",
    quantity: Number(row?.quantity ?? 1),
    targetSLoc: row?.targetSLoc || "RS01",
    targetSLocDesc: row?.targetSLocDesc || "Balikpapan",
    updateItemLocation: false,
    outboundType: row?.outboundType ?? "Pemakaian Internal",
    destinationSLoc: row?.destinationSLoc ?? "RS02",
    destinationSLocDesc: row?.destinationSLocDesc ?? "Samarinda",
    note: row?.note ?? "",
  })
  const selectedItem = items.find((i) => String(i.id) === String(form.itemId))

  const handleSelectPreset = (code: string, desc: string, target: "in" | "out") => {
    if (target === "in") {
      setForm((f) => ({ ...f, targetSLoc: code, targetSLocDesc: desc }))
    } else {
      setForm((f) => ({ ...f, destinationSLoc: code, destinationSLocDesc: desc }))
    }
  }

  const save = () => start(async () => {
    const input = {
      transactionDate: form.transactionDate,
      itemId: Number(form.itemId),
      quantity: Number(form.quantity),
      targetSLoc: form.targetSLoc,
      targetSLocDesc: form.targetSLocDesc,
      updateItemLocation: form.updateItemLocation,
      outboundType: form.outboundType,
      destinationSLoc: form.outboundType === "Stock Transfer" ? form.destinationSLoc : "",
      destinationSLocDesc: form.outboundType === "Stock Transfer" ? form.destinationSLocDesc : "",
      note: form.note,
    }
    const res = row
      ? kind === "in" ? await updateWarehouseRepairInbound(row.id, input) : await updateWarehouseRepairOutbound(row.id, input)
      : kind === "in" ? await createWarehouseRepairInbound(input) : await createWarehouseRepairOutbound(input)
    if (res.success) { toast.success("Transaksi tersimpan"); reload() } else toast.error(res.error)
  })

  return (
    <EnterpriseRecordDialog trigger={trigger} open={open} onOpenChange={onOpenChange} title={`${row ? "Edit" : "Entri"} Barang ${kind === "in" ? "Masuk" : "Keluar"}`} mode="form" access={access} footer={<Button disabled={pending || !form.itemId} onClick={save}>Simpan</Button>}>
      <EnterpriseFormGrid>
        <Field label="Tanggal"><Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} /></Field>
        <Field label="Pilih Barang (Cari)">
          <ItemCombobox items={items} value={form.itemId} onChange={(val) => setForm({ ...form, itemId: val })} />
        </Field>

        {selectedItem && (
          <div className="col-span-full rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs space-y-1.5">
            <div className="font-semibold text-primary">{selectedItem.itemCode} — {selectedItem.itemName}</div>
            {selectedItem.materialDesc && <div className="text-muted-foreground"><span className="font-medium">Material Desc:</span> {selectedItem.materialDesc}</div>}
            <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
              <div><span className="font-medium">Category:</span> {selectedItem.typeName || "-"}</div>
              <div><span className="font-medium">Satuan:</span> {selectedItem.unitName || "-"}</div>
              <div><span className="font-medium">S-Loc Utama:</span> {selectedItem.storageLocation || "-"} ({selectedItem.storageLocationDesc || "-"})</div>
              <div><span className="font-medium">Stok Saat Ini:</span> <Badge variant="outline" className="ml-1">{selectedItem.stock}</Badge></div>
            </div>
          </div>
        )}

        {kind === "in" && (
          <div className="col-span-full space-y-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <Label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">S-Loc / Warehouse Penambahan Stok</Label>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Preset S-Loc Warehouse</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SLOCS.map((preset) => (
                  <Button
                    key={preset.code}
                    type="button"
                    variant={form.targetSLoc === preset.code ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    onClick={() => handleSelectPreset(preset.code, preset.desc, "in")}
                  >
                    {preset.code} - {preset.desc}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="S-Loc Kode">
                <Input
                  value={form.targetSLoc}
                  placeholder="Contoh: RS01"
                  onChange={(e) => setForm((f) => ({ ...f, targetSLoc: e.target.value }))}
                />
              </Field>
              <Field label="S-Loc Deskripsi">
                <Input
                  value={form.targetSLocDesc}
                  placeholder="Contoh: Balikpapan Warehouse"
                  onChange={(e) => setForm((f) => ({ ...f, targetSLocDesc: e.target.value }))}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.updateItemLocation}
                onChange={(e) => setForm((f) => ({ ...f, updateItemLocation: e.target.checked }))}
                className="rounded border-border"
              />
              Update lokasi utama barang ke S-Loc ini ({form.targetSLoc} - {form.targetSLocDesc})
            </label>
          </div>
        )}

        {kind === "out" && (
          <div className="col-span-full space-y-3 rounded-xl border border-blue-200/70 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <Label className="text-xs font-semibold text-blue-900 dark:text-blue-200">Tujuan / Jenis Pengeluaran Barang</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                <input
                  type="radio"
                  name="outboundType"
                  value="Pemakaian Internal"
                  checked={form.outboundType === "Pemakaian Internal"}
                  onChange={() => setForm((f) => ({ ...f, outboundType: "Pemakaian Internal" }))}
                  className="text-primary"
                />
                Pemakaian Internal
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                <input
                  type="radio"
                  name="outboundType"
                  value="Stock Transfer"
                  checked={form.outboundType === "Stock Transfer"}
                  onChange={() => setForm((f) => ({ ...f, outboundType: "Stock Transfer" }))}
                  className="text-primary"
                />
                Stock Transfer (Pindah S-Loc)
              </label>
            </div>

            {form.outboundType === "Stock Transfer" && (
              <div className="pt-2 space-y-3 border-t border-blue-200/60 dark:border-blue-900/40">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Preset S-Loc Tujuan (Warehouse)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SLOCS.map((preset) => (
                      <Button
                        key={preset.code}
                        type="button"
                        variant={form.destinationSLoc === preset.code ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        onClick={() => handleSelectPreset(preset.code, preset.desc, "out")}
                      >
                        {preset.code} - {preset.desc}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="S-Loc Kode Tujuan">
                    <Input
                      value={form.destinationSLoc}
                      placeholder="Contoh: RS02"
                      onChange={(e) => setForm((f) => ({ ...f, destinationSLoc: e.target.value }))}
                    />
                  </Field>
                  <Field label="S-Loc Deskripsi Tujuan">
                    <Input
                      value={form.destinationSLocDesc}
                      placeholder="Contoh: Samarinda Warehouse"
                      onChange={(e) => setForm((f) => ({ ...f, destinationSLocDesc: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        )}
        <Field label="Jumlah (Qty)"><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
        <Field label="Keterangan"><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Catatan transaksi..." /></Field>
      </EnterpriseFormGrid>
    </EnterpriseRecordDialog>
  )
}

const inboundTrxColumns = ["No Transaksi", "Tanggal", "Kode Barang", "Material Desc", "Nama Barang", "Category/Jenis", "Satuan/UOM", "S-Loc Tujuan", "Deskripsi S-Loc", "Qty", "Keterangan"]
const outboundTrxColumns = ["No Transaksi", "Tanggal", "Kode Barang", "Material Desc", "Nama Barang", "Category/Jenis", "Satuan/UOM", "S-Loc Asal", "Deskripsi S-Loc Asal", "Tipe Keluar", "S-Loc Tujuan", "Deskripsi S-Loc Tujuan", "Qty", "Keterangan"]

function TransactionActions({
  kind,
  row,
  items,
  title,
  labels,
  deleteAction,
}: {
  kind: "in" | "out"
  row: Row
  items: Row[]
  title: string
  labels: Array<[string, string]>
  deleteAction: (id: number) => Promise<{ success: boolean; error?: string }>
}) {
  const [openView, setOpenView] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [openCargoPdf, setOpenCargoPdf] = useState(false)
  const [cargoManifest, setCargoManifest] = useState<CargoManifestRecord | null>(null)
  const [loadingCargo, startCargo] = useTransition()

  const { data: session } = useSession()
  const userSignerName = session?.user?.name || ""

  const handleCreateCargo = () => {
    startCargo(async () => {
      const toastId = toast.loading("Menyiapkan dokumen Cargo Manifest...")
      try {
        const res = await createCargoManifestFromOutbound(row.id, userSignerName)
        if (res.success && res.manifest) {
          toast.success("Cargo Manifest siap dicetak", { id: toastId })
          setCargoManifest(res.manifest)
          setOpenView(false)
          setOpenCargoPdf(true)
        } else {
          toast.error(res.error || "Gagal membuat Cargo Manifest", { id: toastId })
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal membuat Cargo Manifest", { id: toastId })
      }
    })
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {kind === "out" && (
          <Button
            type="button"
            variant="ghost"
            size="denseIcon"
            title="Print Cargo Manifest PDF"
            disabled={loadingCargo}
            onClick={handleCreateCargo}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <FileText className="size-4" />
          </Button>
        )}
        <ActionIconButton kind="view" label="Detail" onClick={() => setOpenView(true)} />
        <ActionIconButton kind="edit" label="Edit" onClick={() => setOpenEdit(true)} />
        <ActionIconButton kind="delete" label="Hapus" onClick={() => setOpenDelete(true)} />
      </div>

      <ViewDialog
        title={`Detail ${title}`}
        open={openView}
        onOpenChange={setOpenView}
        row={row}
        labels={labels}
        onEditClick={() => setOpenEdit(true)}
        onPrintCargo={kind === "out" ? handleCreateCargo : undefined}
      />
      <TransactionDialog
        kind={kind}
        items={items}
        row={row}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />
      <DeleteDialog
        title={`Hapus ${title}`}
        description="Apakah Anda yakin ingin menghapus data transaksi ini?"
        open={openDelete}
        onOpenChange={setOpenDelete}
        row={row}
        labels={labels}
        action={() => deleteAction(row.id)}
      />
      {cargoManifest && (
        <CargoManifestPdfDialog
          row={cargoManifest}
          open={openCargoPdf}
          onOpenChange={setOpenCargoPdf}
          trigger={null}
        />
      )}
    </>
  )
}

function TransactionTable({ rows, items, title, kind, report = false }: { rows: Row[]; items: Row[]; title: string; kind: "in" | "out"; report?: boolean }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkManifest, setBulkManifest] = useState<CargoManifestRecord | null>(null)
  const [bulkPdfOpen, setBulkPdfOpen] = useState(false)
  const [loadingBulk, startBulk] = useTransition()
  const { data: session } = useSession()
  const userSignerName = session?.user?.name || ""

  const baseColumns = kind === "in" ? inboundTrxColumns : outboundTrxColumns
  const columns = report
    ? baseColumns
    : kind === "out"
      ? ["Sel", ...baseColumns, "Aksi"]
      : [...baseColumns, "Aksi"]

  const deleteAction = kind === "in" ? deleteWarehouseRepairInbound : deleteWarehouseRepairOutbound
  const itemOptions = useMemo(() => items.map((i) => ({ value: i.itemName, label: i.itemName })), [items])

  const allSelected = rows.length > 0 && selectedIds.length === rows.length
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(rows.map((r) => r.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleConvertBulkToCargo = () => {
    if (selectedIds.length === 0) return toast.error("Pilih setidaknya 1 transaksi barang keluar")
    startBulk(async () => {
      const res = await createCargoManifestFromMultipleOutbound(selectedIds, userSignerName)
      if (res.success && res.manifest) {
        setBulkManifest(res.manifest)
        setBulkPdfOpen(true)
      } else {
        toast.error(res.error || "Gagal membuat Cargo Manifest dari item terpilih")
      }
    })
  }

  const detailLabels: Array<[string, string]> = kind === "in"
    ? [
        ["transactionNo", "No Transaksi"],
        ["date", "Tanggal"],
        ["itemCode", "Kode Barang"],
        ["materialDesc", "Material Desc"],
        ["itemName", "Nama Barang"],
        ["typeName", "Category/Jenis"],
        ["unitName", "Satuan/UOM"],
        ["targetSLoc", "S-Loc Tujuan"],
        ["targetSLocDesc", "Deskripsi S-Loc Tujuan"],
        ["quantity", "Qty"],
        ["note", "Keterangan"],
      ]
    : [
        ["transactionNo", "No Transaksi"],
        ["date", "Tanggal"],
        ["itemCode", "Kode Barang"],
        ["materialDesc", "Material Desc"],
        ["itemName", "Nama Barang"],
        ["typeName", "Category/Jenis"],
        ["unitName", "Satuan/UOM"],
        ["storageLocation", "S-Loc Asal"],
        ["storageLocationDesc", "Deskripsi S-Loc Asal"],
        ["outboundType", "Tipe Keluar"],
        ["destinationSLoc", "S-Loc Tujuan"],
        ["destinationSLocDesc", "Deskripsi S-Loc Tujuan"],
        ["quantity", "Qty"],
        ["note", "Keterangan"],
      ]

  return (
    <MinimalTableShell
      label={title.toLowerCase()}
      fileName={title}
      showImport={false}
      access={access}
      dateFilter
      filters={<TableMultiFilter label="barang" filterKey="item" options={itemOptions} />}
      primaryAction={
        !report ? (
          <div className="flex items-center gap-2">
            {kind === "out" && selectedIds.length > 0 && (
              <Button
                variant="default"
                disabled={loadingBulk}
                onClick={handleConvertBulkToCargo}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs"
              >
                <FileText className="size-4" /> Convert Selected ({selectedIds.length}) to Cargo Manifest
              </Button>
            )}
            <TransactionDialog kind={kind} items={items} trigger={<Button><Plus className="mr-2 h-4 w-4" />Entri Data</Button>} />
          </div>
        ) : undefined
      }
      columnOptions={columns.map((c, i) => ({ key: c, label: c, required: i < 2 }))}
      scorecards={[
        { label: "Transaksi", value: rows.length, tone: "info", icon: kind === "in" ? <PackagePlus className="size-4 text-primary" /> : <PackageMinus className="size-4 text-primary" /> },
        { label: "Total Qty", value: rows.reduce((s, r) => s + Number(r.quantity ?? 0), 0), tone: "default" },
        { label: "Barang", value: new Set(rows.map((r) => r.itemId ?? r.itemCode)).size, tone: "success" },
        { label: "Terpilih", value: selectedIds.length, tone: "warning" }
      ]}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {kind === "out" && !report && (
              <TableHead className="w-10 text-center">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded border-border cursor-pointer" />
              </TableHead>
            )}
            {columns.filter((c) => c !== "Sel" && c !== "Aksi").map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
            {!report && <TableHead>Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((r) => {
              const detailRow = kind === "in"
                ? {
                    ...r,
                    date: fmtDate(r.transactionDate),
                    targetSLoc: r.targetSLoc || r.storageLocation || "-",
                    targetSLocDesc: r.targetSLocDesc || r.storageLocationDesc || "-",
                    note: r.note || "-",
                  }
                : {
                    ...r,
                    date: fmtDate(r.transactionDate),
                    outboundType: r.outboundType || "Pemakaian Internal",
                    destinationSLoc: r.destinationSLoc || "-",
                    destinationSLocDesc: r.destinationSLocDesc || "-",
                    note: r.note || "-",
                  }
              const isSelected = selectedIds.includes(r.id)
              return (
                <TableRow key={r.id} data-date-value={fmtDate(r.transactionDate)} data-filter-item={r.itemName ?? ""} className={isSelected ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}>
                  {kind === "out" && !report && (
                    <TableCell className="w-10 text-center">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.id)} className="rounded border-border cursor-pointer" />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs font-semibold text-primary">{r.transactionNo}</TableCell>
                  <TableCell>{fmtDate(r.transactionDate)}</TableCell>
                  <TableCell>{r.itemCode}</TableCell>
                  <TableCell>{r.materialDesc ?? "-"}</TableCell>
                  <TableCell>{r.itemName}</TableCell>
                  <TableCell>{r.typeName ?? "-"}</TableCell>
                  <TableCell>{r.unitName ?? "-"}</TableCell>
                  
                  {kind === "in" ? (
                    <>
                      <TableCell>{r.targetSLoc || r.storageLocation || "-"}</TableCell>
                      <TableCell>{r.targetSLocDesc || r.storageLocationDesc || "-"}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{r.storageLocation || "-"}</TableCell>
                      <TableCell>{r.storageLocationDesc || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={r.outboundType === "Stock Transfer" ? "default" : "outline"} className="text-[10px]">
                          {r.outboundType || "Pemakaian Internal"}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.destinationSLoc || "-"}</TableCell>
                      <TableCell>{r.destinationSLocDesc || "-"}</TableCell>
                    </>
                  )}

                  <TableCell className="font-semibold">{r.quantity}</TableCell>
                  <TableCell>{r.note || "-"}</TableCell>
                  {!report ? (
                    <TableCell>
                      <TransactionActions kind={kind} row={detailRow} items={items} title={title} labels={detailLabels} deleteAction={deleteAction} />
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + (kind === "out" && !report ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                Belum ada data transaksi.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {bulkManifest && <CargoManifestPdfDialog row={bulkManifest} open={bulkPdfOpen} onOpenChange={setBulkPdfOpen} trigger={null} />}
    </MinimalTableShell>
  )
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
