"use client"

import * as React from "react"
import { Calendar, Download, Edit3, FileText, Loader2, Printer, Upload, User, Check, Plus, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { uploadFile } from "@/app/actions/upload"
import { createHseInventory, updateHseInventory, getHseUserEmails } from "@/app/actions/hse-inventaris"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const CATEGORIES = [
  "Alat Pelindung Diri (APD)",
  "Alat Ukur & Deteksi",
  "Perlengkapkan Medis",
  "Peralatan Pemadam Kebakaran",
  "Perlengkapan Keselamatan",
]

const CONDITIONS = ["Baik", "Perlu Perbaikan", "Rusak"]

type HseInventory = {
  id: number
  documentId: string
  name: string
  category: string
  qty: number
  location: string
  condition: string
  notes: string
  picName: string
  photoUrl: string
  verifiedStatus: string
  verifiedAt: Date | string
  purchaseDate: Date | string | null
  validityMonths: number | null
  expirationDate: Date | string | null
  reminderDaysBefore: number
  reminderEmailRecipients: string
  lastReminderSentAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

// ==========================================
// 1. DIALOG FORM TAMBAH / EDIT INVENTARIS
// ==========================================
interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: HseInventory | null
  onSuccess: () => void
  currentUser?: string
  userEmails?: { id: number; name: string; email: string }[]
}

export function HseInventoryFormDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
  currentUser,
  userEmails = [],
}: FormDialogProps) {
  console.log("HseInventoryFormDialog render: userEmails length =", userEmails.length, "data =", userEmails)
  const [loading, setLoading] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  
  const [emails, setEmails] = React.useState<{ id: number; name: string; email: string }[]>(userEmails)

  React.useEffect(() => {
    if (userEmails && userEmails.length > 0) {
      setEmails(userEmails)
    } else if (open) {
      getHseUserEmails().then((res) => {
        if (res.success && res.data) {
          setEmails(res.data)
        }
      })
    }
  }, [userEmails, open])
  
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [qty, setQty] = React.useState(1)
  const [location, setLocation] = React.useState("")
  const [condition, setCondition] = React.useState("Baik")
  const [notes, setNotes] = React.useState("")
  const [picName, setPicName] = React.useState("")
  const [photoUrl, setPhotoUrl] = React.useState("")
  
  // Tanggal Beli, Masa Berlaku, Reminder settings
  const [purchaseDate, setPurchaseDate] = React.useState("")
  const [validityMonths, setValidityMonths] = React.useState(12)
  const [reminderDaysBefore, setReminderDaysBefore] = React.useState(30)
  const [reminderEmailRecipients, setReminderEmailRecipients] = React.useState("")

  const [searchQuery, setSearchQuery] = React.useState("")
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const selectedEmailsList = React.useMemo(() => {
    return reminderEmailRecipients
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
  }, [reminderEmailRecipients])

  const toggleEmail = (email: string) => {
    const current = reminderEmailRecipients
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
    
    if (current.includes(email)) {
      const updated = current.filter((e) => e !== email)
      setReminderEmailRecipients(updated.join(", "))
    } else {
      const updated = [...current, email]
      setReminderEmailRecipients(updated.join(", "))
    }
  }

  const filteredUsers = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return emails
    return emails.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    )
  }, [emails, searchQuery])

  const showAddCustom = React.useMemo(() => {
    const query = searchQuery.trim()
    if (!isValidEmail(query)) return false
    return !selectedEmailsList.includes(query)
  }, [searchQuery, selectedEmailsList])

  React.useEffect(() => {
    if (open) {
      if (item) {
        setName(item.name)
        setCategory(item.category)
        setQty(item.qty)
        setLocation(item.location)
        setCondition(item.condition)
        setNotes(item.notes)
        setPicName(item.picName)
        setPhotoUrl(item.photoUrl)
        setPurchaseDate(
          item.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : ""
        )
        setValidityMonths(item.validityMonths ?? 12)
        setReminderDaysBefore(item.reminderDaysBefore ?? 30)
        setReminderEmailRecipients(item.reminderEmailRecipients ?? "")
      } else {
        setName("")
        setCategory(CATEGORIES[0])
        setQty(1)
        setLocation("")
        setCondition("Baik")
        setNotes("")
        setPicName(currentUser || "")
        setPhotoUrl("")
        setPurchaseDate(new Date().toISOString().split("T")[0])
        setValidityMonths(12)
        setReminderDaysBefore(30)
        setReminderEmailRecipients("")
      }
    }
  }, [open, item, currentUser])

  // Hitung Tanggal Expired Otomatis secara Live di Form
  const autoExpirationDate = React.useMemo(() => {
    if (!purchaseDate || !validityMonths) return "-"
    const date = new Date(purchaseDate)
    if (isNaN(date.getTime())) return "-"
    date.setMonth(date.getMonth() + Number(validityMonths))
    return date.toLocaleDateString("id-ID", { dateStyle: "long" })
  }, [purchaseDate, validityMonths])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("uploadTarget", "safety")

    try {
      const res = await uploadFile(formData)
      if (res.success && res.url) {
        // Pada local dev, return readableUrl jika driver S3 belum di-set, atau gunakan url langsung
        const finalUrl = res.readableUrl || res.url
        setPhotoUrl(finalUrl)
        toast.success("Foto berhasil diunggah")
      } else {
        toast.error(res.error || "Gagal mengunggah foto")
      }
    } catch (error) {
      toast.error("Gagal mengunggah foto ke storage")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !category || !location) {
      toast.error("Semua field wajib diisi kecuali catatan")
      return
    }

    setLoading(true)
    const payload = {
      name,
      category,
      qty: Number(qty) || 1,
      location,
      condition,
      notes,
      picName: picName || "System",
      photoUrl,
      purchaseDate: purchaseDate || undefined,
      validityMonths: Number(validityMonths) || undefined,
      reminderDaysBefore: Number(reminderDaysBefore) || undefined,
      reminderEmailRecipients,
    }

    try {
      let res
      if (item) {
        res = await updateHseInventory(item.id, payload)
      } else {
        res = await createHseInventory(payload)
      }

      if (res.success) {
        toast.success(item ? "Data inventaris berhasil diperbarui" : "Data inventaris berhasil ditambahkan")
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(res.error || "Gagal menyimpan data")
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Data Inventaris" : "Tambah Inventaris HSE"}</DialogTitle>
          <DialogDescription>
            Masukkan detail informasi aset HSE dengan masa berlaku dan pengingat kedaluwarsa otomatis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Nama Barang / Aset</Label>
            <Input
              id="name"
              placeholder="Contoh: Helm Safety Krisbow V-Gard (White)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qty" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Jumlah / Qty</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Kondisi</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kondisi" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((cond) => (
                    <SelectItem key={cond} value={cond}>
                      {cond}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Lokasi Simpan</Label>
              <Input
                id="location"
                placeholder="Gudang HSE - Rak A2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="border-t border-dashed border-border/80 my-2 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Masa Berlaku & Expired Otomatis</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="purchaseDate" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tanggal Beli</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="validityMonths" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Masa Berlaku (Bulan)</Label>
                <Input
                  id="validityMonths"
                  type="number"
                  min={1}
                  value={validityMonths}
                  onChange={(e) => setValidityMonths(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Tanggal Expired Otomatis:</span>
              <span className="text-sm font-bold text-rose-600">{autoExpirationDate}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-border/80 my-2 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Pengaturan Reminder Email</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reminderDaysBefore" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Pengingat (Hari Sebelum)</Label>
                <Input
                  id="reminderDaysBefore"
                  type="number"
                  min={1}
                  value={reminderDaysBefore}
                  onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="picName" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Petugas (PIC)</Label>
                <Input
                  id="picName"
                  placeholder="Hasan 27"
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Penerima Email Pengingat
              </Label>
              
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-10 px-3 border border-input bg-background font-normal text-sm shadow-sm hover:bg-muted/50 rounded-md"
                  >
                    <span className="text-muted-foreground text-xs">Pilih / cari penerima dari user management...</span>
                    <Search className="size-4 shrink-0 text-muted-foreground/75" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-2 rounded-xl border border-border/80 bg-white shadow-lg" align="start">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/75 pointer-events-none" />
                    <Input
                      placeholder="Cari nama atau email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 rounded-lg border-border/70 text-xs shadow-none"
                    />
                  </div>
                  
                  <div className="max-h-[220px] overflow-y-auto space-y-1 rounded-lg border border-border/60 bg-muted/5 p-1 scrollbar-thin">
                    {filteredUsers.length === 0 && !showAddCustom && (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        Tidak ada pengguna ditemukan
                      </div>
                    )}
                    
                    {filteredUsers.map((user) => {
                      const isSelected = selectedEmailsList.includes(user.email)
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleEmail(user.email)}
                          className="flex w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <span className={`grid size-4 place-items-center rounded border border-border/80 bg-white ${
                            isSelected ? "border-primary bg-primary text-primary-foreground" : ""
                          }`}>
                            {isSelected && <Check className="size-3" />}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold truncate">{user.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                          </div>
                        </button>
                      )
                    })}

                    {showAddCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          toggleEmail(searchQuery.trim())
                          setSearchQuery("")
                        }}
                        className="flex w-full items-center gap-2 rounded-md bg-primary/5 px-2.5 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Plus className="size-3.5" />
                        Tambah email kustom: "{searchQuery.trim()}"
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {selectedEmailsList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1 p-2 rounded-lg border border-border/50 bg-muted/10 max-h-[100px] overflow-y-auto">
                  {selectedEmailsList.map((email) => {
                    const matchedUser = emails.find((u) => u.email === email)
                    return (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 bg-white border border-border/80 text-foreground px-2 py-0.5 rounded-md text-[10px] font-medium shadow-sm"
                      >
                        <span className="max-w-[150px] truncate">
                          {matchedUser ? `${matchedUser.name} (${email})` : email}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleEmail(email)}
                          className="text-muted-foreground hover:text-rose-600 transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">
                  Belum ada penerima email pengingat yang dipilih.
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Catatan Tambahan</Label>
            <Textarea
              id="notes"
              placeholder="Catatan kerusakan, jadwal kalibrasi, dll..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Foto Barang (Maks. 2MB)</Label>
            <div className="flex items-center gap-4">
              <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-input px-3 py-2 text-sm font-semibold shadow-sm hover:bg-muted">
                {uploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="mr-2 size-4 text-muted-foreground" />
                )}
                {photoUrl ? "Ganti File" : "Pilih File"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {photoUrl && (
                <div className="relative size-12 overflow-hidden rounded-md border bg-muted shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="Preview" className="size-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading || uploading} className="bg-primary text-white hover:bg-primary/90">
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {item ? "Perbarui Barang" : "Simpan Barang"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// 2. DIALOG PREVIEW DOKUMEN / VIEW DETAIL (A4)
// ==========================================
interface DetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: HseInventory | null
  onEditClick: () => void
  canEdit: boolean
}

export function HseInventoryDetailDialog({
  open,
  onOpenChange,
  item,
  onEditClick,
  canEdit,
}: DetailDialogProps) {
  if (!item) return null

  const handlePrint = () => {
    // Membuka print preview pada tab/window baru atau langsung memicu window.print()
    const printContent = document.getElementById("printable-document-hse-inv")?.innerHTML
    if (!printContent) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>${item.name}</title>
          <style>
            @media print {
              @page { size: A4; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, sans-serif; font-size: 10pt; color: #0f172a; margin: 0; padding: 0; }
              .no-print { display: none !important; }
              .pdf-wrapper { padding: 0; box-shadow: none !important; border: none !important; }
            }
            body { font-family: Arial, sans-serif; font-size: 10pt; color: #0f172a; margin: 20px; }
            .pdf-wrapper { max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; }
            .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .header-left { display: flex; align-items: center; gap: 12px; }
            .header-title { font-size: 16px; font-weight: bold; margin: 0; color: #0f172a; }
            .header-subtitle { font-size: 10px; font-weight: bold; margin: 2px 0 0; color: #1e3a8a; letter-spacing: 0.5px; }
            .header-meta { font-size: 9px; color: #64748b; margin-top: 4px; }
            .badge-verified { border: 2px solid #0f172a; border-radius: 50%; width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #0f172a; transform: rotate(-5deg); }
            .meta-grid { display: grid; grid-template-cols: repeat(6, 1fr); gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; font-size: 9px; }
            .meta-item { display: flex; flex-direction: column; gap: 2px; }
            .meta-label { font-weight: bold; text-transform: uppercase; color: #64748b; font-size: 8px; letter-spacing: 0.5px; }
            .meta-val { font-weight: bold; color: #0f172a; }
            .banner-strip { background-color: #1e293b; color: white; padding: 12px 16px; border-radius: 6px; display: flex; align-items: center; justify-content: justify; margin-bottom: 16px; position: relative; }
            .banner-left { flex: 1; }
            .banner-label { font-size: 9px; text-transform: uppercase; color: #94a3b8; font-weight: bold; letter-spacing: 1px; }
            .banner-title { font-size: 14px; font-weight: bold; margin: 2px 0 0; text-transform: uppercase; }
            .banner-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
            .badge-condition { background: #f59e0b; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 9px; font-weight: bold; }
            .badge-condition.baik { background: #10b981; }
            .badge-condition.rusak { background: #ef4444; }
            .content-grid { display: grid; grid-template-cols: 1.5fr 1fr; gap: 16px; margin-bottom: 16px; }
            .info-block { display: flex; flex-direction: column; gap: 12px; }
            .info-item { display: flex; flex-direction: column; gap: 4px; }
            .info-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
            .info-val { font-size: 10px; font-weight: bold; }
            .info-text { font-size: 9.5px; color: #334155; line-height: 1.4; font-style: italic; }
            .box-verify { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
            .box-verify-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
            .verify-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
            .verify-icon-box { background: white; border: 1px solid #e2e8f0; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #64748b; }
            .verify-details { display: flex; flex-direction: column; }
            .verify-label { font-size: 8px; color: #64748b; }
            .verify-val { font-size: 9px; font-weight: bold; }
            .photo-section { border-top: 1px dashed #cbd5e1; padding-top: 16px; }
            .photo-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px; }
            .photo-img { max-width: 100%; max-height: 250px; border-radius: 6px; border: 1px solid #e2e8f0; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="pdf-wrapper">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const formattedPurchaseDate = item.purchaseDate
    ? new Date(item.purchaseDate).toLocaleDateString("id-ID", { dateStyle: "medium" })
    : "-"
  const formattedExpDate = item.expirationDate
    ? new Date(item.expirationDate).toLocaleDateString("id-ID", { dateStyle: "medium" })
    : "-"
  const formattedUpdateDate = item.updatedAt
    ? new Date(item.updatedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })
    : "-"

  const getConditionColor = (cond: string) => {
    if (cond === "Baik") return "baik"
    if (cond === "Rusak") return "rusak"
    return "perbaikan"
  }

  const getConditionLabel = (cond: string) => {
    if (cond === "Baik") return "Baik"
    if (cond === "Rusak") return "Rusak"
    return "Perlu Perbaikan"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Preview Dokumen Aset HSE</DialogTitle>
          <DialogDescription>
            Tampilan lembar data resmi dan histori aset untuk cetak dokumen fisik.
          </DialogDescription>
        </DialogHeader>

        {/* Action Buttons Top */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3 mb-2 no-print">
          <div className="flex items-center gap-2 bg-surface-container-low rounded-lg p-1.5 text-xs text-muted-foreground border">
            <FileText className="size-4 text-primary" />
            <span className="font-semibold">{item.documentId}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Verified
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEditClick}>
                <Edit3 className="mr-1.5 size-4" />
                Edit Aset
              </Button>
            )}
            {item.photoUrl && (
              <a href={item.photoUrl} target="_blank" rel="noreferrer" className="no-underline">
                <Button variant="outline" size="sm" type="button">
                  <Download className="mr-1.5 size-4" />
                  Unduh / Buka Foto
                </Button>
              </a>
            )}
            <Button size="sm" onClick={handlePrint} className="bg-primary text-white hover:bg-primary/90">
              <Printer className="mr-1.5 size-4" />
              Cetak Dokumen
            </Button>
          </div>
        </div>

        {/* WYSIWYG PDF-WRAPPER */}
        <div
          id="printable-document-hse-inv"
          className="pdf-wrapper border rounded-xl bg-white p-6 shadow-sm max-w-[800px] mx-auto text-[#0f172a]"
        >
          {/* Header PT */}
          <div className="header-container flex items-center justify-between border-b-2 border-[#0f172a] pb-3 mb-4">
            <div className="header-left flex items-center gap-3">
              {/* Logo placeholder icon */}
              <div className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <FileText className="size-6" />
              </div>
              <div>
                <h3 className="header-title text-base font-extrabold text-[#0f172a] uppercase leading-none">
                  PT. NUSANTARA PRATAMA HSEK3
                </h3>
                <p className="header-subtitle text-[10px] font-bold text-blue-900 tracking-wider uppercase mt-1">
                  Safety is our core value. Protect your future.
                </p>
                <p className="header-meta text-[9px] text-[#64748b] leading-tight mt-1">
                  Kawasan Industri Jababeka XI, Cikarang, Indonesia<br />
                  Phone: +62 21 8989 7788 | Email: hseinsight@gmail.com • OFFICIAL HSE SYSTEM
                </p>
              </div>
            </div>

            {/* Seal Verified */}
            <div className="badge-verified border-2 border-[#0f172a] rounded-full size-14 flex flex-col items-center justify-center text-[8px] font-extrabold text-[#0f172a] uppercase select-none -rotate-6">
              <span>Verified</span>
              <span className="text-[6px] text-muted-foreground mt-0.5">System</span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="meta-grid grid grid-cols-6 gap-2 border-b border-border/80 pb-3 mb-4 text-[9px] leading-tight">
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Document ID</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">{item.documentId}</span>
            </div>
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Classification</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">ASSET INVENT</span>
            </div>
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Location / Site</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">{item.location}</span>
            </div>
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Date / Period</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">{formattedPurchaseDate}</span>
            </div>
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">PIC / Auditor</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">{item.picName}</span>
            </div>
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Doc Status</span>
              <span className="meta-val font-bold text-emerald-600 uppercase mt-0.5">Verified</span>
            </div>
          </div>

          {/* Banner Log */}
          <div className="banner-strip bg-[#1e293b] text-white p-3 rounded-lg flex items-center justify-between mb-4">
            <div className="banner-left">
              <span className="banner-label text-[9px] uppercase tracking-wider text-[#94a3b8] font-bold">Asset & Inventory Log</span>
              <h2 className="banner-title text-base font-extrabold text-white mt-0.5 uppercase">
                {item.name}
              </h2>
            </div>
            <div className="banner-right flex flex-col items-end">
              <span className="text-[10px] text-white/80 font-semibold mb-1">QTY: {item.qty}</span>
              <span className={`badge-condition text-[9px] font-bold text-white px-2 py-0.5 rounded-full ${
                getConditionColor(item.condition) === "baik" ? "bg-emerald-500" :
                getConditionColor(item.condition) === "rusak" ? "bg-rose-500" : "bg-amber-500"
              }`}>
                {getConditionLabel(item.condition)}
              </span>
            </div>
          </div>

          {/* Content Columns */}
          <div className="content-grid grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 mb-4">
            {/* Left Info Column */}
            <div className="info-block flex flex-col gap-4">
              <div className="info-item">
                <span className="info-label text-[8px] font-bold uppercase text-[#64748b] tracking-wider">Type / Kategori</span>
                <span className="info-val text-[11px] font-bold text-[#0f172a] mt-0.5">{item.category}</span>
              </div>
              <div className="info-item">
                <span className="info-label text-[8px] font-bold uppercase text-[#64748b] tracking-wider">Lokasi Simpan</span>
                <span className="info-val text-[11px] font-bold text-[#0f172a] mt-0.5">{item.location}</span>
              </div>
              <div className="info-item">
                <span className="info-label text-[8px] font-bold uppercase text-[#64748b] tracking-wider">Catatan Tambahan</span>
                <p className="info-text text-[9.5px] italic text-[#334155] leading-relaxed mt-1 border-l-2 border-border/80 pl-2">
                  {item.notes || "Tidak ada catatan tambahan."}
                </p>
              </div>
            </div>

            {/* Right Verification Column */}
            <div className="box-verify bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
              <h5 className="box-verify-title text-[9px] font-bold uppercase text-[#64748b] tracking-wider border-b pb-2 mb-3">
                Inventory Verification
              </h5>
              
              <div className="verify-row flex items-center gap-3 mb-3">
                <div className="verify-icon-box border rounded-full size-8 grid place-items-center bg-white text-[#64748b]">
                  <User className="size-4" />
                </div>
                <div className="verify-details flex flex-col">
                  <span className="verify-label text-[8px] text-[#64748b]">PIC Asset</span>
                  <span className="verify-val text-[10px] font-bold text-[#0f172a]">{item.picName}</span>
                </div>
              </div>

              <div className="verify-row flex items-center gap-3 mb-3">
                <div className="verify-icon-box border rounded-full size-8 grid place-items-center bg-white text-[#64748b]">
                  <Calendar className="size-4" />
                </div>
                <div className="verify-details flex flex-col">
                  <span className="verify-label text-[8px] text-[#64748b]">Tanggal Update</span>
                  <span className="verify-val text-[10px] font-bold text-[#0f172a]">{formattedUpdateDate}</span>
                </div>
              </div>

              <div className="verify-row flex items-center gap-3 mb-3">
                <div className="verify-icon-box border rounded-full size-8 grid place-items-center bg-white text-[#64748b]">
                  <Calendar className="size-4" />
                </div>
                <div className="verify-details flex flex-col">
                  <span className="verify-label text-[8px] text-[#64748b]">Tanggal Expired</span>
                  <span className="verify-val text-[10px] font-bold text-rose-600">{formattedExpDate}</span>
                </div>
              </div>

              <div className="text-[8px] text-muted-foreground mt-4 text-center border-t pt-2">
                Reminder {item.reminderDaysBefore} Hari Sebelum Expired
              </div>
            </div>
          </div>

          {/* Photo Section */}
          {item.photoUrl && (
            <div className="photo-section border-t border-dashed border-border/80 pt-4">
              <span className="photo-title text-[9px] font-bold uppercase text-[#64748b] tracking-wider mb-2 block">
                Evidence & Photo Preview
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.photoUrl}
                alt="Bukti Aset"
                className="photo-img rounded-lg border max-w-full max-h-[300px] object-contain mx-auto"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
