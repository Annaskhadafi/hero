'use client'

import * as React from 'react'
import {
  HeroFormDialog,
  HeroFormField,
  HeroInput,
  HeroTextarea,
  HeroSearchableSelect,
  HeroFileUpload,
} from '@/components/templates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowRight, Box, CheckCircle2, Info, MapPin, UserCheck, ShieldCheck, PenTool, Upload } from 'lucide-react'
import { SignaturePad } from '@/components/signature-pad'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import type { AssetTransferInput } from '../schema'
import { createAssetTransfer } from '../actions'

interface AssetTransferFormDialogProps {
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
    position: string | null
    siteId: number | null
    siteName: string | null
    departmentName: string | null
    directManagerId?: number | null
  }>
  sites: Array<{
    id: number
    name: string
    code: string | null
  }>
}

export function AssetTransferFormDialog({
  open,
  onOpenChange,
  onSuccess,
  masterAssets,
  employees,
  sites,
}: AssetTransferFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Form states
  const [assetId, setAssetId] = React.useState<string>('')
  const [equipmentText, setEquipmentText] = React.useState<string>('')
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null)
  const [currentHolderId, setCurrentHolderId] = React.useState<string>('')
  const [currentLocationId, setCurrentLocationId] = React.useState<string>('')
  const [newHolderId, setNewHolderId] = React.useState<string>('')
  const [targetLocationId, setTargetLocationId] = React.useState<string>('')
  const [currentHolderManagerId, setCurrentHolderManagerId] = React.useState<string>('')
  const [newHolderManagerId, setNewHolderManagerId] = React.useState<string>('')
  const [notes, setNotes] = React.useState<string>('')

  // Submitter Signature State
  const [submitterSig, setSubmitterSig] = React.useState<string | null>(null)
  const [profileSig, setProfileSig] = React.useState<string | null>(null)
  const [uploadedSigUrl, setUploadedSigUrl] = React.useState<string | null>(null)
  const [sigMode, setSigMode] = React.useState<'profile' | 'draw' | 'upload'>('profile')
  const signatureFileInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch saved user profile signature on modal open
  React.useEffect(() => {
    if (open) {
      getUserSignatureAction()
        .then((res) => {
          if (res && res.success && res.signatureDataUrl) {
            setProfileSig(res.signatureDataUrl)
            setSubmitterSig(res.signatureDataUrl)
            setSigMode('profile')
          } else {
            setSigMode('draw')
          }
        })
        .catch(() => {
          setSigMode('draw')
        })
    }
  }, [open])

  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa berkas gambar (PNG, JPG, atau WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar tanda tangan maksimal 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setUploadedSigUrl(dataUrl)
      setSubmitterSig(dataUrl)
      toast.success('Gambar tanda tangan berhasil dimuat.')
    }
    reader.readAsDataURL(file)
  }

  // Selected asset details
  const selectedAsset = React.useMemo(() => {
    if (!assetId) return null
    return masterAssets.find((a) => String(a.id) === assetId) || null
  }, [assetId, masterAssets])

  const currentHolderEmp = React.useMemo(() => {
    if (!currentHolderId) return null
    return employees.find((e) => String(e.id) === currentHolderId) || null
  }, [currentHolderId, employees])

  const newHolderEmp = React.useMemo(() => {
    if (!newHolderId) return null
    return employees.find((e) => String(e.id) === newHolderId) || null
  }, [newHolderId, employees])

  // When asset is selected, auto-select current holder and location
  React.useEffect(() => {
    if (selectedAsset) {
      if (selectedAsset.holderEmployeeId) {
        setCurrentHolderId(String(selectedAsset.holderEmployeeId))
      }
      if (selectedAsset.location) {
        const matchedSite = sites.find(
          (s) => s.name.toLowerCase() === selectedAsset.location.toLowerCase()
        )
        if (matchedSite && currentLocationId !== String(matchedSite.id)) {
          setCurrentLocationId(String(matchedSite.id))
        }
      }
    }
  }, [selectedAsset, sites, currentLocationId])

  // Auto-detect Step 1 Manager when currentHolderId changes
  React.useEffect(() => {
    if (currentHolderId) {
      const emp = employees.find((e) => String(e.id) === currentHolderId)
      if (emp?.directManagerId) {
        setCurrentHolderManagerId(String(emp.directManagerId))
      }
    } else {
      setCurrentHolderManagerId('')
    }
  }, [currentHolderId, employees])

  // Auto-detect Step 3 Manager when newHolderId changes
  React.useEffect(() => {
    if (newHolderId) {
      const emp = employees.find((e) => String(e.id) === newHolderId)
      if (emp?.directManagerId) {
        setNewHolderManagerId(String(emp.directManagerId))
      }
      if (emp?.siteId && !targetLocationId) {
        setTargetLocationId(String(emp.siteId))
      }
    } else {
      setNewHolderManagerId('')
    }
  }, [newHolderId, employees, targetLocationId])

  // Reset form once when dialog transitions from closed to open
  const prevOpenRef = React.useRef(open)
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      setAssetId('')
      setEquipmentText('')
      setPhotoUrl(null)
      setCurrentHolderId('')
      setCurrentLocationId('')
      setNewHolderId('')
      setTargetLocationId('')
      setCurrentHolderManagerId('')
      setNewHolderManagerId('')
      setNotes('')
      setUploadedSigUrl(null)
    }
    prevOpenRef.current = open
  }, [open])

  // Asset options for SearchableSelect
  const assetOptions = React.useMemo(() => {
    return masterAssets.map((a) => ({
      value: String(a.id),
      label: `${a.description} ${a.assetNumber ? `[${a.assetNumber}]` : ''}`,
      description: `Lokasi: ${a.location || '-'} • Kondisi: ${a.condition || '-'}`,
      badge: a.workSection || undefined,
    }))
  }, [masterAssets])

  // Employee options
  const employeeOptions = React.useMemo(() => {
    return employees.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.employeeSn})`,
      description: `${e.position || 'Staff'} • ${e.siteName || e.departmentName || '-'}`,
    }))
  }, [employees])

  // Site options
  const siteOptions = React.useMemo(() => {
    return sites.map((s) => ({
      value: String(s.id),
      label: s.name,
      description: s.code ? `Kode: ${s.code}` : undefined,
    }))
  }, [sites])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assetId) {
      toast.error('Silakan pilih aset dari daftar master data.')
      return
    }
    if (!currentHolderId) {
      toast.error('Silakan pilih pemegang aset saat ini.')
      return
    }
    if (!currentLocationId) {
      toast.error('Silakan pilih lokasi aset saat ini.')
      return
    }
    if (!newHolderId) {
      toast.error('Silakan pilih penerima baru (holder baru).')
      return
    }
    if (!targetLocationId) {
      toast.error('Silakan pilih lokasi tujuan transfer.')
      return
    }
    if (currentHolderId === newHolderId && currentLocationId === targetLocationId) {
      toast.error('Holder baru dan lokasi tujuan tidak boleh sama persis dengan saat ini.')
      return
    }
    if (!submitterSig) {
      toast.error('Tanda tangan pemohon wajib dibubuhkan sebelum mengirimkan pengajuan.')
      return
    }

    try {
      setIsSubmitting(true)

      const checklistArray = equipmentText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)

      const payload: AssetTransferInput = {
        assetId: Number(assetId),
        equipmentChecklist: checklistArray.length > 0 ? checklistArray : (equipmentText.trim() ? [equipmentText.trim()] : []),
        equipmentOtherNote: equipmentText.trim() || null,
        assetPhotos: photoUrl
          ? [{ fileName: 'foto-kondisi-aset.jpg', fileUrl: photoUrl }]
          : [],
        currentHolderEmployeeId: Number(currentHolderId),
        currentLocationSiteId: Number(currentLocationId),
        newHolderEmployeeId: Number(newHolderId),
        targetLocationSiteId: Number(targetLocationId),
        currentHolderManagerId: currentHolderManagerId ? Number(currentHolderManagerId) : null,
        newHolderManagerId: newHolderManagerId ? Number(newHolderManagerId) : null,
        notes: notes.trim() || null,
        applicantSignatureUrl: submitterSig,
      }

      const res = await createAssetTransfer(payload)

      if (res.success) {
        toast.success(res.message)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || 'Gagal mengajukan transfer aset')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Terjadi kesalahan sistem saat menyimpan data.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Formulir Transfer Aset"
      description="Pindahkan aset ke pemegang baru atau relokasi site dengan alur persetujuan terstandarisasi."
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Kirim Pengajuan Transfer"
      cancelLabel="Batal"
      maxWidth="5xl"
    >
      <div className="space-y-6 py-1">
        {/* SECTION 1: PILIH MASTER ASET */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Box className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">1. Identifikasi Aset</h4>
            <Badge variant="outline" className="text-xs ml-auto">
              Master Data Aset
            </Badge>
          </div>

          <HeroFormField
            label="Pilih Aset"
            required
            helperText="Pilih aset dari katalog master yang terdaftar di HERO"
          >
            <HeroSearchableSelect
              options={assetOptions}
              value={assetId}
              onChange={setAssetId}
              placeholder="Cari nama aset, nomor aset, atau kategori..."
              clearable
            />
          </HeroFormField>

          {/* Asset Info Snapshot Box */}
          {selectedAsset && (
            <div className="rounded-md bg-muted/40 border border-border/60 p-3 text-xs space-y-1.5 animate-in fade-in-50">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-medium text-foreground">Detail Aset Terpilih:</span>
                <span className="text-primary font-mono">{selectedAsset.assetNumber || 'Tanpa No. Aset'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-muted-foreground">
                <div>
                  <span className="text-slate-400">Deskripsi:</span>{' '}
                  <span className="text-foreground font-medium">{selectedAsset.description}</span>
                </div>
                <div>
                  <span className="text-slate-400">Serial No:</span>{' '}
                  <span className="text-foreground font-mono">{selectedAsset.serialNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Lokasi Asal:</span>{' '}
                  <span className="text-foreground font-medium">{selectedAsset.location || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: KELENGKAPAN ASET (INPUT MANUAL) */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <ShieldCheck className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">2. Kelengkapan Aset</h4>
            <span className="text-xs text-muted-foreground ml-auto">Ketik manual kelengkapan</span>
          </div>

          <HeroFormField
            label="Daftar Kelengkapan Aset"
            required
            helperText="Ketikkan kelengkapan aset yang disertakan dalam mutasi (contoh: Unit Laptop, Charger Original 65W, Tas, Mouse Wireless, Kabel Power)"
          >
            <HeroTextarea
              value={equipmentText}
              onChange={(e) => setEquipmentText(e.target.value)}
              placeholder="Contoh: Unit Laptop, Charger Original 65W, Tas Jinak, Mouse Wireless..."
              rows={3}
            />
          </HeroFormField>
        </div>

        {/* SECTION 3: FOTO KONDISI ASET */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Info className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">3. Foto Kondisi Fisik Aset</h4>
          </div>

          <HeroFormField
            label="Unggah Foto Kondisi Aset"
            helperText="Foto bukti fisik sebelum aset diserahterimakan (JPG/PNG, tersimpan persisten di S3 CloudHost)"
          >
            <HeroFileUpload
              value={photoUrl}
              onChange={setPhotoUrl}
              label="Unggah Foto Fisik Aset"
              description="Format gambar JPG atau PNG (Maksimal 10MB)"
              accept="image/*"
            />
          </HeroFormField>
        </div>

        {/* SECTION 4: SERAH TERIMA & PERSETUJUAN */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <UserCheck className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">4. Serah Terima & Persetujuan Holder</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Asal (Saat Ini) */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <MapPin className="size-3.5" />
                <span>Pihak Asal (Holder Saat Ini)</span>
              </div>

              <HeroFormField label="Pemegang Saat Ini" required>
                <HeroSearchableSelect
                  options={employeeOptions}
                  value={currentHolderId}
                  onChange={setCurrentHolderId}
                  placeholder="Pilih nama karyawan..."
                  clearable
                />
              </HeroFormField>

              <HeroFormField
                label="Atasan Langsung (Approval Pelepasan Aset)"
                helperText={
                  currentHolderEmp?.directManagerId
                    ? '✓ Terdeteksi otomatis dari master data karyawan'
                    : 'Pilih atasan berwenang jika belum tercatat di data karyawan'
                }
              >
                <HeroSearchableSelect
                  options={employeeOptions}
                  value={currentHolderManagerId}
                  onChange={setCurrentHolderManagerId}
                  placeholder="Pilih atasan langsung pemegang saat ini..."
                  clearable
                />
              </HeroFormField>

              <HeroFormField label="Lokasi Site Saat Ini" required>
                <HeroSearchableSelect
                  options={siteOptions}
                  value={currentLocationId}
                  onChange={setCurrentLocationId}
                  placeholder="Pilih site asal..."
                  clearable
                />
              </HeroFormField>
            </div>

            {/* Tujuan (Baru) */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <ArrowRight className="size-3.5" />
                <span>Pihak Penerima (Holder Baru)</span>
              </div>

              <HeroFormField label="Ditransfer ke Siapa (Holder Baru)" required>
                <HeroSearchableSelect
                  options={employeeOptions}
                  value={newHolderId}
                  onChange={setNewHolderId}
                  placeholder="Pilih nama karyawan penerima..."
                  clearable
                />
              </HeroFormField>

              <HeroFormField
                label="Atasan Langsung (Approval Penerimaan Aset)"
                helperText={
                  newHolderEmp?.directManagerId
                    ? '✓ Terdeteksi otomatis dari master data karyawan'
                    : 'Pilih atasan berwenang jika belum tercatat di data karyawan'
                }
              >
                <HeroSearchableSelect
                  options={employeeOptions}
                  value={newHolderManagerId}
                  onChange={setNewHolderManagerId}
                  placeholder="Pilih atasan langsung penerima baru..."
                  clearable
                />
              </HeroFormField>

              <HeroFormField label="Lokasi Site Tujuan" required>
                <HeroSearchableSelect
                  options={siteOptions}
                  value={targetLocationId}
                  onChange={setTargetLocationId}
                  placeholder="Pilih site tujuan..."
                  clearable
                />
              </HeroFormField>
            </div>
          </div>
        </div>

        {/* SECTION 5: CATATAN TAMBAHAN */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-4">
          <HeroFormField
            label="5. Catatan Tambahan (Additional Note)"
            helperText="Tuliskan alasan pemindahan, kondisi fisik saat serah terima, atau catatan khusus"
          >
            <HeroTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pemindahan unit laptop untuk menunjang tugas baru di Site Tabang..."
              rows={3}
              maxLength={500}
              showCount
            />
          </HeroFormField>
        </div>

        {/* SECTION 6: TANDA TANGAN PEMOHON / PENGAJU */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                6. Tanda Tangan Pemohon / Pengaju <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Tanda tangan digital Anda akan tertera pada formulir resmi dan Berita Acara Transfer Aset.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
              {profileSig && (
                <Button
                  type="button"
                  variant={sigMode === 'profile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setSigMode('profile')
                    setSubmitterSig(profileSig)
                  }}
                  className="h-7 text-xs px-2.5 gap-1"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Profil
                </Button>
              )}
              <Button
                type="button"
                variant={sigMode === 'draw' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setSigMode('draw')
                  setSubmitterSig(null)
                }}
                className="h-7 text-xs px-2.5 gap-1"
              >
                <PenTool className="h-3.5 w-3.5" />
                Coret
              </Button>
              <Button
                type="button"
                variant={sigMode === 'upload' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setSigMode('upload')
                  setSubmitterSig(uploadedSigUrl)
                }}
                className="h-7 text-xs px-2.5 gap-1"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </Button>
            </div>
          </div>

          <input
            ref={signatureFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleSignatureImageUpload}
          />

          {sigMode === 'profile' && profileSig && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800 p-4 flex flex-col items-center justify-center min-h-[120px] max-w-md relative">
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Terdaftar di Profil
              </span>
              <img
                src={profileSig}
                alt="Tanda Tangan Pemohon"
                className="max-h-24 object-contain my-1"
              />
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-1">
                Tanda Tangan Terverifikasi
              </p>
            </div>
          )}

          {sigMode === 'draw' && (
            <div className="max-w-md space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Goreskan tanda tangan Anda pada area putih di bawah ini:
              </p>
              <SignaturePad
                onDataUrlChange={(dataUrl) => setSubmitterSig(dataUrl)}
                onSaveToProfile={(dataUrl) => {
                  setProfileSig(dataUrl)
                  setSigMode('profile')
                  setSubmitterSig(dataUrl)
                }}
                height={130}
              />
            </div>
          )}

          {sigMode === 'upload' && (
            <div className="max-w-md space-y-2">
              {uploadedSigUrl ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-800 p-4 flex flex-col items-center justify-center min-h-[120px] relative">
                  <img
                    src={uploadedSigUrl}
                    alt="Unggahan Tanda Tangan"
                    className="max-h-24 object-contain my-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureFileInputRef.current?.click()}
                    className="h-7 text-xs mt-2"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" /> Ganti Gambar
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => signatureFileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/30 hover:bg-muted/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center min-h-[120px]"
                >
                  <div className="p-2 bg-primary/10 rounded-full text-primary mb-2">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    Klik untuk unggah gambar tanda tangan
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Format PNG, JPG, atau WebP (Maksimal 5MB)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </HeroFormDialog>
  )
}
