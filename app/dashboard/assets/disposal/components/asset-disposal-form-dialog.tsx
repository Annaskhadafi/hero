'use client'

import * as React from 'react'
import {
  HeroFormDialog,
  HeroFormField,
  HeroInput,
  HeroTextarea,
  HeroSearchableSelect,
  HeroDatePicker,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Trash2,
  Plus,
  Paperclip,
  UploadCloud,
  FileText,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  MapPin,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { uploadFile } from '@/app/actions/upload'
import { createAssetDisposal } from '../actions'
import { type DisposalApproverStep, type DisposalAttachment } from '../schema'

interface AssetDisposalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  sites: Array<{ id: number; name: string; location?: string | null }>
  departments: Array<{ id: number; name: string; code?: string | null }>
  sections: Array<{ id: number; name: string; departmentId?: number | null }>
  assets: Array<{
    id: number
    assetNumber: string | null
    description: string
    serialNumber: string | null
    location: string
    section?: string | null
    purchaseDate?: string | Date | null
    status: string
  }>
  currentEmployee: any | null
  defaultApprovers: DisposalApproverStep[]
  allEmployees?: Array<{ id: number; employeeSn: string; name: string; jobTitle: string | null }>
}

export function AssetDisposalFormDialog({
  open,
  onOpenChange,
  onSuccess,
  sites,
  departments,
  sections,
  assets,
  currentEmployee,
  defaultApprovers,
  allEmployees = [],
}: AssetDisposalFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Selection mode: 'master' | 'manual'
  const [selectionMode, setSelectionMode] = React.useState<'master' | 'manual'>('master')
  const [selectedAssetId, setSelectedAssetId] = React.useState<string>('')

  // Form Fields
  const [assetName, setAssetName] = React.useState<string>('')
  const [assetNumber, setAssetNumber] = React.useState<string>('')
  const [purchaseYear, setPurchaseYear] = React.useState<string>('')

  const [departmentId, setDepartmentId] = React.useState<string>('')
  const [departmentName, setDepartmentName] = React.useState<string>('')
  const [sectionId, setSectionId] = React.useState<string>('')
  const [sectionName, setSectionName] = React.useState<string>('')
  const [siteId, setSiteId] = React.useState<string>('')
  const [siteName, setSiteName] = React.useState<string>('')

  const [disposalDate, setDisposalDate] = React.useState<Date | undefined>(new Date())
  const [notes, setNotes] = React.useState<string>('')

  // Attachments
  const [attachments, setAttachments] = React.useState<DisposalAttachment[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Dynamic Approver Steps
  const [approvers, setApprovers] = React.useState<DisposalApproverStep[]>([])

  // Initialize defaults from current user & default approvers
  React.useEffect(() => {
    if (open) {
      if (currentEmployee) {
        if (currentEmployee.departmentId) {
          setDepartmentId(String(currentEmployee.departmentId))
          const dept = departments.find((d) => d.id === currentEmployee.departmentId)
          if (dept) setDepartmentName(dept.name)
        }
        if (currentEmployee.sectionId) {
          setSectionId(String(currentEmployee.sectionId))
          const sec = sections.find((s) => s.id === currentEmployee.sectionId)
          if (sec) setSectionName(sec.name)
        }
        if (currentEmployee.siteId) {
          setSiteId(String(currentEmployee.siteId))
          const st = sites.find((s) => s.id === currentEmployee.siteId)
          if (st) setSiteName(st.name)
        }
      } else if (sites.length > 0 && !siteId) {
        setSiteId(String(sites[0].id))
        setSiteName(sites[0].name)
      }

      setApprovers(defaultApprovers.length > 0 ? defaultApprovers : [])
    }
  }, [open, currentEmployee, defaultApprovers, departments, sections, sites])

  // Handle master asset selection
  const handleSelectAsset = (val: string) => {
    setSelectedAssetId(val)
    if (!val) {
      setAssetName('')
      setAssetNumber('')
      setPurchaseYear('')
      return
    }

    const found = assets.find((a) => String(a.id) === val)
    if (found) {
      setAssetName(found.description)
      setAssetNumber(found.assetNumber || '')

      if (found.purchaseDate) {
        const d = new Date(found.purchaseDate)
        if (!isNaN(d.getTime())) {
          setPurchaseYear(String(d.getFullYear()))
        }
      }

      // Auto-match site if found location matches
      if (found.location) {
        const matchedSite = sites.find(
          (s) =>
            s.name.toLowerCase().includes(found.location.toLowerCase()) ||
            found.location.toLowerCase().includes(s.name.toLowerCase())
        )
        if (matchedSite) {
          setSiteId(String(matchedSite.id))
          setSiteName(matchedSite.name)
        }
      }
    }
  }

  // Handle department change
  const handleDepartmentChange = (val: string) => {
    setDepartmentId(val)
    const dept = departments.find((d) => String(d.id) === val)
    setDepartmentName(dept ? dept.name : '')
    setSectionId('')
    setSectionName('')
  }

  // Filter sections by department
  const filteredSections = React.useMemo(() => {
    if (!departmentId) return sections
    return sections.filter((s) => String(s.departmentId) === departmentId)
  }, [departmentId, sections])

  // Handle section change
  const handleSectionChange = (val: string) => {
    setSectionId(val)
    const sec = sections.find((s) => String(s.id) === val)
    setSectionName(sec ? sec.name : '')
  }

  // Handle site change
  const handleSiteChange = (val: string) => {
    setSiteId(val)
    const st = sites.find((s) => String(s.id) === val)
    setSiteName(st ? st.name : '')
  }

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fd = new FormData()
        fd.append('file', file)
        fd.append('uploadTarget', 'asset-disposals')

        const res = await uploadFile(fd)
        if (res.success && res.url) {
          setAttachments((prev) => [
            ...prev,
            {
              fileName: file.name,
              fileUrl: res.url,
              fileSize: file.size,
              mimeType: file.type,
            },
          ])
          toast.success(`Berkas "${file.name}" berhasil diunggah.`)
        } else {
          toast.error(res.error || `Gagal mengunggah berkas ${file.name}`)
        }
      }
    } catch (err: any) {
      toast.error('Gagal mengunggah berkas: ' + (err?.message || ''))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  // Approver Chain Manipulation
  const handleMoveApprover = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === approvers.length - 1) return

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    const newArr = [...approvers]
    const temp = newArr[idx]
    newArr[idx] = newArr[targetIdx]
    newArr[targetIdx] = temp

    // Re-index levels
    const reindexed = newArr.map((item, i) => ({
      ...item,
      level: i + 1,
    }))
    setApprovers(reindexed)
  }

  const handleRemoveApprover = (idx: number) => {
    const target = approvers[idx]
    // Guard: Prevent removing Amama Ira
    if (
      target.approverEmployeeId === 1341 ||
      target.approverName.toLowerCase().includes('amama ira')
    ) {
      toast.error('Verifikasi Finance & Accounting (Amama Ira) tidak boleh dihapus dari alur persetujuan.')
      return
    }

    if (approvers.length <= 3) {
      toast.error('Alur approval minimal harus memiliki 3 tahapan.')
      return
    }

    const filtered = approvers.filter((_, i) => i !== idx)
    setApprovers(filtered.map((item, i) => ({ ...item, level: i + 1 })))
  }

  const handleAddApprover = () => {
    const newStep: DisposalApproverStep = {
      level: approvers.length + 1,
      title: `Step ${approvers.length + 1}: Reviewer Tambahan`,
      approverEmployeeId: 1008,
      approverName: 'Andana Gustafianto',
      jobTitle: 'Reviewer Teknis',
    }
    // Insert before Amama Ira or at appropriate slot
    setApprovers([...approvers, newStep])
  }

  const handleApproverEmployeeChange = (stepIdx: number, empIdStr: string) => {
    const empId = parseInt(empIdStr, 10)
    if (!empId) return

    const emp = allEmployees.find((e) => e.id === empId)
    if (!emp) return

    setApprovers((prev) =>
      prev.map((step, i) => {
        if (i === stepIdx) {
          return {
            ...step,
            approverEmployeeId: emp.id,
            approverName: emp.name,
            jobTitle: emp.jobTitle || 'Approver',
          }
        }
        return step
      })
    )
  }

  // Form submission
  const handleSubmit = async () => {
    if (!assetName.trim()) {
      toast.error('Nama aset wajib diisi.')
      return
    }

    if (!siteId) {
      toast.error('Cabang / Site wajib dipilih.')
      return
    }

    if (!departmentName.trim()) {
      toast.error('Departemen wajib diisi.')
      return
    }

    if (!notes.trim() || notes.trim().length < 5) {
      toast.error('Alasan / justifikasi penghapusan aset minimal 5 karakter.')
      return
    }

    // Validate Amama Ira is in the chain
    const amamaIdx = approvers.findIndex(
      (s) =>
        s.approverEmployeeId === 1341 ||
        s.approverName.toLowerCase().includes('amama ira')
    )
    if (amamaIdx === -1) {
      toast.error('Verifikasi Finance & Accounting (Amama Ira) wajib ada di dalam alur persetujuan.')
      return
    }

    const gmIdx = approvers.findIndex(
      (s) =>
        s.approverEmployeeId === 940 ||
        (s.jobTitle && s.jobTitle.toLowerCase().includes('general manager'))
    )
    if (gmIdx !== -1 && amamaIdx > gmIdx) {
      toast.error('Verifikasi Amama Ira wajib diposisikan sebelum General Manager.')
      return
    }

    setIsSubmitting(true)
    try {
      const formattedDate = disposalDate ? disposalDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

      const res = await createAssetDisposal({
        assetId: selectionMode === 'master' && selectedAssetId ? parseInt(selectedAssetId, 10) : null,
        assetName: assetName.trim(),
        assetNumber: assetNumber.trim() || null,
        purchaseYear: purchaseYear.trim() || null,
        departmentId: departmentId ? parseInt(departmentId, 10) : null,
        departmentName: departmentName.trim(),
        sectionId: sectionId ? parseInt(sectionId, 10) : null,
        sectionName: sectionName.trim() || null,
        siteId: parseInt(siteId, 10),
        siteName: siteName.trim(),
        disposalDate: formattedDate,
        notes: notes.trim(),
        attachments,
        applicantEmployeeId: currentEmployee?.id || null,
        customApprovers: approvers,
      })

      if (res.success) {
        toast.success(res.message || 'Permohonan Asset Disposal berhasil diajukan!')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || 'Gagal mengajukan Asset Disposal.')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + (err?.message || ''))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Options for Master Asset Searchable Select
  const assetOptions = React.useMemo(() => {
    return assets.map((a) => ({
      value: String(a.id),
      label: `${a.description} ${a.assetNumber ? `(${a.assetNumber})` : ''}`,
      category: a.location || 'Central Service',
    }))
  }, [assets])

  // Options for Department Select
  const deptOptions = React.useMemo(() => {
    return departments.map((d) => ({
      value: String(d.id),
      label: d.name,
      category: d.code || 'Dept',
    }))
  }, [departments])

  // Options for Section Select
  const secOptions = React.useMemo(() => {
    return filteredSections.map((s) => ({
      value: String(s.id),
      label: s.name,
    }))
  }, [filteredSections])

  // Options for Site Select
  const siteOptions = React.useMemo(() => {
    return sites.map((s) => ({
      value: String(s.id),
      label: s.name,
      category: s.location || 'Site',
    }))
  }, [sites])

  // Options for Approver Employee Select
  const employeeOptions = React.useMemo(() => {
    return allEmployees.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.employeeSn})`,
      category: e.jobTitle || 'Staff',
    }))
  }, [allEmployees])

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Formulir Pengajuan Asset Disposal"
      description="Ajukan permohonan penghapusan/disposal aset dengan verifikasi Finance & Accounting dan otorisasi manajemen."
      maxWidth="4xl"
      submitLabel="Ajukan Permohonan Disposal"
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="space-y-6 py-2">
        {/* 1. SECTION: Informasi Pemohon */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-border/80">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
            <User className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              1. Dibuat Oleh (Informasi Pemohon)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Nama Lengkap</span>
              <span className="font-semibold text-foreground text-xs">
                {currentEmployee?.name || 'User Aktif'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">NIK / SN</span>
              <span className="font-semibold text-foreground text-xs">
                {currentEmployee?.employeeSn || '-'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Jabatan / Role</span>
              <span className="font-semibold text-foreground text-xs">
                {currentEmployee?.jobTitle || 'Staff Operasional'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. SECTION: Unit Kerja & Lokasi */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-1 border-b border-border/60">
            <Building2 className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              2. Unit Kerja & Lokasi Aset
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroFormField label="Departemen" required>
              <HeroSearchableSelect
                options={deptOptions}
                value={departmentId}
                onChange={handleDepartmentChange}
                placeholder="Pilih Departemen"
                searchPlaceholder="Cari departemen..."
              />
            </HeroFormField>

            <HeroFormField label="Section">
              <HeroSearchableSelect
                options={secOptions}
                value={sectionId}
                onChange={handleSectionChange}
                placeholder="Pilih Section"
                searchPlaceholder="Cari section..."
                disabled={!departmentId && filteredSections.length === 0}
              />
            </HeroFormField>

            <HeroFormField label="Cabang / Site" required>
              <HeroSearchableSelect
                options={siteOptions}
                value={siteId}
                onChange={handleSiteChange}
                placeholder="Pilih Cabang / Site"
                searchPlaceholder="Cari site..."
              />
            </HeroFormField>

            <HeroFormField label="Tanggal Pengajuan" required>
              <HeroDatePicker
                value={disposalDate}
                onChange={setDisposalDate}
                placeholder="Pilih tanggal"
              />
            </HeroFormField>
          </div>
        </div>

        {/* 3. SECTION: Spesifikasi Aset (Hybrid Selection) */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-1 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                3. Spesifikasi Aset yang Dihapus
              </span>
            </div>
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setSelectionMode('master')}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectionMode === 'master'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dari Master Aset
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('manual')
                  setSelectedAssetId('')
                }}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectionMode === 'manual'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Input Manual
              </button>
            </div>
          </div>

          {selectionMode === 'master' && (
            <div className="mb-4 bg-blue-50/60 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900/40">
              <HeroFormField label="Pilih Aset dari Master Central Service" required>
                <HeroSearchableSelect
                  options={assetOptions}
                  value={selectedAssetId}
                  onChange={handleSelectAsset}
                  placeholder="Ketik nama atau nomor aset..."
                  searchPlaceholder="Pencarian aset master..."
                />
              </HeroFormField>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <HeroFormField label="Nama Aset" required>
              <HeroInput
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Contoh: Forklift Komatsu FD30"
              />
            </HeroFormField>

            <HeroFormField label="Nomor Aset / Asset Tag">
              <HeroInput
                value={assetNumber}
                onChange={(e) => setAssetNumber(e.target.value)}
                placeholder="Contoh: AST-FL-002"
              />
            </HeroFormField>

            <HeroFormField label="Tahun Pembelian">
              <HeroInput
                value={purchaseYear}
                onChange={(e) => setPurchaseYear(e.target.value)}
                placeholder="Contoh: 2018"
              />
            </HeroFormField>
          </div>
        </div>

        {/* 4. SECTION: Alasan & Catatan Disposal */}
        <div>
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border/60">
            <Trash2 className="size-4 text-destructive" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              4. Catatan & Alasan Penghapusan Aset
            </span>
          </div>
          <HeroFormField label="Alasan / Justifikasi Teknis Kerusakan" required>
            <HeroTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deskripsikan kondisi fisik aset, estimasi biaya perbaikan yang melebihi nilai ekonomis, atau alasan penghapusan lainnya..."
              rows={3}
              showCount
              maxLength={500}
            />
          </HeroFormField>
        </div>

        {/* 5. SECTION: Lampiran Berkas (Berita Acara, Inspection, Foto) */}
        <div>
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Paperclip className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                5. Berkas Lampiran Pendukung (Berita Acara / Inspeksi)
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">Maksimal 10MB per berkas (PDF, JPG, PNG)</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 gap-1.5 text-xs border-dashed border-primary/50 text-primary hover:bg-primary/5"
            >
              <UploadCloud className="size-4" />
              {isUploading ? 'Mengunggah Berkas...' : 'Unggah Berkas / Dokumen'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {attachments.length} berkas terlampir
            </span>
          </div>

          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileText className="size-4 text-primary shrink-0" />
                    <span className="truncate font-medium text-foreground">{att.fileName}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRemoveAttachment(idx)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. SECTION: Dynamic Approval Routing Builder */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-border/80">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                6. Alur Otorisasi & Rantai Approval (Hirarki Lengkap s/d Director)
              </span>
            </div>
            {allEmployees.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddApprover}
                className="h-7 text-[11px] gap-1 text-primary border-primary/40 hover:bg-primary/5"
              >
                <Plus className="size-3" />
                Tambah Approver
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {approvers.map((step, idx) => {
              const isAmamaIra =
                step.approverEmployeeId === 1341 ||
                step.approverName.toLowerCase().includes('amama ira')
              const isGM =
                step.approverEmployeeId === 940 ||
                (step.jobTitle && step.jobTitle.toLowerCase().includes('general manager'))
              const isDirector =
                step.approverEmployeeId === 10 ||
                (step.jobTitle && step.jobTitle.toLowerCase().includes('director'))

              return (
                <div
                  key={idx}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border text-xs gap-2 transition-all ${
                    isAmamaIra
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30'
                      : isDirector || isGM
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold px-1.5 py-0.5 ${
                        isAmamaIra
                          ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-100/50'
                          : 'border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Step {step.level}
                    </Badge>
                    <div>
                      <span className="font-semibold text-foreground block">
                        {step.approverName}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {step.jobTitle || 'Approver'} &bull; {step.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {/* Reorder Buttons */}
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        disabled={idx === 0}
                        onClick={() => handleMoveApprover(idx, 'up')}
                      >
                        <ChevronUp className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        disabled={idx === approvers.length - 1}
                        onClick={() => handleMoveApprover(idx, 'down')}
                      >
                        <ChevronDown className="size-3" />
                      </Button>
                    </div>

                    {/* Change employee dropdown if custom */}
                    {allEmployees.length > 0 && !isAmamaIra && !isDirector && (
                      <div className="w-48">
                        <HeroSearchableSelect
                          options={employeeOptions}
                          value={String(step.approverEmployeeId)}
                          onChange={(val) => handleApproverEmployeeChange(idx, val)}
                          placeholder="Ganti approver..."
                          searchPlaceholder="Cari approver..."
                        />
                      </div>
                    )}

                    {/* Delete button (except Amama Ira) */}
                    {!isAmamaIra && !isDirector && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveApprover(idx)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <span>
              <strong>Guardrail Terpasang:</strong> Tahapan verifikasi oleh Finance & Accounting (Amama Ira) telah terkunci dan diposisikan sebelum persetujuan General Manager & Director.
            </span>
          </div>
        </div>
      </div>
    </HeroFormDialog>
  )
}
