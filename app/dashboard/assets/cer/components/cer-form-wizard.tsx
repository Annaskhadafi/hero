'use client'

import React, { useState, useEffect, useTransition, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Trash2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
  DollarSign,
  ShieldCheck,
  Building,
  Building2,
  Wallet,
  Package,
  Paperclip,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile } from '@/app/actions/upload'
import { HeroSearchableSelect, type HeroSearchableSelectOption } from '@/components/templates'
import {
  createCerRequestAction,
  getCapExBudgetsForSelection,
  previewCerApprovalChain,
} from '../actions'
import type { CerCapexBudget } from '@/db/schema/cer'

export interface CerFormWizardProps {
  sites: Array<{ id: number; name: string }>
  departments: Array<{ id: number; name: string }>
  sections: Array<{ id: number; name: string; departmentId: number | null }>
  currentEmployee: {
    id: number
    name: string
    email: string
    jobTitle: string | null
    departmentId: number | null
    sectionId?: number | null
    siteId: number | null
  } | null
  onSuccess?: () => void
}

export interface UnitItem {
  id: string
  description: string
  qty: number
  pricePerUnit: number
  totalPrice: number
  allocation: string
  holderName: string
  holderEmployeeId?: number | null
  estimatedLifespan: string
}

export interface UploadedAttachment {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize?: number
}

const ATTACHMENT_CHECKBOX_OPTIONS = [
  'Penawaran Vendor',
  'Inspection Report',
  'Justifikasi IT Device',
  'Lainnya',
]

const ASSET_CATEGORIES = [
  'IT Device',
  'Operational Equipment',
  'Vehicle / Alat Berat',
  'Tools & Workshop',
  'Office Facility',
  'Safety & Emergency',
  'Other',
]

