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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  X,
  Sparkles,
  Info,
  PenLine,
  Upload,
  UserCheck,
  PackageCheck,
  CircleDollarSign,
} from 'lucide-react'
import { uploadFile } from '@/app/actions/upload'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import { SignaturePad } from '@/components/signature-pad'
import {
  createAssetDisposal,
  resubmitAssetDisposalAction,
  getDisposalDefaultApprovers,
} from '../actions'
import { type DisposalApproverStep, type DisposalAttachment } from '../schema'

export interface DisposalFormItem {
  id: string
  assetId: number | null
  assetName: string
  assetNumber: string
  purchaseYear: string
  bookValue?: number | null
  notes: string
  serialNumber?: string | null
  location?: string | null
  section?: string | null
  status?: string | null
}

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
    bookValue?: number | null
    status: string
  }>
  currentEmployee: any | null
  defaultApprovers: DisposalApproverStep[]
  allEmployees?: Array<{ id: number; employeeSn: string; name: string; jobTitle: string | null }>
  initialData?: any | null // For revision / edit mode
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
  initialData,
}: AssetDisposalFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // 1. Applicant & Org Master Data (Group 1 - Auto-fill & Read-only)
  const [departmentId, setDepartmentId] = React.useState<string>('')
  const [departmentName, setDepartmentName] = React.useState<string>('')
  const [sectionId, setSectionId] = React.useState<string>('')
  const [sectionName, setSectionName] = React.useState<string>('')
  const [siteId, setSiteId] = React.useState<string>('')
  const [siteName, setSiteName] = React.useState<string>('')
  const [disposalDate, setDisposalDate] = React.useState<Date | undefined>(new Date())
  const [disposalType, setDisposalType] = React.useState<'Penjualan' | 'Penghapusan' | 'Donasi'>('Penghapusan')

  // 2. Unit Items Repeater (Group 2 - 100% Wajib Master Data HERO)
  const [items, setItems] = React.useState<DisposalFormItem[]>([
    {
      id: 'item-1',
      assetId: null,
      assetName: '',
      assetNumber: '',
      purchaseYear: '',
      notes: '',
    },
  ])

  // 3. Attachments
  const [attachments, setAttachments] = React.useState<DisposalAttachment[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // 4. Approval Routing Steps (Group 4 - CER-style Flexible Approval Builder)
  const [approvers, setApprovers] = React.useState<DisposalApproverStep[]>([])

  // 5. Applicant Digital Signature (Group 5 - SignaturePad / Upload / Profile)
  const [sigMode, setSigMode] = React.useState<'profile' | 'draw' | 'upload'>('profile')
  const [profileSig, setProfileSig] = React.useState<string | null>(null)
  const [uploadedSigUrl, setUploadedSigUrl] = React.useState<string | null>(null)
  const [submitterSig, setSubmitterSig] = React.useState<string | null>(null)
  const [isUploadingSig, setIsUploadingSig] = React.useState(false)
  const signatureFileInputRef = React.useRef<HTMLInputElement>(null)

  // Options for Master Assets Searchable Select
  const assetOptions = React.useMemo(() => {
    return assets.map((a) => {
      const bvText = a.bookValue
        ? ` · Book Value: Rp ${new Intl.NumberFormat('id-ID').format(a.bookValue)}`
        : ''
      return {
        value: String(a.id),
        label: `${a.description} ${a.assetNumber ? `[${a.assetNumber}]` : ''} - ${a.location}${bvText}`,
      }
    })
  }, [assets])

  // Options for Employee Searchable Select in Approver Routing
  const employeeOptions = React.useMemo(() => {
    return allEmployees.map((e) => ({
      value: String(e.id),
      label: `${e.name} ${e.employeeSn ? `(${e.employeeSn})` : ''} - ${e.jobTitle || 'Staff'}`,
    }))
  }, [allEmployees])

  // Load User Signature from Profile
  React.useEffect(() => {
    async function loadSignature() {
      try {
        const res = await getUserSignatureAction()
        if (res.success && res.signatureUrl) {
          setProfileSig(res.signatureUrl)
          setSubmitterSig(res.signatureUrl)
          setSigMode('profile')
        } else {
          setSigMode('draw')
        }
      } catch (e) {
        setSigMode('draw')
      }
    }

    if (open) {
      loadSignature()
    }
  }, [open])

  // Sync initial data or defaults on modal open
  React.useEffect(() => {
    if (open) {
      if (initialData) {
        // Revision / Resubmit Mode
        if (initialData.departmentId) setDepartmentId(String(initialData.departmentId))
        setDepartmentName(initialData.departmentName || '')
        if (initialData.sectionId) setSectionId(String(initialData.sectionId))
        setSectionName(initialData.sectionName || '')
        if (initialData.siteId) setSiteId(String(initialData.siteId))
        setSiteName(initialData.siteName || '')
        if (initialData.disposalDate) setDisposalDate(new Date(initialData.disposalDate))
        if (initialData.disposalType) setDisposalType(initialData.disposalType)

        // Prepopulate items
        if (initialData.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
          setItems(
            initialData.items.map((it: any, idx: number) => ({
              id: `item-${idx + 1}-${Date.now()}`,
              assetId: it.assetId || null,
              assetName: it.assetName || '',
              assetNumber: it.assetNumber || '',
              purchaseYear: it.purchaseYear || '',
              bookValue: Number(it.bookValue) || 0,
              notes: it.notes || '',
            }))
          )
        } else {
          setItems([
            {
              id: 'item-1',
              assetId: initialData.assetId || null,
              assetName: initialData.assetName || '',
              assetNumber: initialData.assetNumber || '',
              purchaseYear: initialData.purchaseYear || '',
              bookValue: Number(initialData.totalBookValue) || 0,
              notes: initialData.notes || '',
            },
          ])
        }

        setAttachments(initialData.attachments || [])
        setApprovers(defaultApprovers.length > 0 ? defaultApprovers : [])

        if (initialData.applicantSignatureUrl || initialData.submitterSignatureUrl) {
          const sig = initialData.applicantSignatureUrl || initialData.submitterSignatureUrl
          setSubmitterSig(sig)
          setUploadedSigUrl(sig)
        }
      } else {
        // Create New Mode: Auto-fill from current employee profile
        if (currentEmployee) {
          if (currentEmployee.departmentId) {
            setDepartmentId(String(currentEmployee.departmentId))
            const dept = departments.find((d) => d.id === currentEmployee.departmentId)
            if (dept) setDepartmentName(dept.name)
            else if (currentEmployee.department) setDepartmentName(currentEmployee.department)
          } else if (currentEmployee.department) {
            setDepartmentName(currentEmployee.department)
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
          } else if (sites.length > 0) {
            setSiteId(String(sites[0].id))
            setSiteName(sites[0].name)
          }
        } else if (sites.length > 0) {
          setSiteId(String(sites[0].id))
          setSiteName(sites[0].name)
        }

        setItems([
          {
            id: 'item-1',
            assetId: null,
            assetName: '',
            assetNumber: '',
            purchaseYear: '',
            bookValue: 0,
            notes: '',
          },
        ])
        setDisposalDate(new Date())
        setDisposalType('Penghapusan')
        setAttachments([])
        setApprovers(defaultApprovers.length > 0 ? defaultApprovers : [])
      }
    }
  }, [open, initialData, currentEmployee, defaultApprovers, departments, sections, sites])

  // --- ITEM REPEATER HANDLERS ---
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        assetId: null,
        assetName: '',
        assetNumber: '',
        purchaseYear: '',
        bookValue: 0,
        notes: '',
      },
    ])
  }

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Minimal harus mengisi 1 rincian aset.')
      return
    }
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const handleItemFieldChange = (id: string, field: keyof DisposalFormItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    )
  }

  const handleSelectMasterAsset = (id: string, assetIdStr: string) => {
    if (!assetIdStr) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                assetId: null,
                assetName: '',
                assetNumber: '',
                purchaseYear: '',
                bookValue: 0,
                serialNumber: null,
                location: null,
                section: null,
                status: null,
              }
            : it
        )
      )
      return
    }

    const found = assets.find((a) => String(a.id) === assetIdStr)
    if (found) {
      let py = ''
      if (found.purchaseDate) {
        const d = new Date(found.purchaseDate)
        if (!isNaN(d.getTime())) py = String(d.getFullYear())
      }

      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                assetId: found.id,
                assetName: found.description,
                assetNumber: found.assetNumber || '',
                purchaseYear: py,
                bookValue: (found as any).bookValue ?? 0,
                serialNumber: found.serialNumber || null,
                location: found.location || null,
                section: found.section || null,
                status: found.status || null,
              }
            : it
        )
      )
    }
  }

  // --- ATTACHMENTS HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('prefix', 'asset-disposal')

        const res = await uploadFile(formData)
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
          toast.success(`Berhasil mengunggah: ${file.name}`)
        } else {
          toast.error(res.message || `Gagal mengunggah: ${file.name}`)
        }
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat mengunggah berkas: ' + (err?.message || ''))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  // --- SIGNATURE UPLOAD HANDLER ---
  const handleSignatureImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingSig(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('prefix', 'signatures')

      const res = await uploadFile(formData)
      if (res.success && res.url) {
        setUploadedSigUrl(res.url)
        setSubmitterSig(res.url)
        toast.success('Gambar tanda tangan berhasil diunggah.')
      } else {
        toast.error(res.message || 'Gagal mengunggah tanda tangan.')
      }
    } catch (err: any) {
      toast.error('Gagal mengunggah tanda tangan: ' + (err?.message || ''))
    } finally {
      setIsUploadingSig(false)
      if (signatureFileInputRef.current) signatureFileInputRef.current.value = ''
    }
  }

  // --- APPROVAL ROUTING BUILDER HANDLERS (CER-STYLE) ---
  const handleMoveApprover = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= approvers.length) return

    const newChain = [...approvers]
    const temp = newChain[idx]
    newChain[idx] = newChain[targetIdx]
    newChain[targetIdx] = temp

    // Recalculate level step order
    const updated = newChain.map((s, i) => ({
      ...s,
      level: i + 1,
    }))
    setApprovers(updated)
  }

  const handleApproverEmployeeChange = (idx: number, empIdStr: string) => {
    const emp = allEmployees.find((e) => String(e.id) === empIdStr)
    if (!emp) return

    setApprovers((prev) =>
      prev.map((s, i) =>
        i === idx
          ? {
              ...s,
              approverEmployeeId: emp.id,
              approverName: emp.name,
              jobTitle: emp.jobTitle || 'Staff',
            }
          : s
      )
    )
  }

  const handleAddApprover = () => {
    if (allEmployees.length === 0) {
      toast.error('Data personil karyawan tidak tersedia.')
      return
    }
    const defaultEmp = allEmployees[0]
    const newStep: DisposalApproverStep = {
      level: approvers.length + 1,
      title: `Step ${approvers.length + 1}: Tambahan Otorisasi`,
      approverEmployeeId: defaultEmp.id,
      approverName: defaultEmp.name,
      jobTitle: defaultEmp.jobTitle || 'Staff',
    }
    setApprovers((prev) => [...prev, newStep])
    toast.success('Tahapan approval baru ditambahkan. Silakan pilih personil yang sesuai.')
  }

  const handleRemoveApprover = (idx: number) => {
    const step = approvers[idx]
    // Guard: Prevent removing Amama Ira
    if (
      step.approverEmployeeId === 1341 ||
      step.approverName.toLowerCase().includes('amama ira')
    ) {
      toast.error('Verifikasi Finance & Accounting (Amama Ira) tidak boleh dihapus dari alur persetujuan.')
      return
    }

    if (approvers.length <= 1) {
      toast.error('Minimal harus ada 1 approver.')
      return
    }

    const newChain = approvers.filter((_, i) => i !== idx).map((s, i) => ({ ...s, level: i + 1 }))
    setApprovers(newChain)
  }

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Validate Items (Wajib Master Data HERO)
    if (items.length === 0) {
      toast.error('Minimal harus mengisi 1 rincian aset.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.assetId) {
        toast.error(`Unit #${i + 1} wajib memilih aset dari Master Data HERO.`)
        return
      }
      if (!it.notes.trim()) {
        toast.error(`Catatan / alasan penghapusan aset pada Unit #${i + 1} wajib diisi.`)
        return
      }
    }

    // 1b. Validate Proposal Attachment for Donasi
    if (disposalType === 'Donasi') {
      if (!attachments || attachments.length === 0) {
        toast.error('Pengajuan Kategori Donasi wajib melampirkan berkas Proposal Donasi.')
        return
      }
    }

    // 2. Validate Approvers & Guardrail Amama Ira
    const amamaIndex = approvers.findIndex(
      (s) =>
        s.approverEmployeeId === 1341 ||
        s.approverName.toLowerCase().includes('amama ira')
    )
    if (amamaIndex === -1) {
      toast.error('Verifikasi Finance & Accounting (Amama Ira) wajib ada di dalam alur persetujuan.')
      return
    }

    const gmIndex = approvers.findIndex(
      (s) =>
        s.approverEmployeeId === 940 ||
        (s.jobTitle && s.jobTitle.toLowerCase().includes('general manager'))
    )
    if (gmIndex !== -1 && amamaIndex > gmIndex) {
      toast.error('Verifikasi Finance & Accounting (Amama Ira) wajib diposisikan SEBELUM General Manager.')
      return
    }

    // 3. Validate Submitter Signature
    if (!submitterSig) {
      toast.error('Tanda tangan pemohon wajib dibubuhkan sebelum mengirimkan pengajuan.')
      return
    }

    setIsSubmitting(true)
    try {
      const formattedItems = items.map((it) => ({
        assetId: it.assetId,
        assetName: it.assetName.trim(),
        assetNumber: it.assetNumber.trim() || null,
        purchaseYear: it.purchaseYear.trim() || null,
        bookValue: Number(it.bookValue) || 0,
        notes: it.notes.trim(),
      }))
      const totalBookValue = items.reduce((acc, it) => acc + (Number(it.bookValue) || 0), 0)

      if (initialData?.id) {
        // Resubmit / Revision Mode
        const res = await resubmitAssetDisposalAction({
          id: initialData.id,
          disposalType,
          items: formattedItems,
          notes: formattedItems.map((it) => `${it.assetName}: ${it.notes}`).join('; '),
          attachments,
        })
        if (res.success) {
          toast.success(res.message || 'Revisi permohonan berhasil dikirim ulang.')
          onOpenChange(false)
          onSuccess()
        } else {
          toast.error(res.message || 'Gagal mengirim ulang permohonan.')
        }
      } else {
        // Create New Mode
        const payload = {
          items: formattedItems,
          totalBookValue,
          disposalType,
          departmentId: departmentId ? Number(departmentId) : null,
          departmentName: departmentName || 'Departemen',
          sectionId: sectionId ? Number(sectionId) : null,
          sectionName: sectionName || null,
          siteId: siteId ? Number(siteId) : Number(sites[0]?.id || 1),
          siteName: siteName || sites[0]?.name || 'Balikpapan (Head Office)',
          disposalDate: disposalDate ? disposalDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          notes: formattedItems.map((it) => `${it.assetName}: ${it.notes}`).join('; '),
          attachments,
          applicantEmployeeId: currentEmployee?.id || null,
          applicantSignatureUrl: submitterSig,
          customApprovers: approvers,
        }

        const res = await createAssetDisposal(payload)
        if (res.success) {
          toast.success(res.message || 'Pengajuan Asset Disposal berhasil dibuat!')
          onOpenChange(false)
          onSuccess()
        } else {
          toast.error(res.message || 'Gagal membuat pengajuan Asset Disposal.')
        }
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + (err?.message || ''))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-2xs">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {initialData?.id ? 'Revisi Pengajuan Asset Disposal' : 'Formulir Pengajuan Asset Disposal'}
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Penghapusan aset resmi dengan rincian unit multi-aset master HERO dan verifikasi berjenjang
            </p>
          </div>
        </div>
      }
      maxWidth="6xl"
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      submitLabel={initialData?.id ? 'Kirim Ulang Revisi' : 'Kirim Pengajuan Disposal'}
    >
      <div className="space-y-6 text-xs max-h-[76vh] overflow-y-auto pr-1">
        {/* GRUP 1: INFORMASI PEMOHON & UNIT KERJA (AUTO-FILL & READ-ONLY) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  1. Informasi Pemohon &amp; Unit Kerja
                </h4>
                <p className="text-[11px] text-slate-500">
                  Data diambil otomatis dari profil master data HERO aktif dan terkunci secara aman
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 self-start sm:self-auto font-semibold">
              ✓ Auto-filled dari Master Data HERO
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <HeroFormField label="Nama Pemohon">
              <HeroInput
                value={currentEmployee?.name || 'Staff Pemohon'}
                disabled
                className="bg-slate-100/90 font-semibold text-slate-800"
              />
            </HeroFormField>

            <HeroFormField label="NIK / Employee SN">
              <HeroInput
                value={currentEmployee?.employeeSn || '-'}
                disabled
                className="bg-slate-100/90 font-mono text-slate-800 font-semibold"
              />
            </HeroFormField>

            <HeroFormField label="Jabatan / Job Title">
              <HeroInput
                value={currentEmployee?.jobTitle || '-'}
                disabled
                className="bg-slate-100/90 text-slate-800"
              />
            </HeroFormField>

            <HeroFormField label="Departemen">
              <HeroInput
                value={departmentName || currentEmployee?.department || '-'}
                disabled
                className="bg-slate-100/90 text-slate-800"
              />
            </HeroFormField>

            <HeroFormField label="Section / Seksi">
              <HeroInput
                value={sectionName || '-'}
                disabled
                className="bg-slate-100/90 text-slate-800"
              />
            </HeroFormField>

            <HeroFormField label="Cabang / Site Lokasi">
              <HeroInput
                value={siteName || '-'}
                disabled
                className="bg-slate-100/90 text-slate-800 font-medium"
              />
            </HeroFormField>
          </div>

          {/* Parameter Pengajuan: Jenis Disposal & Tanggal Pengajuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/80">
            <HeroFormField
              label="Jenis Disposal *"
              required
              helperText="Pilih peruntukan atau kategori disposal aset"
            >
              <HeroSearchableSelect
                options={[
                  { value: 'Penjualan', label: 'Penjualan' },
                  { value: 'Penghapusan', label: 'Penghapusan' },
                  { value: 'Donasi', label: 'Donasi' },
                ]}
                value={disposalType}
                onChange={async (val) => {
                  const newType = (val as any) || 'Penghapusan'
                  setDisposalType(newType)
                  if (!initialData?.id) {
                    try {
                      const res = await getDisposalDefaultApprovers(currentEmployee?.id, newType)
                      if (res.success && res.approvers && res.approvers.length > 0) {
                        setApprovers(res.approvers)
                      }
                    } catch (e) {
                      console.error('[AssetDisposalFormDialog] failed to load default approvers for', newType, e)
                    }
                  }
                }}
                placeholder="Pilih jenis disposal..."
              />
            </HeroFormField>

            <HeroFormField
              label="Tanggal Pengajuan Disposal *"
              required
              helperText="Tanggal pembuatan dokumen formulir berita acara"
            >
              <HeroDatePicker
                value={disposalDate}
                onChange={(date) => setDisposalDate(date || new Date())}
                placeholder="Pilih tanggal pengajuan..."
                className="w-full"
              />
            </HeroFormField>
          </div>

          {/* Banner Informasi Khusus Kategori Penjualan */}
          {disposalType === 'Penjualan' && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 flex items-start gap-2 shadow-2xs">
              <Sparkles className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-950">Alur Khusus Kategori Penjualan &amp; Lelang</p>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  Rantai persetujuan otomatis menyertakan <strong>Tim Procurement (Abd.Rajab / Sofyan Darmawan)</strong> untuk input estimasi harga penjualan sebelum verifikasi Finance. Setelah disetujui penuh Direktur, proses akan dilanjutkan ke tahap upload berkas lelang (Procurement) dan dokumen perpajakan/SAP (Finance).
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
            <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span>
              Jika terdapat mutasi atau pembaruan master data pegawai, riwayat profil ini akan tersinkron otomatis kedepannya.
            </span>
          </div>
        </div>

        {/* GRUP 2: RINCIAN ASET YANG DIHAPUS (100% WAJIB MASTER DATA HERO) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  2. Rincian Aset yang Dihapus (Disposal Unit)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Seluruh unit aset wajib dipilih dari Master Data Central Service HERO (Tanpa Input Manual)
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="h-8 gap-1.5 text-xs font-semibold text-blue-700 border-blue-300 hover:bg-blue-50 self-start sm:self-auto shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Unit Aset
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((it, idx) => (
              <div
                key={it.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5 relative transition-all hover:border-slate-300"
              >
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Rincian Aset #{idx + 1}
                    </span>
                    {it.assetId ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Master HERO Terhubung
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px] font-medium">
                        Pilih Master Aset
                      </Badge>
                    )}
                  </div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(it.id)}
                      className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Unit
                    </Button>
                  )}
                </div>

                {/* Pilih Aset dari Master HERO */}
                <HeroFormField
                  label="Pilih Aset dari Master Data HERO *"
                  helperText="Ketik nama aset, nomor aset, atau lokasi untuk mencari unit master"
                >
                  <HeroSearchableSelect
                    options={assetOptions}
                    value={it.assetId ? String(it.assetId) : ''}
                    onChange={(val) => handleSelectMasterAsset(it.id, val)}
                    placeholder="Pilih aset dari Master Data HERO..."
                    searchPlaceholder="Ketik pencarian nama atau nomor aset..."
                  />
                </HeroFormField>

                {/* Kolom Terpadu: Nama Aset, No. Aset, Tahun Pembelian, Nilai Terakhir Aset (SAP Book Value), dan Alasan */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <HeroFormField label="Nama Aset (Auto-filled)" required>
                      <HeroInput
                        value={it.assetName}
                        disabled
                        placeholder="Pilih aset master di atas..."
                        className="bg-white font-medium text-slate-900"
                      />
                    </HeroFormField>
                  </div>

                  <div className="sm:col-span-3">
                    <HeroFormField label="Nomor Aset">
                      <HeroInput
                        value={it.assetNumber || '-'}
                        disabled
                        placeholder="-"
                        className="bg-white font-mono font-semibold text-slate-800"
                      />
                    </HeroFormField>
                  </div>

                  <div className="sm:col-span-2">
                    <HeroFormField label="Tahun Pembelian">
                      <HeroInput
                        value={it.purchaseYear || '-'}
                        onChange={(e) => handleItemFieldChange(it.id, 'purchaseYear', e.target.value)}
                        placeholder="Contoh: 2021"
                        className="bg-white text-slate-800"
                      />
                    </HeroFormField>
                  </div>

                  <div className="sm:col-span-3">
                    <HeroFormField label="Nilai Terakhir Aset">
                      <HeroInput
                        value={it.bookValue ? `Rp ${new Intl.NumberFormat('id-ID').format(it.bookValue)}` : 'Rp 0'}
                        disabled
                        placeholder="Rp 0"
                        className="bg-slate-100 font-mono font-bold text-emerald-800 border-slate-300"
                      />
                    </HeroFormField>
                  </div>
                </div>

                {/* Metadata Tambahan Aset */}
                {it.assetId && (it.location || it.serialNumber) && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <PackageCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    {it.location && (
                      <span><strong>Lokasi:</strong> {it.location}</span>
                    )}
                    {it.serialNumber && (
                      <span>• <strong>Serial Number:</strong> {it.serialNumber}</span>
                    )}
                    {it.status && (
                      <span>• <strong>Status Master:</strong> {it.status}</span>
                    )}
                    <span className="ml-auto font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                      Book Value SAP: {it.bookValue ? `Rp ${new Intl.NumberFormat('id-ID').format(it.bookValue)}` : 'Rp 0'}
                    </span>
                  </div>
                )}

                {/* Alasan / Catatan Penghapusan Aset */}
                <HeroFormField
                  label="Catatan &amp; Alasan Penghapusan Aset *"
                  helperText="Wajib diisi: jelaskan secara detail kondisi teknis, tingkat kerusakan, atau alasan penghapusan aset ini"
                  required
                >
                  <HeroTextarea
                    rows={2}
                    value={it.notes}
                    onChange={(e) => handleItemFieldChange(it.id, 'notes', e.target.value)}
                    placeholder="Contoh: Rusak total tidak dapat diperbaiki (kondisi fisik retak, biaya perbaikan melebihi nilai ekonomis)"
                    className="bg-white"
                  />
                </HeroFormField>
              </div>
            ))}

            {/* Ringkasan Total Akumulasi Nilai Terakhir Aset */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50/70 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide block">
                    Total Nilai Terakhir Aset ({items.length} Unit)
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Akumulasi nilai buku (Book Value SAP) seluruh aset yang diajukan
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-900 bg-white px-3.5 py-1.5 rounded-lg border border-emerald-300 shadow-2xs inline-block">
                  Rp {new Intl.NumberFormat('id-ID').format(items.reduce((acc, it) => acc + (Number(it.bookValue) || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GRUP 3: DOKUMEN LAMPIRAN PENDUKUNG */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Paperclip className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  3. Dokumen Lampiran Pendukung {disposalType === 'Donasi' && <span className="text-rose-500">* (Wajib Proposal Donasi)</span>}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {disposalType === 'Donasi'
                    ? 'Wajib melampirkan berkas Proposal Donasi resmi sebelum mengirimkan permohonan'
                    : 'Unggah foto kondisi aset, Berita Acara Kerusakan, estimasi biaya perbaikan, atau berkas pendukung lainnya'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 gap-1.5 text-xs font-semibold text-indigo-700 border-indigo-300 hover:bg-indigo-50 self-start sm:self-auto shadow-2xs"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {isUploading ? 'Mengunggah...' : 'Pilih Berkas'}
            </Button>
          </div>

          {disposalType === 'Donasi' && (
            <div className="rounded-lg bg-purple-50/80 border border-purple-200 p-2.5 text-[11px] text-purple-950 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <span>
                <strong>Kategori Donasi:</strong> Wajib melampirkan berkas <strong>Proposal Donasi</strong> resmi pada lampiran di bawah ini sebelum mengirimkan permohonan.
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />

          {attachments.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center min-h-[90px]"
            >
              <UploadCloud className="h-6 w-6 text-slate-400 mb-1" />
              <p className="text-xs font-semibold text-slate-700">
                Klik di sini untuk memilih dan mengunggah dokumen pendukung
              </p>
              <p className="text-[10px] text-slate-500">
                Format: PDF, PNG, JPG (Maks 10 MB per berkas)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/70"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span className="truncate text-xs font-medium text-slate-800" title={att.fileName}>
                      {att.fileName}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="h-6 w-6 text-slate-400 hover:text-rose-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GRUP 4: RANTAI PERSETUJUAN BERJENJANG HINGGA DIREKTUR DENGAN AMAMA IRA (CER STYLE) */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  4. Rantai Persetujuan &amp; Otorisasi Berjenjang (Approval Routing)
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Dikonfigurasi otomatis hingga Direktur sesuai struktur master data HERO. Terdapat tahapan verifikasi wajib oleh Finance &amp; Accounting (Amama Ira) sebelum ke General Manager &amp; Director.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddApprover}
                className="h-8 gap-1 border-blue-600 text-xs font-semibold text-blue-700 hover:bg-blue-50 self-start sm:self-auto shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Approver
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {approvers && approvers.length > 0 ? (
              <div className="space-y-2.5">
                {approvers.map((s, idx) => {
                  const isProcurement =
                    s.title.toLowerCase().includes('procurement') ||
                    s.approverName.toLowerCase().includes('rajab') ||
                    s.approverName.toLowerCase().includes('sofyan')
                  const isAmama =
                    s.approverEmployeeId === 1341 ||
                    s.approverName.toLowerCase().includes('amama ira')
                  const isGM =
                    s.approverEmployeeId === 940 ||
                    (s.jobTitle && s.jobTitle.toLowerCase().includes('general manager'))
                  const isDirector =
                    s.approverEmployeeId === 10 ||
                    (s.jobTitle && s.jobTitle.toLowerCase().includes('director'))

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border text-xs gap-2 transition-all ${
                        isProcurement
                          ? 'border-emerald-300 bg-emerald-50/70 shadow-2xs'
                          : isAmama
                          ? 'border-indigo-300 bg-indigo-50/70 shadow-2xs'
                          : isDirector || isGM
                          ? 'border-blue-200 bg-blue-50/40'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 shrink-0 ${
                            isProcurement
                              ? 'border-emerald-400 bg-emerald-100 text-emerald-900 font-extrabold'
                              : isAmama
                              ? 'border-indigo-400 bg-indigo-100 text-indigo-900 font-extrabold'
                              : isDirector || isGM
                              ? 'border-blue-400 bg-blue-100 text-blue-800'
                              : 'border-slate-300 text-slate-700 bg-white'
                          }`}
                        >
                          Tahap {s.level}
                        </Badge>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 truncate">
                              {s.approverName}
                            </span>
                            {isProcurement && (
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4 font-bold">
                                Estimasi Harga: Tim Procurement
                              </Badge>
                            )}
                            {isAmama && (
                              <Badge className="bg-indigo-600 text-white text-[9px] px-1.5 py-0 h-4 font-bold">
                                Special Verification: Finance &amp; Accounting
                              </Badge>
                            )}
                            {isGM && (
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4 font-bold">
                                Otorisasi GM
                              </Badge>
                            )}
                            {isDirector && (
                              <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 h-4 font-bold">
                                Direksi Final
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-600 truncate block">
                            {s.jobTitle || s.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Reorder Buttons */}
                        <div className="flex items-center border border-slate-200 rounded-md bg-white">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            disabled={idx === 0}
                            onClick={() => handleMoveApprover(idx, 'up')}
                            title="Geser ke Atas"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            disabled={idx === approvers.length - 1}
                            onClick={() => handleMoveApprover(idx, 'down')}
                            title="Geser ke Bawah"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Searchable Select to change employee */}
                        {employeeOptions.length > 0 && !isAmama && (
                          <div className="w-52">
                            <HeroSearchableSelect
                              options={employeeOptions}
                              value={String(s.approverEmployeeId || '')}
                              onChange={(val) => handleApproverEmployeeChange(idx, val)}
                              placeholder="Ganti approver..."
                              searchPlaceholder="Cari personil..."
                            />
                          </div>
                        )}

                        {/* Delete Button (Except Amama Ira) */}
                        {!isAmama ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                            onClick={() => handleRemoveApprover(idx)}
                            title="Hapus Step Ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <span className="text-[10px] text-indigo-700 font-bold px-2 py-0.5 rounded bg-indigo-100/70 border border-indigo-200">
                            Wajib Terpasang
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                Tidak ada rantai approver yang terpasang. Klik tombol &quot;Tambah Approver&quot; di atas.
              </p>
            )}

            <div className="rounded-lg bg-indigo-50/80 border border-indigo-200 p-2.5 text-[11px] text-indigo-950 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Aturan Validasi:</strong> Tahapan verifikasi oleh <strong>Finance &amp; Accounting (Amama Ira)</strong> wajib terpasang dan diposisikan sebelum otorisasi General Manager &amp; Director.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* GRUP 5: TANDA TANGAN DIGITAL PEMOHON (APPLICANT SIGNATURE) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <PenLine className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  5. Tanda Tangan Digital Pemohon (Applicant Signature) *
                </h4>
                <p className="text-[11px] text-slate-500">
                  Bubuhkan tanda tangan pemohon yang sah sebelum mengirimkan permohonan penghapusan aset
                </p>
              </div>
            </div>
            {submitterSig && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold gap-1 self-start sm:self-auto">
                <CheckCircle2 className="h-3 w-3" /> Tanda Tangan Siap
              </Badge>
            )}
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-lg border border-slate-200 max-w-md">
            {profileSig && (
              <button
                type="button"
                onClick={() => {
                  setSigMode('profile')
                  setSubmitterSig(profileSig)
                }}
                className={`flex-1 py-1 px-3 rounded-md transition-all text-xs font-semibold ${
                  sigMode === 'profile'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                TTD Profil HERO
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSigMode('draw')
                if (sigMode === 'profile') setSubmitterSig(null)
              }}
              className={`flex-1 py-1 px-3 rounded-md transition-all text-xs font-semibold ${
                sigMode === 'draw'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Coretan Canvas
            </button>
            <button
              type="button"
              onClick={() => {
                setSigMode('upload')
                if (uploadedSigUrl) setSubmitterSig(uploadedSigUrl)
                else if (sigMode === 'profile') setSubmitterSig(null)
              }}
              className={`flex-1 py-1 px-3 rounded-md transition-all text-xs font-semibold ${
                sigMode === 'upload'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unggah Gambar
            </button>
          </div>

          {/* Hidden File Input for Signature Upload */}
          <input
            ref={signatureFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleSignatureImageUpload}
          />

          {/* Mode 1: Profil HERO */}
          {sigMode === 'profile' && profileSig && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 flex flex-col items-center justify-center min-h-[120px] max-w-md relative">
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Terdaftar di Profil HERO
              </span>
              <img
                src={profileSig}
                alt="Tanda Tangan Pemohon"
                className="max-h-20 object-contain my-1"
              />
              <p className="text-[11px] font-semibold text-slate-700 mt-1">
                {currentEmployee?.name || 'Pemohon'}
              </p>
            </div>
          )}

          {/* Mode 2: SignaturePad Draw */}
          {sigMode === 'draw' && (
            <div className="max-w-md space-y-2">
              <p className="text-[11px] text-slate-500">
                Goreskan tanda tangan Anda pada area putih di bawah ini:
              </p>
              <SignaturePad
                onDataUrlChange={(dataUrl) => setSubmitterSig(dataUrl)}
                onSaveToProfile={(dataUrl) => {
                  setProfileSig(dataUrl)
                  setSigMode('profile')
                  setSubmitterSig(dataUrl)
                }}
                height={120}
              />
            </div>
          )}

          {/* Mode 3: Signature Upload */}
          {sigMode === 'upload' && (
            <div className="max-w-md space-y-2">
              {uploadedSigUrl ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 flex flex-col items-center justify-center min-h-[120px] relative">
                  <img
                    src={uploadedSigUrl}
                    alt="Unggahan Tanda Tangan"
                    className="max-h-20 object-contain my-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureFileInputRef.current?.click()}
                    disabled={isUploadingSig}
                    className="h-7 text-xs mt-2"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {isUploadingSig ? 'Mengunggah...' : 'Ganti Gambar TTD'}
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => signatureFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all text-center min-h-[110px]"
                >
                  <Upload className="h-5 w-5 text-indigo-600 mb-1" />
                  <p className="text-xs font-bold text-slate-800">
                    Klik untuk Unggah Gambar Tanda Tangan
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Format PNG, JPG, JPEG (Maks. 5 MB)
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
