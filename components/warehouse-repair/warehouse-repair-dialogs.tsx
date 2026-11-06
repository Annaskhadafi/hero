"use client"

import React, { useState, useTransition, useMemo } from "react"
import { toast } from "sonner"
import {
  ArrowRightLeft,
  Boxes,
  Check,
  FilePenLine,
  FileText,
  Package,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadFile } from "@/app/actions/upload"
import { resolveClientUploadUrl } from "@/lib/client-url"
import {
  HeroFormDialog,
  HeroConfirmDialog,
  HeroDetailModal,
  HeroFormField,
  HeroInput,
  HeroNumberInput,
  HeroTextarea,
  HeroSwitch,
  HeroSearchableSelect,
  HeroStatusBadge,
} from "@/components/templates"

import {
  upsertWarehouseRepairItem,
  upsertWarehouseRepairType,
  upsertWarehouseRepairUnit,
  createWarehouseRepairInbound,
  createWarehouseRepairOutbound,
  updateWarehouseRepairInbound,
  updateWarehouseRepairOutbound,
  createWarehouseRepairTransfer,
  deleteWarehouseRepairItem,
  deleteWarehouseRepairType,
  deleteWarehouseRepairUnit,
  deleteWarehouseRepairInbound,
  deleteWarehouseRepairOutbound,
} from "@/app/actions/warehouse-repair"

import {
  WarehouseRepairItem,
  WarehouseRepairType,
  WarehouseRepairUnit,
  WarehouseRepairInbound,
  WarehouseRepairOutbound,
  PRESET_SLOCS,
  TableRbacAccess,
} from "./types"

