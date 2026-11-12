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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowRight, Box, CheckCircle2, Info, MapPin, UserCheck, ShieldCheck } from 'lucide-react'
import { EQUIPMENT_CHECKBOX_OPTIONS, type AssetTransferInput } from '../schema'
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
  const [selectedEquipment, setSelectedEquipment] = React.useState<string[]>([])
  const [otherEquipmentNote, setOtherEquipmentNote] = React.useState<string>('')
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null)
  const [currentHolderId, setCurrentHolderId] = React.useState<string>('')
  const [currentLocationId, setCurrentLocationId] = React.useState<string>('')
  const [newHolderId, setNewHolderId] = React.useState<string>('')
  const [targetLocationId, setTargetLocationId] = React.useState<string>('')
  const [currentHolderManagerId, setCurrentHolderManagerId] = React.useState<string>('')
  const [newHolderManagerId, setNewHolderManagerId] = React.useState<string>('')
  const [notes, setNotes] = React.useState<string>('')

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
      setSelectedEquipment([])
      setOtherEquipmentNote('')
      setPhotoUrl(null)
      setCurrentHolderId('')
      setCurrentLocationId('')
      setNewHolderId('')
      setTargetLocationId('')
      setCurrentHolderManagerId('')
      setNewHolderManagerId('')
      setNotes('')
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

  const toggleEquipment = (item: string, checked: boolean) => {
    setSelectedEquipment((prev) =>
      checked ? (prev.includes(item) ? prev : [...prev, item]) : prev.filter((i) => i !== item)
    )
  }

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

    try {
      setIsSubmitting(true)

      const payload: AssetTransferInput = {
        assetId: Number(assetId),
        equipmentChecklist: selectedEquipment,
        equipmentOtherNote: otherEquipmentNote.trim() || null,
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
      maxWidth="xl"
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

        {/* SECTION 2: KELENGKAPAN ASET (CHECKBOXES) */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <ShieldCheck className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">2. Kelengkapan Aset</h4>
            <span className="text-xs text-muted-foreground ml-auto">Centang item yang disertakan</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {EQUIPMENT_CHECKBOX_OPTIONS.map((item) => {
              const isChecked = selectedEquipment.includes(item)
              return (
                <label
                  key={item}
                  htmlFor={`equip-${item}`}
                  className={`flex items-center space-x-2.5 rounded-md border p-2.5 cursor-pointer transition-colors text-xs select-none ${
                    isChecked
                      ? 'border-primary/60 bg-primary/5 text-foreground font-medium'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <Checkbox
                    id={`equip-${item}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => toggleEquipment(item, Boolean(checked))}
                  />
                  <span className="cursor-pointer text-xs leading-none">
                    {item}
                  </span>
                </label>
              )
            })}
          </div>

          {selectedEquipment.includes('Other') && (
            <HeroFormField label="Keterangan Kelengkapan Lainnya (Other)">
              <HeroInput
                value={otherEquipmentNote}
                onChange={(e) => setOtherEquipmentNote(e.target.value)}
                placeholder="Sebutkan kelengkapan lain yang disertakan..."
              />
            </HeroFormField>
          )}
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
      </div>
    </HeroFormDialog>
  )
}
