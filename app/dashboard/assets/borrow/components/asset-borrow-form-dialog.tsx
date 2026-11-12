'use client'

import * as React from 'react'
import {
  HeroFormDialog,
  HeroFormField,
  HeroTextarea,
  HeroSearchableSelect,
} from '@/components/templates'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Box, UserCheck, ShieldCheck, Clock, Calendar, CheckCircle2 } from 'lucide-react'
import { type AssetBorrowInput } from '../schema'
import { createAssetBorrow } from '../actions'

interface AssetBorrowFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  masterAssets: Array<{
    id: number
    description: string
    assetNumber: string | null
    serialNumber: string | null
    location: string
    condition: string
    workSection?: string
    holderEmployeeId?: number | null
    holderName?: string | null
    holderEmployeeSn?: string | null
  }>
  employees: Array<{
    id: number
    employeeSn: string
    name: string
    jobTitle: string | null
    departmentName: string | null
    siteName: string | null
  }>
}

export function AssetBorrowFormDialog({
  open,
  onOpenChange,
  onSuccess,
  masterAssets,
  employees,
}: AssetBorrowFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Form states
  const [borrowerEmployeeId, setBorrowerEmployeeId] = React.useState<string>('')
  const [assetId, setAssetId] = React.useState<string>('')
  const [equipmentNotes, setEquipmentNotes] = React.useState<string>('')
  const [purpose, setPurpose] = React.useState<string>('')

  // Default borrow date: now formatted as YYYY-MM-DDTHH:mm
  const getNowDatetimeString = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  // Default expected return date: tomorrow formatted as YYYY-MM-DDTHH:mm
  const getDefaultReturnDatetimeString = () => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  const [borrowDate, setBorrowDate] = React.useState<string>(getNowDatetimeString())
  const [expectedReturnDate, setExpectedReturnDate] = React.useState<string>(getDefaultReturnDatetimeString())

  // Selected asset details
  const selectedAsset = React.useMemo(() => {
    if (!assetId) return null
    return masterAssets.find((a) => String(a.id) === assetId) || null
  }, [assetId, masterAssets])

  // Selected borrower details
  const selectedBorrower = React.useMemo(() => {
    if (!borrowerEmployeeId) return null
    return employees.find((e) => String(e.id) === borrowerEmployeeId) || null
  }, [borrowerEmployeeId, employees])

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setBorrowerEmployeeId('')
      setAssetId('')
      setEquipmentNotes('')
      setPurpose('')
      setBorrowDate(getNowDatetimeString())
      setExpectedReturnDate(getDefaultReturnDatetimeString())
    }
  }, [open])

  // Options for Employee Searchable Select
  const employeeOptions = React.useMemo(() => {
    return employees.map((emp) => ({
      value: String(emp.id),
      label: `${emp.name} (${emp.employeeSn})`,
      description: [emp.jobTitle, emp.departmentName, emp.siteName].filter(Boolean).join(' • '),
    }))
  }, [employees])

  // Options for Asset Searchable Select
  const assetOptions = React.useMemo(() => {
    return masterAssets.map((asset) => {
      const isCurrentlyBorrowed = asset.condition?.toUpperCase() === 'BORROWED'
      const label = `${asset.description} ${asset.assetNumber ? `[${asset.assetNumber}]` : ''}`
      const descParts = [
        asset.location ? `Site: ${asset.location}` : '',
        asset.holderName ? `Holder: ${asset.holderName}` : 'Belum Ada Holder',
        isCurrentlyBorrowed ? '⚠️ SEDANG DIPINJAM' : `Status: ${asset.condition || 'ACTIVE'}`,
      ].filter(Boolean)

      return {
        value: String(asset.id),
        label,
        description: descParts.join(' • '),
        disabled: isCurrentlyBorrowed,
      }
    })
  }, [masterAssets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!borrowerEmployeeId) {
      toast.error('Silakan pilih nama peminjam.')
      return
    }

    if (!assetId) {
      toast.error('Silakan pilih aset yang akan dipinjam.')
      return
    }

    if (!selectedAsset?.holderEmployeeId) {
      toast.error('Aset yang dipilih belum memiliki pemegang (holder) resmi.')
      return
    }

    if (String(selectedAsset.holderEmployeeId) === borrowerEmployeeId) {
      toast.error('Peminjam tidak boleh sama dengan holder aset saat ini.')
      return
    }

    if (!purpose.trim()) {
      toast.error('Silakan isi tujuan peminjaman aset.')
      return
    }

    if (!borrowDate) {
      toast.error('Silakan tentukan waktu peminjaman.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: AssetBorrowInput = {
        assetId: Number(assetId),
        borrowerEmployeeId: Number(borrowerEmployeeId),
        equipmentNotes: equipmentNotes.trim() || null,
        purpose: purpose.trim(),
        borrowDate,
        expectedReturnDate: expectedReturnDate || null,
      }

      const res = await createAssetBorrow(payload)
      if (res.success) {
        toast.success(res.message)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || 'Gagal mengajukan peminjaman aset')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Terjadi kesalahan sistem saat menyimpan data peminjaman.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Formulir Peminjaman Aset (Asset Borrow)"
      description="Peminjaman aset operasional dengan verifikasi persetujuan resmi dari holder fisik barang."
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Kirim Pengajuan Peminjaman"
      cancelLabel="Batal"
      maxWidth="xl"
    >
      <div className="space-y-5 py-1">
        {/* SEKSI 1: IDENTIFIKASI PEMINJAM & ASET */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Box className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">1. Data Peminjam &amp; Aset</h4>
            <Badge variant="outline" className="text-[11px] ml-auto">
              Wajib Diisi
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Nama Peminjam */}
            <HeroFormField
              label="Nama Peminjam"
              required
              helperText={
                selectedBorrower
                  ? `Posisi: ${selectedBorrower.jobTitle || '-'} • Dept: ${selectedBorrower.departmentName || '-'}`
                  : 'Pilih karyawan yang meminjam aset'
              }
            >
              <HeroSearchableSelect
                options={employeeOptions}
                value={borrowerEmployeeId}
                onChange={setBorrowerEmployeeId}
                placeholder="Ketik nama atau SN peminjam..."
                clearable
              />
            </HeroFormField>

            {/* Nama Aset */}
            <HeroFormField
              label="Nama Aset yang Dipinjam"
              required
              helperText={
                selectedAsset
                  ? `No. Aset: ${selectedAsset.assetNumber || '-'} • Lokasi: ${selectedAsset.location || '-'}`
                  : 'Pilih aset dari daftar master Central Service'
              }
            >
              <HeroSearchableSelect
                options={assetOptions}
                value={assetId}
                onChange={setAssetId}
                placeholder="Cari deskripsi aset atau nomor aset..."
                clearable
              />
            </HeroFormField>
          </div>

          {/* Holder Aset Saat Ini (Auto-detected Display Box) */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-blue-600" />
                Holder Aset Saat Ini:
              </span>
              {selectedAsset?.holderName ? (
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700">
                  <CheckCircle2 className="size-3 mr-1 inline" /> Teridentifikasi
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Otomatis
                </Badge>
              )}
            </div>

            {selectedAsset ? (
              selectedAsset.holderName ? (
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-bold text-sm text-foreground">{selectedAsset.holderName}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({selectedAsset.holderEmployeeSn || 'SN Master'})
                    </span>
                  </div>
                  <span className="text-xs text-blue-700 font-medium">
                    (Approver Serah Terima)
                  </span>
                </div>
              ) : (
                <p className="text-xs text-amber-700 pt-1">
                  ⚠️ Aset ini belum memiliki Holder resmi. Silakan daftarkan pemegang di Master Data terlebih dahulu.
                </p>
              )
            ) : (
              <p className="text-xs text-muted-foreground pt-1">
                Pilih aset di atas untuk mendeteksi pemegang (holder) yang berwenang memberikan persetujuan.
              </p>
            )}
          </div>
        </div>

        {/* SEKSI 2: KELENGKAPAN ASET & WAKTU PEMINJAMAN */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Clock className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">2. Kelengkapan &amp; Waktu Peminjaman</h4>
          </div>

          {/* Kelengkapan Aset (Teks Bebas) */}
          <HeroFormField
            label="Kelengkapan Aset"
            helperText="Tuliskan kelengkapan fisik yang disertakan saat peminjaman"
          >
            <HeroTextarea
              value={equipmentNotes}
              onChange={(e) => setEquipmentNotes(e.target.value)}
              placeholder="Contoh: Unit Laptop ASUS, Charger Original 65W, Mouse Wireless Logitech, Tas Laptop..."
              rows={2}
              maxLength={400}
              showCount
            />
          </HeroFormField>

          {/* Grid Waktu Peminjaman & Estimasi Pengembalian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Waktu Peminjaman (Tanggal &amp; Jam) <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <span className="text-[11px] text-muted-foreground block">
                Saat aset diserahkan/mulai dipinjam
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Estimasi Pengembalian (Tanggal &amp; Jam)
              </label>
              <input
                type="datetime-local"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground block">
                Perkiraan aset dikembalikan ke holder
              </span>
            </div>
          </div>
        </div>

        {/* SEKSI 3: TUJUAN PEMINJAMAN */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-4">
          <HeroFormField
            label="3. Tujuan Peminjaman (Borrowing Purpose)"
            required
            helperText="Jelaskan kebutuhan dinas, proyek, atau alasan operasional peminjaman aset"
          >
            <HeroTextarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Contoh: Peminjaman laptop untuk menunjang tugas audit site Tabang selama 3 hari..."
              rows={3}
              maxLength={500}
              showCount
              required
            />
          </HeroFormField>
        </div>
      </div>
    </HeroFormDialog>
  )
}
