"use client"

import { ArrowRightLeft, Boxes, Check, ChevronsUpDown, Download, Eye, FilePenLine, Package, PackageMinus, PackagePlus, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { uploadFile } from "@/app/actions/upload"

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
}: {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  row: Row
  labels: Array<[string, string]>
  onEditClick?: () => void
}) {
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
        {row.photoUrl ? (
          <div className="flex flex-col items-center gap-2 md:w-1/3">
            <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border bg-muted/30">
              <img
                src={row.photoUrl}
                alt={row.itemName || "Foto produk"}
                className="h-full w-full object-contain"
              />
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
                  const formData = new FormData();
                  formData.append("file", file);
                  const toastId = toast.loading("Mengunggah foto...");
                  try {
                    const res = await uploadFile(formData);
                    if (res.success) {
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
              {form.photoUrl && (
                <div className="relative mt-2 h-32 w-32 overflow-hidden rounded-lg border border-border">
                  <img
                    src={form.photoUrl}
                    alt="Preview produk"
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="denseIcon"
                    className="absolute right-1 top-1"
                    onClick={() => set("photoUrl", "")}
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
      if (!selectedItem) return toast.error("Pilih barang terlebih dahulu")
      if (quantity > selectedItem.stock)
        return toast.error(`Stok tidak mencukupi (stok saat ini: ${selectedItem.stock})`)

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
  const [form, setForm] = useState({ transactionDate: fmtDate(row?.transactionDate ?? today()), itemId: row?.itemId ? String(row.itemId) : "", quantity: Number(row?.quantity ?? 1), note: row?.note ?? "" })
  const selectedItem = items.find((i) => String(i.id) === String(form.itemId))
  const save = () => start(async () => {
    const input = { transactionDate: form.transactionDate, itemId: Number(form.itemId), quantity: Number(form.quantity), note: form.note }
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
              <div><span className="font-medium">S-Loc:</span> {selectedItem.storageLocation || "-"} ({selectedItem.storageLocationDesc || "-"})</div>
              <div><span className="font-medium">Stok Saat Ini:</span> <Badge variant="outline" className="ml-1">{selectedItem.stock}</Badge></div>
            </div>
          </div>
        )}

        <Field label="Jumlah (Qty)"><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
        <Field label="Keterangan"><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Catatan transaksi..." /></Field>
      </EnterpriseFormGrid>
    </EnterpriseRecordDialog>
  )
}

function ItemActions({ row, types, units, labels }: { row: Row; types: Row[]; units: Row[]; labels: Array<[string, string]> }) {
  const [open, setOpen] = useState<"view" | "edit" | "delete" | null>(null)
  const detailRow = { ...row, status: statusLabel(row.isActive) }
  return (
    <>
      <DialogActionButtons onView={() => setOpen("view")} onEdit={() => setOpen("edit")} onDelete={() => setOpen("delete")} />
      <ViewDialog title={`Detail Barang ${row.itemCode}`} row={detailRow} labels={labels} open={open === "view"} onOpenChange={(v) => setOpen(v ? "view" : null)} onEditClick={() => setOpen("edit")} />
      <MasterDialog kind="item" row={row} types={types} units={units} open={open === "edit"} onOpenChange={(v) => setOpen(v ? "edit" : null)} />
      <DeleteDialog title={`Hapus Barang ${row.itemCode}`} description="Data barang akan dihapus dari Warehouse Repair." row={detailRow} labels={labels} action={() => deleteWarehouseRepairItem(row.id)} open={open === "delete"} onOpenChange={(v) => setOpen(v ? "delete" : null)} />
    </>
  )
}

function MasterActions({ kind, row, types, units, title, labels, deleteAction }: { kind: "type" | "unit"; row: Row; types: Row[]; units: Row[]; title: string; labels: Array<[string, string]>; deleteAction: (id: number) => Promise<ActionResult> }) {
  const [open, setOpen] = useState<"view" | "edit" | "delete" | null>(null)
  const detailRow = { code: kind === "type" ? row.typeCode : row.unitCode, name: kind === "type" ? row.typeName : row.unitName, status: statusLabel(row.isActive) }
  return (
    <>
      <DialogActionButtons onView={() => setOpen("view")} onEdit={() => setOpen("edit")} onDelete={() => setOpen("delete")} />
      <ViewDialog title={`Detail ${title}`} row={detailRow} labels={labels} open={open === "view"} onOpenChange={(v) => setOpen(v ? "view" : null)} />
      <MasterDialog kind={kind} row={row} types={types} units={units} open={open === "edit"} onOpenChange={(v) => setOpen(v ? "edit" : null)} />
      <DeleteDialog title={`Hapus ${title}`} description={`Data ${title.toLowerCase()} akan dihapus.`} row={detailRow} labels={labels} action={() => deleteAction(row.id)} open={open === "delete"} onOpenChange={(v) => setOpen(v ? "delete" : null)} />
    </>
  )
}

function TransactionActions({ kind, row, items, title, labels, deleteAction }: { kind: "in" | "out"; row: Row; items: Row[]; title: string; labels: Array<[string, string]>; deleteAction: (id: number) => Promise<ActionResult> }) {
  const [open, setOpen] = useState<"view" | "edit" | "delete" | null>(null)
  const detailRow = { ...row, date: fmtDate(row.transactionDate), note: row.note || "-" }
  return (
    <>
      <DialogActionButtons onView={() => setOpen("view")} onEdit={() => setOpen("edit")} onDelete={() => setOpen("delete")} />
      <ViewDialog title={`Detail ${title} ${row.transactionNo}`} row={detailRow} labels={labels} open={open === "view"} onOpenChange={(v) => setOpen(v ? "view" : null)} />
      <TransactionDialog kind={kind} items={items} row={row} trigger={<span className="hidden" />} open={open === "edit"} onOpenChange={(v) => setOpen(v ? "edit" : null)} />
      <DeleteDialog title={`Hapus ${title} ${row.transactionNo}`} description="Transaksi akan dihapus dan stok akan disesuaikan kembali." row={detailRow} labels={labels} action={() => deleteAction(row.id)} open={open === "delete"} onOpenChange={(v) => setOpen(v ? "delete" : null)} />
    </>
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