// ------------------------------------------------------------------
// 1. ITEM FORM DIALOG (Tambah / Edit Master Barang)
// ------------------------------------------------------------------
export function ItemFormDialog({
  item,
  types,
  units,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onSuccess,
}: {
  item?: WarehouseRepairItem | null
  types: WarehouseRepairType[]
  units: WarehouseRepairUnit[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const onOpenChange = controlledOnOpenChange || setInternalOpen

  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    itemCode: item?.itemCode ?? "",
    materialDesc: item?.materialDesc ?? "",
    itemName: item?.itemName ?? "",
    typeId: item?.typeId ? String(item.typeId) : "",
    unitId: item?.unitId ? String(item.unitId) : "",
    storageLocation: item?.storageLocation ?? "RS01",
    storageLocationDesc: item?.storageLocationDesc ?? "Balikpapan",
    minimumStock: item?.minimumStock ?? 0,
    photoUrl: item?.photoUrl ?? "",
    isActive: item?.isActive ?? true,
  })
  const [uploading, setUploading] = useState(false)

  // Sync if item changes
  React.useEffect(() => {
    if (item) {
      setForm({
        itemCode: item.itemCode ?? "",
        materialDesc: item.materialDesc ?? "",
        itemName: item.itemName ?? "",
        typeId: item.typeId ? String(item.typeId) : "",
        unitId: item.unitId ? String(item.unitId) : "",
        storageLocation: item.storageLocation ?? "RS01",
        storageLocationDesc: item.storageLocationDesc ?? "Balikpapan",
        minimumStock: item.minimumStock ?? 0,
        photoUrl: item.photoUrl ?? "",
        isActive: item.isActive ?? true,
      })
    } else {
      setForm({
        itemCode: "",
        materialDesc: "",
        itemName: "",
        typeId: "",
        unitId: "",
        storageLocation: "RS01",
        storageLocationDesc: "Balikpapan",
        minimumStock: 0,
        photoUrl: "",
        isActive: true,
      })
    }
  }, [item])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadFile(formData)
      if (res.success && res.url) {
        setForm((prev) => ({ ...prev, photoUrl: res.url }))
        toast.success("Foto barang berhasil diunggah")
      } else {
        toast.error(res.error || "Gagal mengunggah foto")
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal upload foto")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleSave = () => {
    if (!form.itemName.trim()) {
      toast.error("Nama barang wajib diisi")
      return
    }

    startTransition(async () => {
      const res = await upsertWarehouseRepairItem(
        {
          itemCode: form.itemCode.trim(),
          itemName: form.itemName.trim(),
          materialDesc: form.materialDesc?.trim() || null,
          storageLocation: form.storageLocation?.trim() || "RS01",
          storageLocationDesc: form.storageLocationDesc?.trim() || "Balikpapan",
          minimumStock: Number(form.minimumStock || 0),
          typeId: form.typeId ? Number(form.typeId) : null,
          unitId: form.unitId ? Number(form.unitId) : null,
          photoUrl: form.photoUrl,
          isActive: form.isActive,
        },
        item?.id
      )

      if (res.success) {
        toast.success(item ? "Data barang berhasil diperbarui" : "Barang baru berhasil ditambahkan")
        onOpenChange?.(false)
        onSuccess?.()
      } else {
        toast.error(res.error || "Gagal menyimpan data barang")
      }
    })
  }

  const typeOptions = types.map((t) => ({ value: String(t.id), label: t.typeName }))
  const unitOptions = units.map((u) => ({ value: String(u.id), label: u.unitName }))

  return (
    <HeroFormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={item ? "Edit Data Barang" : "Tambah Barang Baru"}
        description="Lengkapi informasi spesifikasi, kategori, S-Loc gudang, dan stok minimum."
        onSubmit={handleSave}
        isSubmitting={pending || uploading}
        submitLabel={item ? "Simpan Perubahan" : "Tambah Barang"}
        maxWidth="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HeroFormField label="Kode Barang (Part Number)" helperText="Opsional. Otomatis digenerate jika dikosongkan.">
            <HeroInput
              placeholder="Contoh: ITM-001 / 102938"
              value={form.itemCode}
              onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
            />
          </HeroFormField>

          <HeroFormField label="Material Description" helperText="Deskripsi teknis SAP / sistem ERP.">
            <HeroInput
              placeholder="Contoh: TIRE PATCH RADIAL 120X75"
              value={form.materialDesc}
              onChange={(e) => setForm({ ...form, materialDesc: e.target.value })}
            />
          </HeroFormField>

          <div className="md:col-span-2">
            <HeroFormField label="Nama Barang" required>
              <HeroInput
                placeholder="Contoh: Karet Tambal Radial 120"
                value={form.itemName}
                onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              />
            </HeroFormField>
          </div>

          <HeroFormField label="Kategori / Jenis">
            <HeroSearchableSelect
              options={typeOptions}
              value={form.typeId}
              onChange={(val) => setForm({ ...form, typeId: val })}
              placeholder="Pilih Kategori..."
            />
          </HeroFormField>

          <HeroFormField label="Satuan (UOM)">
            <HeroSearchableSelect
              options={unitOptions}
              value={form.unitId}
              onChange={(val) => setForm({ ...form, unitId: val })}
              placeholder="Pilih Satuan..."
            />
          </HeroFormField>

          <HeroFormField label="S-Loc Kode">
            <HeroInput
              placeholder="Contoh: RS01"
              value={form.storageLocation}
              onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
            />
          </HeroFormField>

          <HeroFormField label="S-Loc Deskripsi (Nama Gudang)">
            <HeroInput
              placeholder="Contoh: Balikpapan"
              value={form.storageLocationDesc}
              onChange={(e) => setForm({ ...form, storageLocationDesc: e.target.value })}
            />
          </HeroFormField>

          <HeroFormField label="Stok Minimum (Alert Buffer)" helperText="Sistem memberi peringatan jika stok di bawah nilai ini.">
            <HeroNumberInput
              min={0}
              isCurrency={false}
              prefix=""
              value={form.minimumStock}
              onChange={(val) => setForm({ ...form, minimumStock: val || 0 })}
            />
          </HeroFormField>

        <div className="flex items-center pt-6">
          <HeroSwitch
            checked={form.isActive}
            onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
            label="Status Item Aktif"
            description="Item nonaktif tidak muncul pada pencarian transaksi baru"
          />
        </div>

        {/* Upload Foto Barang */}
        <div className="md:col-span-2 pt-2 border-t border-border/70">
          <Label className="text-xs font-semibold text-foreground block mb-2">Foto Produk / Material (Opsional)</Label>
          <div className="flex items-center gap-4">
            {form.photoUrl ? (
              <div className="relative size-20 rounded-xl overflow-hidden border border-border bg-muted/40 shrink-0">
                <img
                  src={resolveClientUploadUrl(form.photoUrl)}
                  alt="Preview"
                  className="size-full object-cover"
                />
              </div>
            ) : null}
            <div className="flex-1">
              <label className="flex items-center justify-center gap-2 h-9 px-4 border border-dashed border-border rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-muted/40 cursor-pointer transition-colors">
                <Upload className="size-4 text-primary" />
                <span>{uploading ? "Mengunggah..." : form.photoUrl ? "Ganti Foto Produk" : "Pilih Foto Produk (PNG/JPG)"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
              <p className="text-[11px] text-muted-foreground mt-1">
                Foto akan otomatis disimpan ke penyimpanan cloud dan proxy terpusat HERO.
              </p>
            </div>
          </div>
        </div>
      </div>
    </HeroFormDialog>
  )
}

// ------------------------------------------------------------------
// 2. MASTER FORM DIALOG (Jenis Barang & Satuan)
// ------------------------------------------------------------------
export function MasterTypeOrUnitDialog({
  kind,
  record,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onSuccess,
}: {
  kind: "type" | "unit"
  record?: WarehouseRepairType | WarehouseRepairUnit | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const onOpenChange = controlledOnOpenChange || setInternalOpen

  const [pending, startTransition] = useTransition()
  const title = kind === "type" ? "Jenis Barang" : "Satuan"

  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [isActive, setIsActive] = useState(true)

  React.useEffect(() => {
    if (record) {
      setCode(kind === "type" ? (record as WarehouseRepairType).typeCode : (record as WarehouseRepairUnit).unitCode)
      setName(kind === "type" ? (record as WarehouseRepairType).typeName : (record as WarehouseRepairUnit).unitName)
      setIsActive(record.isActive)
    } else {
      setCode("")
      setName("")
      setIsActive(true)
    }
  }, [record, kind])

  const handleSave = () => {
    if (!name.trim()) {
      toast.error(`Nama ${title.toLowerCase()} wajib diisi`)
      return
    }

    startTransition(async () => {
      const res =
        kind === "type"
          ? await upsertWarehouseRepairType({ typeCode: code.trim(), typeName: name.trim(), isActive }, record?.id)
          : await upsertWarehouseRepairUnit({ unitCode: code.trim(), unitName: name.trim(), isActive }, record?.id)

      if (res.success) {
        toast.success(`Data ${title.toLowerCase()} berhasil disimpan`)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(res.error || `Gagal menyimpan data ${title.toLowerCase()}`)
      }
    })
  }

  return (
    <HeroFormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`${record ? "Edit" : "Tambah"} ${title}`}
        description={`Kelola master data ${title.toLowerCase()} untuk klasifikasi part warehouse repair.`}
        onSubmit={handleSave}
        isSubmitting={pending}
        submitLabel={record ? "Simpan Perubahan" : `Tambah ${title}`}
      >
        <div className="space-y-4">
          <HeroFormField label={`Kode ${title}`} helperText="Opsional. Otomatis jika kosong.">
            <HeroInput
              placeholder={`Contoh: ${kind === "type" ? "TYP-01" : "PCS"}`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </HeroFormField>

          <HeroFormField label={`Nama ${title}`} required>
            <HeroInput
              placeholder={`Contoh: ${kind === "type" ? "Patch & Cushion" : "Pieces"}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </HeroFormField>

          <HeroSwitch
            checked={isActive}
            onCheckedChange={setIsActive}
            label="Status Aktif"
            description="Status penentuan apakah kategori ini dapat digunakan pada transaksi baru"
          />
        </div>
      </HeroFormDialog>
    )
  }

// ------------------------------------------------------------------
// 3. TRANSACTION FORM DIALOG (Barang Masuk & Barang Keluar)
// ------------------------------------------------------------------
export function TransactionFormDialog({
  kind,
  items,
  transaction,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onSuccess,
}: {
  kind: "in" | "out"
  items: WarehouseRepairItem[]
  transaction?: WarehouseRepairInbound | WarehouseRepairOutbound | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const onOpenChange = controlledOnOpenChange || setInternalOpen

  const [pending, startTransition] = useTransition()
  const title = kind === "in" ? "Barang Masuk (Inbound)" : "Barang Keluar (Outbound)"

  const [transactionDate, setTransactionDate] = useState(() =>
    transaction?.transactionDate ? String(transaction.transactionDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [itemId, setItemId] = useState(() => (transaction?.itemId ? String(transaction.itemId) : ""))
  const [quantity, setQuantity] = useState(() => Number(transaction?.quantity ?? 1))
  const [targetSLoc, setTargetSLoc] = useState(() => (transaction as any)?.targetSLoc || "RS01")
  const [targetSLocDesc, setTargetSLocDesc] = useState(() => (transaction as any)?.targetSLocDesc || "Balikpapan")
  const [updateItemLocation, setUpdateItemLocation] = useState(false)
  const [outboundType, setOutboundType] = useState(() => (transaction as any)?.outboundType || "Pemakaian Internal")
  const [destinationSLoc, setDestinationSLoc] = useState(() => (transaction as any)?.destinationSLoc || "RS02")
  const [destinationSLocDesc, setDestinationSLocDesc] = useState(() => (transaction as any)?.destinationSLocDesc || "Samarinda")
  const [note, setNote] = useState(() => transaction?.note || "")

  const selectedItem = useMemo(() => items.find((i) => String(i.id) === String(itemId)), [items, itemId])

  React.useEffect(() => {
    if (transaction) {
      setTransactionDate(String(transaction.transactionDate).slice(0, 10))
      setItemId(String(transaction.itemId))
      setQuantity(Number(transaction.quantity))
      setTargetSLoc((transaction as any).targetSLoc || "RS01")
      setTargetSLocDesc((transaction as any).targetSLocDesc || "Balikpapan")
      setOutboundType((transaction as any).outboundType || "Pemakaian Internal")
      setDestinationSLoc((transaction as any).destinationSLoc || "RS02")
      setDestinationSLocDesc((transaction as any).destinationSLocDesc || "Samarinda")
      setNote(transaction.note || "")
    } else {
      setTransactionDate(new Date().toISOString().slice(0, 10))
      setItemId("")
      setQuantity(1)
      setTargetSLoc("RS01")
      setTargetSLocDesc("Balikpapan")
      setOutboundType("Pemakaian Internal")
      setDestinationSLoc("RS02")
      setDestinationSLocDesc("Samarinda")
      setNote("")
    }
  }, [transaction])

  const itemOptions = items.map((i) => ({
    value: String(i.id),
    label: `${i.itemCode} - ${i.itemName}${i.materialDesc ? ` (${i.materialDesc})` : ""} [Stok: ${i.stock}]`,
  }))

  const handleSelectPreset = (code: string, desc: string, target: "in" | "out") => {
    if (target === "in") {
      setTargetSLoc(code)
      setTargetSLocDesc(desc)
    } else {
      setDestinationSLoc(code)
      setDestinationSLocDesc(desc)
    }
  }

  const handleSave = () => {
    if (!itemId) {
      toast.error("Pilih barang terlebih dahulu")
      return
    }
    if (quantity <= 0) {
      toast.error("Jumlah (Qty) harus lebih besar dari 0")
      return
    }

    if (kind === "out" && selectedItem && !transaction && quantity > selectedItem.stock) {
      toast.error(`Stok tidak mencukupi! Stok saat ini: ${selectedItem.stock}`)
      return
    }

    startTransition(async () => {
      const payload = {
        transactionDate,
        itemId: Number(itemId),
        quantity: Number(quantity),
        targetSLoc,
        targetSLocDesc,
        updateItemLocation,
        outboundType,
        destinationSLoc: outboundType === "Stock Transfer" ? destinationSLoc : "",
        destinationSLocDesc: outboundType === "Stock Transfer" ? destinationSLocDesc : "",
        note: note.trim(),
      }

      const res = transaction
        ? kind === "in"
          ? await updateWarehouseRepairInbound(transaction.id, payload)
          : await updateWarehouseRepairOutbound(transaction.id, payload)
        : kind === "in"
          ? await createWarehouseRepairInbound(payload)
          : await createWarehouseRepairOutbound(payload)

      if (res.success) {
        toast.success(`Transaksi ${title.toLowerCase()} berhasil disimpan`)
        onOpenChange?.(false)
        onSuccess?.()
      } else {
        toast.error(res.error || `Gagal menyimpan transaksi ${title.toLowerCase()}`)
      }
    })
  }

  return (
    <HeroFormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`${transaction ? "Edit" : "Entri"} ${title}`}
        description={
          kind === "in"
            ? "Catat penerimaan material/part masuk untuk menambah stok gudang."
            : "Catat pengeluaran barang untuk pemakaian internal atau transfer antar gudang."
        }
        onSubmit={handleSave}
        isSubmitting={pending}
        submitLabel={transaction ? "Simpan Perubahan" : `Simpan ${title}`}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroFormField label="Tanggal Transaksi" required>
              <HeroInput
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </HeroFormField>

            <HeroFormField label="Jumlah (Qty)" required>
              <HeroNumberInput
                min={1}
                max={kind === "out" && selectedItem && !transaction ? selectedItem.stock : 999999}
                value={quantity}
                isCurrency={false}
                prefix=""
                onChange={(val) => setQuantity(val || 1)}
              />
            </HeroFormField>
          </div>

          <HeroFormField label="Pilih Barang" required>
            <HeroSearchableSelect
              options={itemOptions}
              value={itemId}
              onChange={setItemId}
              placeholder="Cari berdasarkan kode, nama, material desc..."
            />
          </HeroFormField>

        {selectedItem ? (
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-1 text-xs">
            <div className="flex items-center justify-between font-semibold text-primary">
              <span>{selectedItem.itemCode} — {selectedItem.itemName}</span>
              <Badge variant="outline" className="text-xs">
                Stok Tersedia: <strong className="ml-1 text-foreground">{selectedItem.stock}</strong>
              </Badge>
            </div>
            {selectedItem.materialDesc ? (
              <p className="text-muted-foreground"><span className="font-medium text-foreground">Material Desc:</span> {selectedItem.materialDesc}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground pt-1">
              <span>S-Loc Asal: <strong className="text-foreground">{selectedItem.storageLocation || "RS01"} ({selectedItem.storageLocationDesc || "Balikpapan"})</strong></span>
              <span>Kategori: <strong className="text-foreground">{selectedItem.typeName || "-"}</strong></span>
              <span>Satuan: <strong className="text-foreground">{selectedItem.unitName || "-"}</strong></span>
            </div>
          </div>
        ) : null}

        {/* INBOUND S-LOC SELECTION */}
        {kind === "in" && (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-950/60 dark:bg-emerald-950/20 p-4 space-y-3">
            <Label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              S-Loc / Lokasi Gudang Penerimaan Barang
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SLOCS.map((preset) => (
                <Button
                  key={preset.code}
                  type="button"
                  variant={targetSLoc === preset.code ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleSelectPreset(preset.code, preset.desc, "in")}
                >
                  {preset.code} - {preset.desc}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <HeroInput
                placeholder="Kode S-Loc (contoh: RS01)"
                value={targetSLoc}
                onChange={(e) => setTargetSLoc(e.target.value)}
              />
              <HeroInput
                placeholder="Deskripsi S-Loc (contoh: Balikpapan)"
                value={targetSLocDesc}
                onChange={(e) => setTargetSLocDesc(e.target.value)}
              />
            </div>
            <HeroSwitch
              checked={updateItemLocation}
              onCheckedChange={setUpdateItemLocation}
              label="Perbarui Lokasi Utama Barang"
              description={`Ubah master S-Loc barang ini menjadi ${targetSLoc} (${targetSLocDesc})`}
            />
          </div>
        )}

        {/* OUTBOUND TYPE & DESTINATION */}
        {kind === "out" && (
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 dark:border-blue-950/60 dark:bg-blue-950/20 p-4 space-y-3">
            <Label className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              Tujuan / Jenis Pengeluaran Barang
            </Label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                <input
                  type="radio"
                  name="outboundType"
                  value="Pemakaian Internal"
                  checked={outboundType === "Pemakaian Internal"}
                  onChange={() => setOutboundType("Pemakaian Internal")}
                  className="text-primary size-4"
                />
                <span>Pemakaian Internal Workshop</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                <input
                  type="radio"
                  name="outboundType"
                  value="Stock Transfer"
                  checked={outboundType === "Stock Transfer"}
                  onChange={() => setOutboundType("Stock Transfer")}
                  className="text-primary size-4"
                />
                <span>Stock Transfer (Pindah Gudang Cabang)</span>
              </label>
            </div>

            {outboundType === "Stock Transfer" && (
              <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40 space-y-2">
                <Label className="text-[11px] text-muted-foreground">Pilih Preset S-Loc Gudang Tujuan</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SLOCS.map((preset) => (
                    <Button
                      key={preset.code}
                      type="button"
                      variant={destinationSLoc === preset.code ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleSelectPreset(preset.code, preset.desc, "out")}
                    >
                      {preset.code} - {preset.desc}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <HeroInput
                    placeholder="Kode S-Loc Tujuan"
                    value={destinationSLoc}
                    onChange={(e) => setDestinationSLoc(e.target.value)}
                  />
                  <HeroInput
                    placeholder="Deskripsi S-Loc Tujuan"
                    value={destinationSLocDesc}
                    onChange={(e) => setDestinationSLocDesc(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <HeroFormField label="Keterangan / Catatan Transaksi">
          <HeroTextarea
            placeholder="Tuliskan nomor SPK, peruntukan unit alat, atau no surat jalan jika ada..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </HeroFormField>
      </div>
    </HeroFormDialog>
  )
}

// ------------------------------------------------------------------
// 4. TRANSFER STOCK QUICK DIALOG
// ------------------------------------------------------------------
export function TransferStockDialog({
  items,
  defaultItem,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onSuccess,
}: {
  items: WarehouseRepairItem[]
  defaultItem?: WarehouseRepairItem | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const onOpenChange = controlledOnOpenChange || setInternalOpen

  const [pending, startTransition] = useTransition()
  const [itemId, setItemId] = useState(() => (defaultItem ? String(defaultItem.id) : ""))
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [toSLoc, setToSLoc] = useState("RS02")
  const [toSLocDesc, setToSLocDesc] = useState("Samarinda")
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")
  const [updateItemLocation, setUpdateItemLocation] = useState(false)

  React.useEffect(() => {
    if (defaultItem) setItemId(String(defaultItem.id))
  }, [defaultItem])

  const selectedItem = useMemo(() => items.find((i) => String(i.id) === String(itemId)), [items, itemId])

  const itemOptions = items.map((i) => ({
    value: String(i.id),
    label: `${i.itemCode} - ${i.itemName} [Stok: ${i.stock}]`,
  }))

  const handleSave = () => {
    if (!selectedItem) {
      toast.error("Pilih barang yang ingin ditransfer")
      return
    }
    if (quantity <= 0) {
      toast.error("Jumlah transfer harus lebih dari 0")
      return
    }
    if (quantity > selectedItem.stock) {
      toast.error(`Stok tidak mencukupi (stok tersedia: ${selectedItem.stock})`)
      return
    }

    startTransition(async () => {
      const res = await createWarehouseRepairTransfer({
        transactionDate,
        itemId: Number(itemId),
        fromSLoc: selectedItem.storageLocation || "RS01",
        fromSLocDesc: selectedItem.storageLocationDesc || "Balikpapan",
        toSLoc,
        toSLocDesc,
        quantity: Number(quantity),
        note: note.trim(),
        updateItemLocation,
      })

      if (res.success) {
        toast.success(`Transfer ${quantity} unit ${selectedItem.itemName} ke ${toSLoc} berhasil`)
        onOpenChange?.(false)
        onSuccess?.()
      } else {
        toast.error(res.error || "Gagal memproses transfer stok")
      }
    })
  }

  return (
    <HeroFormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Transfer Stok Antar Gudang (S-Loc)"
        description="Mutasi stok part/material dari satu gudang site ke gudang site lainnya."
        onSubmit={handleSave}
        isSubmitting={pending}
        submitLabel="Proses Transfer Stok"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <HeroFormField label="Pilih Barang" required>
            <HeroSearchableSelect
              options={itemOptions}
              value={itemId}
              onChange={setItemId}
              placeholder="Pilih barang..."
            />
          </HeroFormField>

        {selectedItem ? (
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1 text-xs">
            <div className="flex items-center justify-between font-semibold text-primary">
              <span>{selectedItem.itemCode} — {selectedItem.itemName}</span>
              <Badge variant="outline">Stok: {selectedItem.stock}</Badge>
            </div>
            <p className="text-muted-foreground">
              Gudang Asal: <strong className="text-foreground">{selectedItem.storageLocation || "RS01"} ({selectedItem.storageLocationDesc || "Balikpapan"})</strong>
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <HeroFormField label="Tanggal Transfer" required>
            <HeroInput
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </HeroFormField>

          <HeroFormField label="Jumlah Qty Transfer" required>
            <HeroNumberInput
              min={1}
              max={selectedItem?.stock || 99999}
              value={quantity}
              isCurrency={false}
              prefix=""
              onChange={(val) => setQuantity(val || 1)}
            />
          </HeroFormField>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Pilih Preset S-Loc Gudang Tujuan</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SLOCS.map((preset) => (
              <Button
                key={preset.code}
                type="button"
                variant={toSLoc === preset.code ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setToSLoc(preset.code)
                  setToSLocDesc(preset.desc)
                }}
              >
                {preset.code} - {preset.desc}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <HeroInput
            placeholder="Kode S-Loc Tujuan"
            value={toSLoc}
            onChange={(e) => setToSLoc(e.target.value)}
          />
          <HeroInput
            placeholder="Deskripsi S-Loc Tujuan"
            value={toSLocDesc}
            onChange={(e) => setToSLocDesc(e.target.value)}
          />
        </div>

        <HeroFormField label="Catatan / Keperluan Transfer">
          <HeroTextarea
            placeholder="Keterangan pengiriman part ke site cabang..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </HeroFormField>

        <HeroSwitch
          checked={updateItemLocation}
          onCheckedChange={setUpdateItemLocation}
          label="Update Lokasi Utama Barang"
          description={`Ubah lokasi S-Loc master barang ini ke ${toSLoc} (${toSLocDesc})`}
        />
      </div>
    </HeroFormDialog>
  )
}

// ------------------------------------------------------------------
// 5. DETAIL MODAL (Pratinjau Dokumen Barang & Lightbox)
// ------------------------------------------------------------------
export function ItemDetailModal({
  item,
  open,
  onOpenChange,
  onEditClick,
  onTransferClick,
}: {
  item: WarehouseRepairItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditClick?: () => void
  onTransferClick?: () => void
}) {
  if (!item) return null

  const isLowStock = item.stock <= item.minimumStock

  return (
    <HeroDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Detail Barang: ${item.itemCode}`}
      subtitle={`${item.itemName} • Warehouse Repair Part`}
      statusBadge={
        <Badge variant={item.isActive ? "default" : "secondary"}>
          {item.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      }
      onEdit={onEditClick}
      actions={
        <div className="flex items-center gap-2">
          {onTransferClick ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => {
                onOpenChange(false)
                onTransferClick()
              }}
            >
              <ArrowRightLeft className="size-3.5" /> Transfer Stok
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col md:flex-row gap-6">
        {/* Photo Box */}
        <div className="md:w-1/3 flex flex-col items-center gap-2">
          <div className="relative size-60 rounded-2xl overflow-hidden border border-border/80 bg-muted/30 flex items-center justify-center p-2 shadow-inner">
            {item.photoUrl ? (
              <img
                src={resolveClientUploadUrl(item.photoUrl)}
                alt={item.itemName}
                className="size-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Package className="size-16 opacity-30" />
                <span className="text-xs">Foto belum tersedia</span>
              </div>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">Foto Produk & Spesifikasi Part</span>
        </div>

        {/* Data Grid */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/10 p-4">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Kode Barang</span>
              <p className="font-mono text-sm font-bold text-primary mt-0.5">{item.itemCode}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Nama Barang</span>
              <p className="text-sm font-semibold text-foreground mt-0.5">{item.itemName}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Material Description</span>
              <p className="text-sm font-medium text-foreground mt-0.5">{item.materialDesc || "-"}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Kategori / Jenis</span>
              <p className="text-sm font-medium text-foreground mt-0.5">{item.typeName || "-"}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Satuan (UOM)</span>
              <p className="text-sm font-medium text-foreground mt-0.5">{item.unitName || "-"}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">S-Loc Gudang</span>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {item.storageLocation || "RS01"} ({item.storageLocationDesc || "Balikpapan"})
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Kesehatan Stok</span>
              <div className="mt-1">
                <Badge variant={isLowStock ? "destructive" : "default"} className="text-xs">
                  {isLowStock ? "Low Stock Alert" : "Stok Aman"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stock Metrics Card */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-card p-4">
            <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-xs text-muted-foreground font-medium">Stok Fisik Saat Ini</span>
              <div className="text-3xl font-bold text-primary mt-1">{item.stock}</div>
              <span className="text-[10px] text-muted-foreground">{item.unitName || "Unit"}</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <span className="text-xs text-muted-foreground font-medium">Stok Minimum (Buffer)</span>
              <div className="text-3xl font-bold text-amber-600 mt-1">{item.minimumStock}</div>
              <span className="text-[10px] text-muted-foreground">{item.unitName || "Unit"}</span>
            </div>
          </div>
        </div>
      </div>
    </HeroDetailModal>
  )
}

// ------------------------------------------------------------------
// 6. CONFIRM DELETE DIALOG
// ------------------------------------------------------------------
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Hapus Data",
  description = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  onConfirm: () => Promise<void>
}) {
  const [pending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm()
      onOpenChange(false)
    })
  }

  return (
    <HeroConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      onConfirm={handleConfirm}
      isProcessing={pending}
      confirmLabel="Hapus Permanen"
      tone="destructive"
    />
  )
}