const formatRupiah = (val: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(val || 0)

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export function CerFormWizard({
  sites,
  departments,
  sections,
  currentEmployee,
  onSuccess,
}: CerFormWizardProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [isPending, startTransition] = useTransition()

  // Form Fields
  const [dateRequired, setDateRequired] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  )
  const [subject, setSubject] = useState<string>('')
  const [purchaseType, setPurchaseType] = useState<'Pergantian' | 'Tambahan / Baru'>('Tambahan / Baru')
  const [budgetSource, setBudgetSource] = useState<'Anggaran' | 'Bukan Anggaran'>('Anggaran')
  const [departmentId, setDepartmentId] = useState<number>(currentEmployee?.departmentId || (departments[0]?.id ?? 1))
  const [sectionId, setSectionId] = useState<number | undefined>(currentEmployee?.sectionId ?? undefined)
  const [siteId, setSiteId] = useState<number>(currentEmployee?.siteId || (sites[0]?.id ?? 1))
  const [assetCategory, setAssetCategory] = useState<string>('IT Device')
  const [purchasePurpose, setPurchasePurpose] = useState<string>('')
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([])
  const [vendorName, setVendorName] = useState<string>('')

  // Budget Controller & CapEx state
  const [availableBudgets, setAvailableBudgets] = useState<CerCapexBudget[]>([])
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null)
  const [isLoadingBudgets, setIsLoadingBudgets] = useState<boolean>(false)

  // Unit Items Table
  const [items, setItems] = useState<UnitItem[]>([
    {
      id: 'item-1',
      description: '',
      qty: 1,
      pricePerUnit: 0,
      totalPrice: 0,
      allocation: '',
      holderName: '',
      estimatedLifespan: '3 Tahun',
    },
  ])

  // Attachments
  const [uploadedLampiran, setUploadedLampiran] = useState<UploadedAttachment[]>([])
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false)

  // Step 2 Preview Approval Chain
  const [previewSteps, setPreviewSteps] = useState<any[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false)

  // Calculate Total Estimated Price
  const totalEstimatedPrice = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)

  // Filter sections by department
  const filteredSections = sections.filter((s) => s.departmentId === departmentId)

  // Fetch CapEx Budgets when site, dept, or category changes
  useEffect(() => {
    let isMounted = true
    async function fetchBudgets() {
      setIsLoadingBudgets(true)
      try {
        const data = await getCapExBudgetsForSelection({
          siteId,
          departmentId,
          assetCategory,
        })
        if (isMounted) {
          setAvailableBudgets(data)
          if (data.length > 0) {
            setSelectedBudgetId(data[0].id)
          } else {
            setSelectedBudgetId(null)
          }
        }
      } catch (err) {
        console.error('Failed to load budgets:', err)
      } finally {
        if (isMounted) setIsLoadingBudgets(false)
      }
    }

    if (budgetSource === 'Anggaran') {
      fetchBudgets()
    } else {
      setSelectedBudgetId(null)
    }

    return () => {
      isMounted = false
    }
  }, [siteId, departmentId, assetCategory, budgetSource])

  // Selected CapEx Budget details
  const selectedBudget = availableBudgets.find((b) => b.id === selectedBudgetId) || null
  const remainingBudget = selectedBudget ? Number(selectedBudget.remainingAmount) : 0
  const isOverBudget = budgetSource === 'Anggaran' && selectedBudget ? totalEstimatedPrice > remainingBudget : false
  const projectedRemaining = selectedBudget ? remainingBudget - totalEstimatedPrice : 0

  // Memoized budget options for HeroSearchableSelect
  const budgetOptions: HeroSearchableSelectOption[] = useMemo(() => {
    return availableBudgets.map((b) => {
      const remaining = Number(b.remainingAmount) || 0
      const allocated = Number(b.allocatedAmount) || 0
      const used = Number(b.usedAmount) || 0
      return {
        value: String(b.id),
        label: `${b.budgetCode} - ${b.budgetName}`,
        description: `Alokasi: ${formatRupiah(allocated)} | Terpakai: ${formatRupiah(used)} | Sisa: ${formatRupiah(remaining)}`,
        badge: remaining > 0 ? `Sisa: ${formatRupiah(remaining)}` : 'Habis',
        badgeColor: remaining > 0
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-rose-100 text-rose-800',
      }
    })
  }, [availableBudgets])

  // Handle Add Unit Item
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: '',
        qty: 1,
        pricePerUnit: 0,
        totalPrice: 0,
        allocation: '',
        holderName: '',
        estimatedLifespan: '3 Tahun',
      },
    ])
  }

  // Handle Remove Unit Item
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Minimal harus ada 1 item unit barang.')
      return
    }
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  // Handle Item Field Change
  const handleItemChange = (id: string, field: keyof UnitItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          if (field === 'qty' || field === 'pricePerUnit') {
            const qty = field === 'qty' ? (value === '' ? 0 : Math.max(0, Number(value))) : Number(item.qty || 0)
            const price = field === 'pricePerUnit' ? (value === '' ? 0 : Math.max(0, Number(value))) : Number(item.pricePerUnit || 0)
            updated.qty = field === 'qty' ? (value === '' ? 0 : Math.max(0, Number(value))) : item.qty
            updated.pricePerUnit = field === 'pricePerUnit' ? (value === '' ? 0 : Math.max(0, Number(value))) : item.pricePerUnit
            updated.totalPrice = Math.max(0, qty * price)
          }
          return updated
        }
        return item
      })
    )
  }

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingFile(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fd = new FormData()
        fd.append('file', file)
        fd.append('prefix', 'cer-attachments')

        const res = await uploadFile(fd)
        if (res && res.success && res.url) {
          const item: UploadedAttachment = {
            fileName: file.name,
            fileUrl: res.url,
            fileType: 'attachment',
            fileSize: file.size,
          }

          setUploadedLampiran((prev) => [...prev, item])
          toast.success(`Lampiran "${file.name}" berhasil diunggah.`)
        } else {
          toast.error(`Gagal mengunggah file ${file.name}.`)
        }
      }
    } catch (err) {
      console.error('File upload error:', err)
      toast.error('Terjadi kesalahan saat mengunggah berkas.')
    } finally {
      setIsUploadingFile(false)
      e.target.value = ''
    }
  }

  // Move to Step 2
  const handleGoToStep2 = async () => {
    // Validation
    if (!subject.trim()) {
      toast.error('Perihal / CER Subject wajib diisi.')
      return
    }
    if (!vendorName.trim()) {
      toast.error('Nama Pemasok / Vendor wajib diisi.')
      return
    }
    if (!purchasePurpose.trim()) {
      toast.error('Tujuan Pembelian wajib diisi.')
      return
    }
    const hasInvalidItem = items.some((it) => !it.description.trim() || it.qty <= 0 || it.pricePerUnit <= 0)
    if (hasInvalidItem) {
      toast.error('Pastikan seluruh item unit memiliki Deskripsi, Qty, dan Harga yang valid.')
      return
    }

    setIsLoadingPreview(true)
    try {
      if (currentEmployee?.id) {
        const steps = await previewCerApprovalChain({
          employeeId: currentEmployee.id,
          assetCategory,
          siteId,
          departmentId,
          sectionId: sectionId || null,
        })
        setPreviewSteps(steps)
      }
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Preview error:', err)
      toast.error('Gagal memuat rantai approval.')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Submit Final CER Request
  const handleSubmitFinal = () => {
    startTransition(async () => {
      const res = await createCerRequestAction({
        subject,
        dateRequired,
        level: 'Standard',
        purchaseType,
        budgetSource,
        departmentId,
        sectionId: sectionId || null,
        siteId,
        assetCategory,
        purchasePurpose,
        vendorName,
        capexBudgetId: budgetSource === 'Anggaran' ? selectedBudgetId : null,
        attachmentChecklist: selectedAttachments,
        items: items.map((it) => ({
          description: it.description,
          qty: Number(it.qty),
          pricePerUnit: Number(it.pricePerUnit),
          totalPrice: Number(it.totalPrice),
          allocation: it.allocation,
          holderName: it.holderName,
          holderEmployeeId: it.holderEmployeeId || null,
          estimatedLifespan: it.estimatedLifespan,
        })),
        attachments: uploadedLampiran,
      })

      if (res.success) {
        toast.success(res.message)
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.message)
      }
    })
  }

  const selectedSite = sites.find((s) => s.id === siteId)?.name || 'Balikpapan'
  const selectedDept = departments.find((d) => d.id === departmentId)?.name || 'Central Services'
  const selectedSection = sections.find((s) => s.id === sectionId)?.name

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Wizard Header & Progress Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Form CER (Capital Expenditure Request)</h2>
            <p className="text-xs text-slate-500">
              Formulir Pengajuan Pengadaan Aset Modal (Capital Expenditure Request)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={step === 1 ? 'border-blue-600 bg-blue-50 text-blue-700' : 'text-slate-600'}
            >
              Step 1: Input Detail
            </Badge>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <Badge
              variant="outline"
              className={step === 2 ? 'border-blue-600 bg-blue-50 text-blue-700' : 'text-slate-600'}
            >
              Step 2: Review & Approval
            </Badge>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs font-medium text-slate-600">
            <span>{step === 1 ? 'Step 1 of 2 (50%)' : 'Step 2 of 2 (100%)'}</span>
            <span>{step === 1 ? '50%' : '100%'}</span>
          </div>
          <Progress value={step === 1 ? 50 : 100} className="h-2 bg-slate-100" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: INPUT FORM ACCORDING TO USER'S IMAGE                              */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          {/* CARD 1: INFORMASI PERMOHONAN */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    1. Informasi Permohonan
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Perihal pengadaan, batas waktu kebutuhan, dan unit kerja pemohon.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              {/* Row: Subject & Date */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Perihal / Subject CER <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Contoh: Pengadaan Laptop Spesifikasi Developer untuk Central Services"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Tanggal Dibutuhkan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={dateRequired}
                    onChange={(e) => setDateRequired(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Row: Departemen, Section, Kategori Aset */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Departemen <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={departmentId}
                    onChange={(e) => {
                      const dId = Number(e.target.value)
                      setDepartmentId(dId)
                      const matchingSecs = sections.filter((s) => s.departmentId === dId)
                      const defaultSec = matchingSecs.some((s) => s.id === currentEmployee?.sectionId)
                        ? (currentEmployee?.sectionId ?? undefined)
                        : (matchingSecs[0]?.id ?? undefined)
                      setSectionId(defaultSec)
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Section / Bagian
                  </Label>
                  <select
                    value={sectionId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setSectionId(val ? Number(val) : undefined)
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">-- Seluruh Departemen (Umum) --</option>
                    {filteredSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Kategori Aset <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {ASSET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: KLASIFIKASI & SUMBER ANGGARAN */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    2. Klasifikasi & Sumber Anggaran
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Penetapan jenis belanja dan integrasi pagu CapEx (Budget Controller).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <Label className="text-xs font-semibold text-slate-700">
                    Jenis Pembelian <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={purchaseType}
                    onValueChange={(val: any) => setPurchaseType(val)}
                    className="flex gap-6 pt-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Pergantian" id="pt-pergantian" />
                      <Label htmlFor="pt-pergantian" className="cursor-pointer text-sm font-normal text-slate-700">
                        Pergantian
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Tambahan / Baru" id="pt-tambahan" />
                      <Label htmlFor="pt-tambahan" className="cursor-pointer text-sm font-normal text-slate-700">
                        Tambahan / Baru
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <Label className="text-xs font-semibold text-slate-700">
                    Sumber Anggaran <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={budgetSource}
                    onValueChange={(val: any) => setBudgetSource(val)}
                    className="flex gap-6 pt-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Anggaran" id="bs-anggaran" />
                      <Label htmlFor="bs-anggaran" className="cursor-pointer text-sm font-normal text-slate-700">
                        Anggaran
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Bukan Anggaran" id="bs-bukan" />
                      <Label htmlFor="bs-bukan" className="cursor-pointer text-sm font-normal text-slate-700">
                        Bukan Anggaran
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* BUDGET CONTROLLER SELECTION (Database CapEx Finance) */}
              {budgetSource === 'Anggaran' && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-700" />
                      <span className="text-xs font-bold text-blue-950">
                        Budget Controller (Database CapEx Finance)
                      </span>
                    </div>
                    {isLoadingBudgets && (
                      <span className="flex items-center gap-1 text-xs text-blue-600">
                        <Loader2 className="h-3 w-3 animate-spin" /> Memeriksa kuota pagu...
                      </span>
                    )}
                  </div>

                  {availableBudgets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-blue-900">Pilih Pagu Anggaran CapEx Tersedia:</Label>
                        <HeroSearchableSelect
                          placeholder="Pilih Pagu Anggaran CapEx..."
                          options={budgetOptions}
                          value={selectedBudgetId ? String(selectedBudgetId) : ''}
                          onChange={(val: string) => setSelectedBudgetId(val ? Number(val) : null)}
                          width="w-full"
                        />
                      </div>

                      {selectedBudget && (
                        <div className="flex flex-col justify-center rounded-lg border border-blue-200/80 bg-white p-3 text-xs shadow-xs">
                          <div className="flex justify-between text-slate-600">
                            <span>Total Pagu:</span>
                            <span className="font-semibold text-slate-800">
                              {formatRupiah(Number(selectedBudget.allocatedAmount))}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between text-slate-600">
                            <span>Sisa Saldo Pagu:</span>
                            <span
                              className={`font-bold ${
                                isOverBudget ? 'text-amber-600' : 'text-emerald-700'
                              }`}
                            >
                              {formatRupiah(remainingBudget)}
                            </span>
                          </div>
                          {isOverBudget && (
                            <div className="mt-2 rounded bg-amber-50 p-1.5 text-[11px] font-medium text-amber-800">
                              ⚠️ Total pengajuan melebihi sisa anggaran. Approval akan menyertakan CFO/Director.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                      ℹ️ Belum ditemukan pagu CapEx terdaftar untuk {selectedDept} ({assetCategory}) tahun berjalan.
                      Pengajuan tetap dapat dilanjutkan dengan status <em>Unbudgeted</em>.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CARD 3: JUSTIFIKASI & REKANAN VENDOR */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    3. Justifikasi & Rekanan Vendor
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Informasi rekanan terpilih, rincian urgensi operasional, dan kelengkapan dokumen pendukung.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Pemasok (Vendor) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nama Vendor / Supplier yang direkomendasikan..."
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Tujuan Pembelian <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Jelaskan latar belakang, spesifikasi teknis ringkas, dan justifikasi operasional mengapa aset ini mendesak untuk dibeli..."
                  rows={3}
                  value={purchasePurpose}
                  onChange={(e) => setPurchasePurpose(e.target.value)}
                  className="text-sm leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* CARD 4: RINCIAN UNIT / ITEM CAPEX */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      4. Rincian Unit / Item CapEx
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Daftar barang modal yang diajukan beserta rincian biaya per unit.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 gap-1.5 border-blue-600 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Unit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-10 text-center text-xs">No</TableHead>
                      <TableHead className="min-w-[200px] text-xs">Deskripsi</TableHead>
                      <TableHead className="w-28 text-center text-xs">Qty</TableHead>
                      <TableHead className="w-40 text-xs">Harga Satuan (Rp)</TableHead>
                      <TableHead className="w-36 text-xs">Total Harga (Rp)</TableHead>
                      <TableHead className="w-28 text-xs">Alokasi</TableHead>
                      <TableHead className="w-28 text-xs">Holder</TableHead>
                      <TableHead className="w-28 text-xs">Estimasi Umur</TableHead>
                      <TableHead className="w-12 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-6 text-center text-xs text-slate-500">
                          Belum ada rincian unit. Klik &quot;Tambah Unit&quot; untuk menambahkan item barang.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, idx) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-center text-xs text-slate-500">{idx + 1}</TableCell>
                          <TableCell>
                            <Input
                              placeholder="Deskripsi barang modal..."
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="h-8 px-2.5 text-xs bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <div className="flex h-8 w-24 items-center rounded-md border border-slate-300 bg-white shadow-xs transition-colors focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => handleItemChange(item.id, 'qty', Math.max(1, Number(item.qty || 1) - 1))}
                                  className="flex h-full w-7 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                  disabled={Number(item.qty) <= 1}
                                  title="Kurangi"
                                >
                                  <span className="text-sm font-bold leading-none select-none">−</span>
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.qty === 0 ? '' : item.qty}
                                  onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                  className="h-full w-10 min-w-0 border-0 bg-transparent p-0 text-center text-sm font-bold text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  placeholder="1"
                                />
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => handleItemChange(item.id, 'qty', Number(item.qty || 0) + 1)}
                                  className="flex h-full w-7 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 transition-colors"
                                  title="Tambah"
                                >
                                  <span className="text-sm font-bold leading-none select-none">+</span>
                                </button>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min={0}
                                value={item.pricePerUnit}
                                onChange={(e) => handleItemChange(item.id, 'pricePerUnit', e.target.value)}
                                className="h-8 px-2.5 text-xs bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                              />
                              {item.pricePerUnit > 0 && (
                                <div className="text-[11px] font-medium text-blue-600">
                                  {formatRupiah(item.pricePerUnit)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-900">
                            {formatRupiah(item.totalPrice)}
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Site/Dept"
                              value={item.allocation}
                              onChange={(e) => handleItemChange(item.id, 'allocation', e.target.value)}
                              className="h-8 px-2.5 text-xs bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Nama Pemakai"
                              value={item.holderName}
                              onChange={(e) => handleItemChange(item.id, 'holderName', e.target.value)}
                              className="h-8 px-2.5 text-xs bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="3 Tahun"
                              value={item.estimatedLifespan}
                              onChange={(e) => handleItemChange(item.id, 'estimatedLifespan', e.target.value)}
                              className="h-8 px-2.5 text-xs bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-7 w-7 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Hapus unit"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Total Estimasi Banner */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-700">Total Estimasi Nilai Pengadaan CapEx:</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  {formatRupiah(totalEstimatedPrice)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* CARD 5: BERKAS LAMPIRAN PENDUKUNG */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    5. Berkas Lampiran Pendukung
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Unggah berkas penawaran harga vendor, proposal teknis, atau lembar inspeksi (PDF, Gambar, XLSX).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/40 p-6 transition-colors hover:border-blue-500 hover:bg-blue-50/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  {isUploadingFile ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <UploadCloud className="h-6 w-6" />
                  )}
                </div>
                <span className="mt-3 text-xs font-semibold text-slate-700">
                  {isUploadingFile ? (
                    'Sedang mengunggah berkas...'
                  ) : (
                    <>Tarik berkas ke sini atau <span className="text-blue-600 underline">Pilih Dokumen</span></>
                  )}
                </span>
                <span className="mt-1 text-[11px] text-slate-400">
                  Format yang didukung: PDF, PNG, JPG, JPEG, XLSX (Maks. 5 MB per berkas).
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploadingFile}
                />
              </label>

              {/* Uploaded attachments list */}
              {uploadedLampiran.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-slate-700">
                    Berkas Terlampir ({uploadedLampiran.length}):
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {uploadedLampiran.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                          <span className="truncate font-medium text-slate-700">{att.fileName}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            ({formatFileSize(att.fileSize)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                            Tersimpan
                          </Badge>
                          <button
                            type="button"
                            onClick={() => setUploadedLampiran((prev) => prev.filter((_, i) => i !== idx))}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Hapus file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BOTTOM ACTION BAR */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Pastikan rincian unit barang dan pagu anggaran telah terisi lengkap sebelum lanjut ke tahap approval.
            </div>
            <Button
              type="button"
              onClick={handleGoToStep2}
              disabled={isLoadingPreview || isUploadingFile}
              className="gap-2 bg-blue-700 px-6 font-semibold text-white hover:bg-blue-800"
            >
              {isLoadingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Memvalidasi Alur...
                </>
              ) : (
                <>
                  Lanjut ke Step 2 (Review) <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: REVIEW, BUDGET IMPACT & LIVE APPROVAL CHAIN PREVIEW                */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Card 1: Review Pengajuan */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-bold text-slate-900">
                1. Ringkasan Pengajuan CER
              </CardTitle>
              <CardDescription className="text-xs">
                Periksa kembali data pengadaan sebelum submit final ke rantai persetujuan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-xs">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-500">Perihal:</span>
                    <span className="font-semibold text-slate-800">{subject}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-500">Tanggal Dibutuhkan:</span>
                    <span className="font-semibold text-slate-800">{dateRequired}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-500">Pemohon:</span>
                    <span className="font-semibold text-slate-800">{currentEmployee?.name || '-'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-500">Departemen / Bagian:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedDept}{selectedSection ? ` - ${selectedSection}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-500">Kategori Aset:</span>
                    <span className="font-semibold text-slate-800">{assetCategory}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-500">Jenis Pembelian:</span>
                    <span className="font-semibold text-slate-800">
                      {purchaseType} ({budgetSource})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-500">Pemasok Terpilih:</span>
                    <span className="font-semibold text-slate-800">{vendorName}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-700">Tujuan Pembelian:</span>
                <p className="mt-1 rounded-md bg-slate-50 p-2.5 text-slate-800">{purchasePurpose}</p>
              </div>

              {/* Items Summary */}
              <div className="mt-2 rounded-lg border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs">Deskripsi</TableHead>
                      <TableHead className="w-16 text-center text-xs">Qty</TableHead>
                      <TableHead className="w-28 text-right text-xs">Harga Satuan</TableHead>
                      <TableHead className="w-32 text-right text-xs">Total Harga</TableHead>
                      <TableHead className="w-24 text-xs">Holder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-medium text-slate-800">{it.description}</TableCell>
                        <TableCell className="text-center text-xs">{it.qty}</TableCell>
                        <TableCell className="text-right text-xs">
                          {formatRupiah(it.pricePerUnit)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-900">
                          {formatRupiah(it.totalPrice)}
                        </TableCell>
                        <TableCell className="text-xs">{it.holderName || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Analisis Budget Controller */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-bold text-slate-900">
                2. Dampak Anggaran (Budget Controller)
              </CardTitle>
              <CardDescription className="text-xs">
                Kalkulasi komitmen pagu anggaran CapEx tim finance secara real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-xs">
              {/* Budget Code & Name Banner */}
              {selectedBudget && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2">
                  <Wallet className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] text-blue-900">
                    <strong>Pagu Terpilih:</strong>{' '}
                    {selectedBudget.budgetCode} - {selectedBudget.budgetName}{' '}
                    <span className="text-blue-600">(Tahun {selectedBudget.fiscalYear})</span>
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[11px] text-slate-500">Pagu Alokasi CapEx</span>
                  <p className="mt-1 font-bold text-slate-800">
                    {selectedBudget
                      ? formatRupiah(Number(selectedBudget.allocatedAmount))
                      : 'Non-Pagu'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[11px] text-slate-500">Sisa Saldo Sebelum Pengajuan</span>
                  <p className="mt-1 font-bold text-slate-800">
                    {selectedBudget
                      ? formatRupiah(remainingBudget)
                      : 'Rp 0'}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <span className="text-[11px] text-blue-700">Nominal Pengajuan CER Ini</span>
                  <p className="mt-1 font-bold text-blue-900">
                    {formatRupiah(totalEstimatedPrice)}
                  </p>
                </div>
                <div
                  className={`rounded-lg border p-3 ${
                    isOverBudget
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  <span className="text-[11px]">Proyeksi Sisa Saldo Pagu</span>
                  <p className="mt-1 font-bold">
                    {selectedBudget
                      ? formatRupiah(projectedRemaining)
                      : 'Unbudgeted'}
                  </p>
                </div>
              </div>

              {isOverBudget ? (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Status: Over-Budget.</strong> Pengajuan melebihi sisa anggaran aktif. Sesuai tata
                    kelola, permohonan akan diteruskan dengan verifikasi khusus Budget Validator dan persetujuan
                    hingga Direksi.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Status: Budgeted (Aman).</strong> Nominal pengajuan berada di dalam batas sisa pagu
                    CapEx yang tersedia.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Live Approval Chain Visualizer */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-bold text-slate-900">
                3. Alur Persetujuan (Live Approval Chain)
              </CardTitle>
              <CardDescription className="text-xs">
                Hirarki persetujuan berjenjang yang akan diproses oleh Approval Engine HERO.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative space-y-4">
                {previewSteps && previewSteps.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {previewSteps.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-blue-700">Tahap {s.stepOrder}</span>
                            {s.approvalMode === 'parallel_all' && (
                              <Badge className="border-0 bg-purple-100 text-[9px] font-bold text-purple-800">
                                Semua Wajib (AND)
                              </Badge>
                            )}
                            {s.approvalMode === 'parallel_any' && (
                              <Badge className="border-0 bg-blue-100 text-[9px] font-bold text-blue-800">
                                Cukup 1 Orang (OR)
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {s.slaHours || 24} Jam SLA
                          </Badge>
                        </div>
                        <span className="font-semibold text-slate-800">{s.label}</span>
                        <span className="text-slate-600">{s.approverName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Memuat rantai approver...</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={isPending}
              className="gap-2 text-xs"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Step 1
            </Button>

            <Button
              type="button"
              onClick={handleSubmitFinal}
              disabled={isPending}
              className="gap-2 bg-emerald-600 px-8 font-bold text-white hover:bg-emerald-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Mengirimkan...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Submit Pengajuan CER
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
