'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
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
  Lock,
  ChevronUp,
  ChevronDown,
  PenLine,
  Upload,
} from 'lucide-react'
import { HeroSearchableSelect, type HeroSearchableSelectOption } from '@/components/templates'
import { SignaturePad } from '@/components/signature-pad'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import { toast } from 'sonner'
import { uploadFile } from '@/app/actions/upload'
import {
  createCerRequestAction,
  resubmitCerRequestAction,
  getCapExBudgetsForSelection,
  previewCerApprovalChain,
  getActiveEmployeesForCerSelection,
} from '../actions'
import type { CerCapexBudget } from '@/db/schema/cer'

export interface CerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  mode?: 'create' | 'revision'
  initialData?: any
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

/**
 * Identifies mandatory CER approval steps that cannot be deleted or bypassed:
 * 1. Budget Validator (Amama Ira & Febrian Dani)
 * 2. Director (Hidayat Rahman, cc Freshya)
 * 3. Asset Tagging (Syamsul Bahri / Evo Dwi)
 */
export function isMandatoryCerStep(step?: {
  label?: string | null
  approverName?: string | null
  approverEmployeeId?: number | null
}) {
  if (!step) {
    return {
      isMandatory: false,
      isBudgetValidator: false,
      isDirector: false,
      isAssetTagging: false,
      stepName: '',
    }
  }

  const lbl = (step.label || '').toLowerCase()
  const name = (step.approverName || '').toLowerCase()
  const empId = step.approverEmployeeId

  // 1. Budget Validator (Dual: Amama Ira Amalia Priyono & Febrian Dani)
  const isBudgetValidator =
    lbl.includes('budget') ||
    name.includes('amama') ||
    name.includes('febrian') ||
    empId === 1341 ||
    empId === 960

  // 2. Director (Hidayat Rahman, cc Freshya Ochtovita)
  const isDirector =
    lbl.includes('director') ||
    name.includes('hidayat') ||
    empId === 10

  // 3. Asset Tagging (Syamsul Bahri / Evo Dwi)
  const isAssetTagging =
    lbl.includes('tagging') ||
    lbl.includes('nomor aset') ||
    lbl.includes('no.aset') ||
    lbl.includes('kelompok aset') ||
    name.includes('syamsul') ||
    name.includes('evo') ||
    empId === 990

  const isMandatory = isBudgetValidator || isDirector || isAssetTagging

  const stepName = isBudgetValidator
    ? 'Budget Validator (Amama Ira & Febrian Dani)'
    : isDirector
    ? 'Director (Hidayat Rahman)'
    : isAssetTagging
    ? 'Asset Tagging (Syamsul Bahri / Evo Dwi)'
    : 'Approver Wajib'

  return {
    isMandatory,
    isBudgetValidator,
    isDirector,
    isAssetTagging,
    stepName,
  }
}

export function CerFormDialog({
  open,
  onOpenChange,
  sites,
  departments,
  sections,
  currentEmployee,
  onSuccess,
  mode = 'create',
  initialData = null,
}: CerFormDialogProps) {
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

  // Unit Items Table - Initialized with 1 item
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

  // Submitter Signature State
  const [submitterSig, setSubmitterSig] = useState<string | null>(null)
  const [profileSig, setProfileSig] = useState<string | null>(null)
  const [sigMode, setSigMode] = useState<'profile' | 'draw' | 'upload'>('profile')
  const [uploadedSigUrl, setUploadedSigUrl] = useState<string | null>(null)
  const signatureFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      getUserSignatureAction()
        .then((res) => {
          if (res && res.success && res.signatureDataUrl) {
            setProfileSig(res.signatureDataUrl)
            setSubmitterSig(res.signatureDataUrl)
            setSigMode('profile')
          } else {
            setSigMode('draw')
            setSubmitterSig(null)
          }
        })
        .catch(() => {
          setSigMode('draw')
        })
    }
  }, [open])

  // Preload form data when opening in revision mode
  useEffect(() => {
    if (open && mode === 'revision' && initialData) {
      setStep(1)
      setSubject(initialData.cer.subject || '')
      setPurchaseType(initialData.cer.purchaseType || 'Tambahan / Baru')
      setBudgetSource(initialData.cer.budgetSource || 'Anggaran')
      setSelectedBudgetId(initialData.cer.capexBudgetId || null)
      if (initialData.cer.dateRequired) {
        setDateRequired(new Date(initialData.cer.dateRequired).toISOString().slice(0, 10))
      }
      setPurchasePurpose(initialData.cer.purchasePurpose || '')
      setVendorName(initialData.cer.vendorName || '')
      if (initialData.cer.departmentId) setDepartmentId(initialData.cer.departmentId)
      if (initialData.cer.sectionId) setSectionId(initialData.cer.sectionId)
      if (initialData.cer.siteId) setSiteId(initialData.cer.siteId)
      if (initialData.cer.assetCategory) setAssetCategory(initialData.cer.assetCategory)
      if (initialData.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map((it: any) => ({
            id: String(it.id || `item-${Math.random()}`),
            description: it.description || '',
            qty: Number(it.qty) || 1,
            pricePerUnit: Number(it.pricePerUnit) || 0,
            totalPrice: Number(it.totalPrice) || 0,
            allocation: it.allocation || '',
            holderName: it.holderName || '',
            holderEmployeeId: it.holderEmployeeId || null,
            estimatedLifespan: it.estimatedLifespan || '3 Tahun',
          }))
        )
      }
      if (initialData.attachments && initialData.attachments.length > 0) {
        setUploadedLampiran(initialData.attachments)
      }
      if (initialData.approvals && initialData.approvals.length > 0) {
        setPreviewSteps(
          initialData.approvals.map((ap: any, idx: number) => ({
            ...ap,
            stepOrder: idx + 1,
            isLocked: (ap.status || '').toLowerCase() === 'approved',
          }))
        )
      }
    }
  }, [open, mode, initialData])

  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Format berkas harus berupa gambar (PNG, JPG, atau WebP).')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setUploadedSigUrl(result)
      setSubmitterSig(result)
      toast.success('Gambar tanda tangan pemohon berhasil dimuat.')
    }
    reader.readAsDataURL(file)
  }

  // Step 2 Preview Approval Chain
  const [previewSteps, setPreviewSteps] = useState<any[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false)
  const [allEmployees, setAllEmployees] = useState<
    Array<{
      id: number
      name: string
      employeeSn: string
      jobTitle: string | null
      department?: string | null
      workLocation?: string | null
      siteId?: number | null
    }>
  >([])

  useEffect(() => {
    if (open) {
      getActiveEmployeesForCerSelection()
        .then((data: any) => setAllEmployees(data))
        .catch((err) => console.error('[cer] Error fetching employees for approver selection:', err))
    }
  }, [open])

  // Dropdown options for Alokasi (35 Site dari hero_sites + Departemen)
  const allocationOptions = React.useMemo<HeroSearchableSelectOption[]>(() => {
    const siteOpts: HeroSearchableSelectOption[] = sites.map((s) => ({
      value: s.name,
      label: s.name,
      description: 'Lokasi Operasional Site HERO',
      badge: 'Site',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }))
    const deptOpts: HeroSearchableSelectOption[] = departments.map((d) => ({
      value: d.name,
      label: d.name,
      description: 'Departemen HERO',
      badge: 'Dept',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    }))
    return [...siteOpts, ...deptOpts]
  }, [sites, departments])

  // Dropdown options for Holder (Pool Gudang + Karyawan dari hero_employees)
  const employeeHolderOptions = React.useMemo<HeroSearchableSelectOption[]>(() => {
    const opts: HeroSearchableSelectOption[] = [
      {
        value: 'Pool Gudang / Bersama',
        label: 'Pool Gudang / Bersama',
        description: 'Aset berada di pool atau gudang bersama',
        badge: 'Pool',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      },
    ]
    allEmployees.forEach((emp) => {
      opts.push({
        value: emp.name,
        label: `${emp.name} (${emp.employeeSn || '-'})`,
        description: [emp.jobTitle, emp.department, emp.workLocation].filter(Boolean).join(' • '),
        badge: emp.department || undefined,
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      })
    })
    return opts
  }, [allEmployees])

  // Handler saat holder dipilih -> otomatis isi alokasi site jika masih kosong
  const handleHolderSelect = (itemId: string, selectedHolderName: string) => {
    const matchedEmp = allEmployees.find((e) => e.name === selectedHolderName)
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it
        const nextAllocation =
          !it.allocation && matchedEmp?.workLocation ? matchedEmp.workLocation : it.allocation
        return {
          ...it,
          holderName: selectedHolderName,
          holderEmployeeId: matchedEmp?.id || null,
          allocation: nextAllocation,
        }
      })
    )
  }

  // Handler saat alokasi dipilih
  const handleAllocationSelect = (itemId: string, selectedAllocation: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it
        return {
          ...it,
          allocation: selectedAllocation,
        }
      })
    )
  }

  const employeeOptions = React.useMemo(() => {
    return allEmployees.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.employeeSn || '-'}) - ${e.jobTitle || 'Employee'}`,
    }))
  }, [allEmployees])

  // Move step up or down (Approved steps are locked)
  const handleMoveApprover = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= previewSteps.length) return

    if (previewSteps[index]?.isLocked || previewSteps[targetIndex]?.isLocked) {
      toast.error('Approver yang sudah menyetujui (Approved) terkunci dan tidak dapat digeser.')
      return
    }

    setPreviewSteps((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[targetIndex]
      copy[targetIndex] = temp
      return copy.map((step, idx) => ({ ...step, stepOrder: idx + 1 }))
    })
  }

  // Change employee on an approver step
  const handleApproverEmployeeChange = (index: number, newEmpIdStr: string) => {
    const currentStep = previewSteps[index]
    if (currentStep?.isLocked) {
      toast.error('Approver yang sudah menyetujui (Approved) terkunci dan tidak dapat diubah.')
      return
    }

    const mandatoryCheck = isMandatoryCerStep(currentStep)
    if (mandatoryCheck.isMandatory) {
      toast.error(`Approver pada tahapan ${mandatoryCheck.stepName} telah ditetapkan dan tidak dapat diubah.`)
      return
    }

    const empId = parseInt(newEmpIdStr, 10)
    const found = allEmployees.find((e) => e.id === empId)
    if (!found) return

    setPreviewSteps((prev) =>
      prev.map((step, idx) => {
        if (idx === index) {
          const isSpecial =
            step.label?.toLowerCase().includes('bima') ||
            step.label?.toLowerCase().includes('budget') ||
            step.label?.toLowerCase().includes('tagging')
          return {
            ...step,
            label: isSpecial ? step.label : found.jobTitle || 'Approver',
            approverEmployeeId: found.id,
            approverName: found.name,
            jobTitle: found.jobTitle,
          }
        }
        return step
      })
    )
  }

  // Remove an approver step
  const handleRemoveApprover = (index: number) => {
    const currentStep = previewSteps[index]
    if (currentStep?.isLocked) {
      toast.error('Approver yang sudah menyetujui (Approved) terkunci dan tidak dapat dihapus.')
      return
    }

    const mandatoryCheck = isMandatoryCerStep(currentStep)
    if (mandatoryCheck.isMandatory) {
      toast.error(`Tahapan ${mandatoryCheck.stepName} merupakan tahapan wajib dan tidak boleh dihapus dari alur persetujuan CER.`)
      return
    }

    if (previewSteps.length <= 1) {
      toast.error('Minimal harus ada 1 approver dalam rantai persetujuan.')
      return
    }
    setPreviewSteps((prev) =>
      prev.filter((_, idx) => idx !== index).map((step, idx) => ({ ...step, stepOrder: idx + 1 }))
    )
  }

  // Add an approver step
  const handleAddApprover = () => {
    const defaultEmp = allEmployees[0]
    setPreviewSteps((prev) => [
      ...prev,
      {
        stepOrder: prev.length + 1,
        label: defaultEmp?.jobTitle || 'Approver',
        approverName: defaultEmp ? defaultEmp.name : 'Pilih Approver',
        approverEmployeeId: defaultEmp ? defaultEmp.id : null,
        jobTitle: defaultEmp?.jobTitle || 'Approver',
        slaHours: 24,
      },
    ])
  }

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
  const budgetOptions: HeroSearchableSelectOption[] = React.useMemo(() => {
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

  // Reset Form
  const resetForm = () => {
    setStep(1)
    setSubject('')
    setPurchasePurpose('')
    setVendorName('')
    setItems([
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
    setUploadedLampiran([])
    setSelectedAttachments([])
    setPreviewSteps([])
    setSubmitterSig(profileSig || null)
    setUploadedSigUrl(null)
  }

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

    if (mode === 'revision' && previewSteps && previewSteps.length > 0) {
      setStep(2)
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
    } catch (err) {
      console.error('Preview error:', err)
      toast.error('Gagal memuat rantai approval.')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Submit Final CER Request
  const handleSubmitFinal = () => {
    if (!submitterSig && mode !== 'revision') {
      toast.error('Silakan bubuhkan tanda tangan pemohon terlebih dahulu pada bagian tanda tangan (Section 4).')
      return
    }

    startTransition(async () => {
      if (mode === 'revision' && initialData?.cer?.id) {
        const res = await resubmitCerRequestAction({
          cerId: initialData.cer.id,
          subject,
          purchaseType,
          budgetSource,
          capexBudgetId: budgetSource === 'Anggaran' ? selectedBudgetId : null,
          dateRequired,
          purchasePurpose,
          vendorName,
          items: items.map((it) => ({
            id: it.id && !it.id.startsWith('item-') ? Number(it.id) : undefined,
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
          customApprovers: previewSteps.map((s, idx) => ({
            stepOrder: idx + 1,
            label: s.label,
            approverName: s.approverName,
            approverEmployeeId: s.approverEmployeeId,
            jobTitle: s.jobTitle,
            approvalMode: s.approvalMode,
            isLocked: Boolean(s.isLocked),
            status: s.status,
          })),
        })

        if (res.success) {
          toast.success(res.message)
          resetForm()
          onOpenChange(false)
          if (onSuccess) onSuccess()
        } else {
          toast.error(res.message)
        }
        return
      }

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
        customApprovers: previewSteps.map((s, idx) => ({
          stepOrder: idx + 1,
          label: s.label,
          approverName: s.approverName,
          approverEmployeeId: s.approverEmployeeId,
        })),
        applicantSignatureUrl: submitterSig,
      })

      if (res.success) {
        toast.success(res.message)
        resetForm()
        onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border/70 shrink-0 bg-white">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                {mode === 'revision'
                  ? `Revisi Formulir Pengadaan CER — ${initialData?.cer?.cerNumber || ''}`
                  : 'Formulir Pengadaan Aset (CER)'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {mode === 'revision'
                  ? 'Perbaiki rincian pengadaan atau sesuaikan urutan persetujuan yang belum disetujui'
                  : 'Capital Expenditure Request & Analisis Pagu Anggaran'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={step === 1 ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold text-[11px]' : 'text-slate-500 border-slate-200 text-[11px]'}
              >
                1. Input Data &amp; Rincian
              </Badge>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <Badge
                variant="outline"
                className={step === 2 ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold text-[11px]' : 'text-slate-500 border-slate-200 text-[11px]'}
              >
                2. Review &amp; Approval
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          {step === 1 && (
            <div className="space-y-6">
              {mode === 'revision' && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/95 text-amber-900 shadow-xs flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-200/90 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    ⚠️
                  </div>
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-950">Permintaan Revisi dari Approver</span>
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">
                          Perlu Revisi
                        </Badge>
                      </div>
                      {(initialData?.cer?.reverterName || initialData?.cer?.reverterJobTitle) && (
                        <div className="text-[11px] text-amber-900 font-semibold flex items-center gap-1.5 bg-amber-100/80 px-2.5 py-0.5 rounded-md border border-amber-300/60">
                          <span className="text-slate-600 font-normal">Direvert oleh:</span>
                          <span className="text-amber-950 font-bold">{initialData?.cer?.reverterName || 'Approver'}</span>
                          {initialData?.cer?.reverterJobTitle && (
                            <span className="text-amber-800 font-medium">({initialData?.cer?.reverterJobTitle})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                        Catatan Perbaikan:
                      </span>
                      <div className="p-2.5 rounded-lg bg-white/90 border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed italic shadow-2xs">
                        &quot;{initialData?.cer?.lastRevertNote || 'Mohon sesuaikan rincian pengadaan aset sesuai instruksi approver.'}&quot;
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 pt-0.5">
                      Anda dapat mengubah item barang/jasa, kuantitas, harga, vendor, lampiran, serta susunan approver yang belum disetujui pada Step 2.
                    </p>
                  </div>
                </div>
              )}
              {/* CARD 1: INFORMASI DASAR & PEMOHON */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 sm:px-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-xs sm:text-sm font-bold text-slate-900">
                        1. Informasi Pengajuan &amp; Pemohon
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        Data identitas pemohon, perihal, dan tanggal kebutuhan pengadaan.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Tanggal Dibutuhkan */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Tanggal Dibutuhkan <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={dateRequired}
                        onChange={(e) => setDateRequired(e.target.value)}
                        className="h-9 text-xs bg-white border-slate-300 focus:border-blue-600"
                        required
                      />
                    </div>

                    {/* Kategori Aset */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Kategori Aset Modal <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={assetCategory}
                        onChange={(e) => setAssetCategory(e.target.value)}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      >
                        {ASSET_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sifat Pembelian */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Sifat Pembelian</Label>
                      <RadioGroup
                        value={purchaseType}
                        onValueChange={(val: any) => setPurchaseType(val)}
                        className="flex items-center gap-4 pt-1 text-xs"
                      >
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="Tambahan / Baru" id="pt-new" />
                          <Label htmlFor="pt-new" className="cursor-pointer font-normal text-xs text-slate-700">
                            Tambahan / Baru
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="Pergantian" id="pt-replace" />
                          <Label htmlFor="pt-replace" className="cursor-pointer font-normal text-xs text-slate-700">
                            Pergantian
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Sumber Anggaran */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Sumber Anggaran</Label>
                      <RadioGroup
                        value={budgetSource}
                        onValueChange={(val: any) => setBudgetSource(val)}
                        className="flex items-center gap-4 pt-1 text-xs"
                      >
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="Anggaran" id="bs-budgeted" />
                          <Label htmlFor="bs-budgeted" className="cursor-pointer font-normal text-xs text-slate-700">
                            Anggaran (Budgeted)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="Bukan Anggaran" id="bs-unbudgeted" />
                          <Label htmlFor="bs-unbudgeted" className="cursor-pointer font-normal text-xs text-slate-700">
                            Bukan Anggaran (Unbudgeted)
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Perihal / CER Subject */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Perihal Pengadaan (CER Subject) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="Contoh: Pengadaan 2 Unit Laptop Developer High Performance..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="h-9 text-xs bg-white border-slate-300 focus:border-blue-600"
                      required
                    />
                  </div>

                  {/* Nama Vendor */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Nama Pemasok / Vendor Terpilih <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="Contoh: PT Mega Komputindo Perkasa"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="h-9 text-xs bg-white border-slate-300 focus:border-blue-600"
                      required
                    />
                  </div>

                  {/* Tujuan Pembelian */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Tujuan &amp; Justifikasi Pembelian <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="Jelaskan kebutuhan pengadaan, urgensi operasional, dan dampak jika tidak diadakan..."
                      value={purchasePurpose}
                      onChange={(e) => setPurchasePurpose(e.target.value)}
                      className="min-h-[75px] text-xs bg-white border-slate-300 focus:border-blue-600"
                      required
                    />
                  </div>

                  {/* Readonly info pemohon */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Profil Pemohon &amp; Entitas Organisasi
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Pemohon:</span>
                        <span className="font-semibold text-slate-800">{currentEmployee?.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Departemen:</span>
                        <span className="font-semibold text-slate-800">{selectedDept}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Lokasi Site:</span>
                        <span className="font-semibold text-slate-800">{selectedSite}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2: SUMBER ANGGARAN / PAGU CAPEX */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 sm:px-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Wallet className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-xs sm:text-sm font-bold text-slate-900">
                        2. Sumber Anggaran &amp; Pagu CapEx
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        Pilihan alokasi pagu anggaran tahunan tim finance untuk verifikasi ketersediaan dana.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  {budgetSource === 'Anggaran' ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Pilih Pagu Anggaran CapEx Terdaftar
                        </Label>
                        {isLoadingBudgets ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                            Memeriksa pagu CapEx...
                          </div>
                        ) : availableBudgets.length === 0 ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                            Tidak ditemukan pagu CapEx aktif untuk kombinasi kategori &amp; departemen ini.
                          </div>
                        ) : (
                          <HeroSearchableSelect
                            placeholder="Pilih Pagu Anggaran CapEx..."
                            options={budgetOptions}
                            value={selectedBudgetId ? String(selectedBudgetId) : ''}
                            onChange={(val: string) => setSelectedBudgetId(val ? Number(val) : null)}
                            width="w-full"
                          />
                        )}
                      </div>

                      {selectedBudget && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">Alokasi Pagu</span>
                            <span className="font-bold text-slate-800 mt-0.5 block">
                              {formatRupiah(Number(selectedBudget.allocatedAmount))}
                            </span>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">Sisa Pagu Saat Ini</span>
                            <span className="font-bold text-slate-800 mt-0.5 block">
                              {formatRupiah(remainingBudget)}
                            </span>
                          </div>
                          <div className={`rounded-lg border p-2.5 text-xs ${isOverBudget ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
                            <span className="text-[10px] block uppercase font-medium">Proyeksi Sisa Pagu</span>
                            <span className="font-bold mt-0.5 block">
                              {formatRupiah(projectedRemaining)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      Pengajuan ini ditandai sebagai <strong>Bukan Anggaran (Unbudgeted)</strong>. Rantai persetujuan akan secara otomatis menambahkan verifikasi intensif dari Budget Validator dan Direksi.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CARD 3: RINCIAN UNIT / ITEM CAPEX (2 BARIS TERSTRUKTUR) */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Package className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <CardTitle className="text-xs sm:text-sm font-bold text-slate-900">
                          3. Rincian Unit / Item CapEx
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">
                          Daftar barang modal yang diajukan beserta rincian biaya per unit.
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      className="h-8 gap-1.5 border-blue-600 text-xs font-semibold text-blue-700 hover:bg-blue-50 self-start sm:self-auto"
                    >
                      <Plus className="h-3.5 w-3.5" /> Tambah Unit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  {/* DAFTAR ITEM KARTU 2 BARIS */}
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative rounded-lg border border-slate-200 bg-slate-50/40 p-3.5 shadow-2xs space-y-3 transition-colors hover:border-slate-300"
                      >
                        {/* BARIS 1: DESKRIPSI, QTY, HARGA SATUAN, TOTAL HARGA */}
                        <div className="grid grid-cols-12 gap-3 items-start">
                          {/* Deskripsi Barang */}
                          <div className="col-span-12 sm:col-span-5">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Deskripsi Barang Modal <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                              placeholder="Contoh: Laptop Dell Latitude 5430..."
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="h-8 mt-1 text-xs bg-white border-slate-300 focus:border-blue-600"
                            />
                          </div>

                          {/* Qty Stepper */}
                          <div className="col-span-4 sm:col-span-2">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Qty <span className="text-rose-500">*</span>
                            </Label>
                            <div className="mt-1 flex h-8 items-center rounded-md border border-slate-300 bg-white shadow-xs">
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => handleItemChange(item.id, 'qty', Math.max(1, Number(item.qty || 1) - 1))}
                                className="flex h-full w-7 items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                disabled={Number(item.qty) <= 1}
                              >
                                <span className="text-sm font-bold leading-none select-none">−</span>
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.qty === 0 ? '' : item.qty}
                                onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                className="h-full w-full min-w-0 border-0 bg-transparent text-center text-xs font-bold text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                placeholder="1"
                              />
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => handleItemChange(item.id, 'qty', Number(item.qty || 0) + 1)}
                                className="flex h-full w-7 items-center justify-center text-slate-500 hover:bg-slate-100"
                              >
                                <span className="text-sm font-bold leading-none select-none">+</span>
                              </button>
                            </div>
                          </div>

                          {/* Harga Satuan */}
                          <div className="col-span-8 sm:col-span-3">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Harga Satuan (Rp) <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={item.pricePerUnit === 0 ? '' : item.pricePerUnit}
                              onChange={(e) => handleItemChange(item.id, 'pricePerUnit', e.target.value)}
                              placeholder="0"
                              className="h-8 mt-1 text-xs bg-white border-slate-300 focus:border-blue-600"
                            />
                          </div>

                          {/* Total Harga */}
                          <div className="col-span-12 sm:col-span-2">
                            <Label className="text-[11px] font-semibold text-slate-700">Total Harga</Label>
                            <div className="h-8 mt-1 px-2.5 flex items-center justify-end rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-900 truncate">
                              {formatRupiah(item.totalPrice)}
                            </div>
                          </div>
                        </div>

                        {/* BARIS 2: ALOKASI, PEMAKAI (HOLDER), ESTIMASI UMUR, HAPUS */}
                        <div className="grid grid-cols-12 gap-3 items-center pt-2.5 border-t border-slate-200/60">
                          <div className="col-span-12 sm:col-span-4">
                            <Label className="text-[11px] font-medium text-slate-600">Alokasi (Site/Dept)</Label>
                            <div className="mt-1">
                              <HeroSearchableSelect
                                options={allocationOptions}
                                value={item.allocation}
                                onChange={(val) => handleAllocationSelect(item.id, val)}
                                placeholder="Pilih lokasi site / alokasi..."
                                width="w-full"
                              />
                            </div>
                          </div>
                          <div className="col-span-12 sm:col-span-4">
                            <Label className="text-[11px] font-medium text-slate-600">Pemakai / Holder Aset</Label>
                            <div className="mt-1">
                              <HeroSearchableSelect
                                options={employeeHolderOptions}
                                value={item.holderName}
                                onChange={(val) => handleHolderSelect(item.id, val)}
                                placeholder="Pilih karyawan pemegang aset..."
                                width="w-full"
                              />
                            </div>
                          </div>
                          <div className="col-span-10 sm:col-span-3">
                            <Label className="text-[11px] font-medium text-slate-600">Estimasi Umur Teknis</Label>
                            <Input
                              placeholder="Contoh: 3-5 Tahun"
                              value={item.estimatedLifespan}
                              onChange={(e) => handleItemChange(item.id, 'estimatedLifespan', e.target.value)}
                              className="h-8 mt-1 text-xs bg-white border-slate-200"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1 flex items-center justify-end pt-5 sm:pt-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Hapus Unit"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* BANNER TOTAL ESTIMASI */}
                  <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700">Total Estimasi Nilai CapEx:</span>
                    </div>
                    <span className="text-lg font-bold tracking-tight text-slate-900">
                      {formatRupiah(totalEstimatedPrice)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 4: BERKAS LAMPIRAN PENDUKUNG */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 sm:px-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                      <Paperclip className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-xs sm:text-sm font-bold text-slate-900">
                        4. Berkas Lampiran Pendukung
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        Unggah berkas penawaran harga vendor, proposal teknis, atau lembar inspeksi.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/40 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      {isUploadingFile ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <UploadCloud className="h-5 w-5" />
                      )}
                    </div>
                    <span className="mt-2 text-xs font-semibold text-slate-700">
                      {isUploadingFile ? (
                        'Sedang mengunggah berkas...'
                      ) : (
                        <>Tarik berkas ke sini atau <span className="text-blue-600 underline">Pilih Dokumen</span></>
                      )}
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-400">
                      Format: PDF, PNG, JPG, JPEG, XLSX (Maks. 5 MB per berkas).
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

                  {uploadedLampiran.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-semibold text-slate-700">
                        Berkas Terlampir ({uploadedLampiran.length}):
                      </span>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {uploadedLampiran.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs shadow-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                              <span className="truncate font-medium text-slate-700">{att.fileName}</span>
                              <span className="shrink-0 text-[10px] text-slate-400">
                                ({formatFileSize(att.fileSize)})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setUploadedLampiran((prev) => prev.filter((_, i) => i !== idx))}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 ml-2 shrink-0"
                              title="Hapus file"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* STEP 2: REVIEW PENGAJUAN */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-bold text-slate-900">
                    1. Ringkasan Pengajuan CER
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500">
                    Periksa kembali data pengadaan sebelum submit final ke rantai persetujuan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6 text-xs">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        <span className="text-slate-500">Pemasok Terpilih:</span>
                        <span className="font-semibold text-slate-800">{vendorName}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Tujuan Pembelian:</span>
                    <p className="mt-1 rounded-md bg-slate-50 p-2 text-slate-800">{purchasePurpose}</p>
                  </div>

                  {/* Items summary */}
                  <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs">Deskripsi</TableHead>
                          <TableHead className="w-16 text-center text-xs">Qty</TableHead>
                          <TableHead className="w-28 text-right text-xs">Harga Satuan</TableHead>
                          <TableHead className="w-32 text-right text-xs">Total Harga</TableHead>
                          <TableHead className="w-32 text-xs">Alokasi Site</TableHead>
                          <TableHead className="w-32 text-xs">Holder</TableHead>
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
                            <TableCell className="text-xs">
                              {it.allocation ? (
                                <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200">
                                  {it.allocation}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-700">
                              {it.holderName ? (
                                <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-800 border border-blue-200">
                                  {it.holderName}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* STEP 2: ANALISIS BUDGET CONTROLLER */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-bold text-slate-900">
                    2. Dampak Anggaran (Budget Controller)
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500">
                    Kalkulasi pagu anggaran CapEx tim finance secara real-time.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6 text-xs">
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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <span className="text-[10px] text-slate-500 block uppercase">Pagu Alokasi CapEx</span>
                      <p className="mt-0.5 font-bold text-slate-800">
                        {selectedBudget ? formatRupiah(Number(selectedBudget.allocatedAmount)) : 'Non-Pagu'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <span className="text-[10px] text-slate-500 block uppercase">Sisa Saldo Sebelum Pengajuan</span>
                      <p className="mt-0.5 font-bold text-slate-800">
                        {selectedBudget ? formatRupiah(remainingBudget) : 'Rp 0'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                      <span className="text-[10px] text-blue-700 block uppercase">Nominal Pengajuan CER Ini</span>
                      <p className="mt-0.5 font-bold text-blue-900">
                        {formatRupiah(totalEstimatedPrice)}
                      </p>
                    </div>
                    <div
                      className={`rounded-lg border p-2.5 ${
                        isOverBudget
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      }`}
                    >
                      <span className="text-[10px] block uppercase">Proyeksi Sisa Saldo Pagu</span>
                      <p className="mt-0.5 font-bold">
                        {selectedBudget ? formatRupiah(projectedRemaining) : 'Unbudgeted'}
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

              {/* STEP 2: LIVE APPROVAL CHAIN BUILDER */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        3. Rantai Persetujuan &amp; Otorisasi (Approval Routing)
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        Dikonfigurasi otomatis sesuai struktur organisasi hingga Director. Anda dapat mengubah, menukar urutan, atau menambahkan approver sesuai kebutuhan.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddApprover}
                      className="h-8 gap-1 border-blue-600 text-xs font-semibold text-blue-700 hover:bg-blue-50 self-start sm:self-auto"
                    >
                      <Plus className="h-3.5 w-3.5" /> Tambah Approver
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  {previewSteps && previewSteps.length > 0 ? (
                    <div className="space-y-2.5">
                      {previewSteps.map((s, idx) => {
                        const isBima = s.label?.toLowerCase().includes('bima')
                        const isGM = s.label?.toLowerCase().includes('general manager')
                        const mandatoryInfo = isMandatoryCerStep(s)
                        const isMandatory = mandatoryInfo.isMandatory
                        const isBudgetValidator = mandatoryInfo.isBudgetValidator
                        const isDirector = mandatoryInfo.isDirector
                        const isAssetTagging = mandatoryInfo.isAssetTagging

                        return (
                          <div
                            key={idx}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border text-xs gap-2 transition-all ${
                              isBima
                                ? 'border-indigo-200 bg-indigo-50/60'
                                : isDirector || isGM
                                ? 'border-blue-200 bg-blue-50/40'
                                : isBudgetValidator
                                ? 'border-purple-200 bg-purple-50/40'
                                : isAssetTagging
                                ? 'border-amber-200 bg-amber-50/40'
                                : 'border-slate-200 bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold px-2 py-0.5 shrink-0 ${
                                  isBima
                                    ? 'border-indigo-400 bg-indigo-100 text-indigo-800'
                                    : isDirector || isGM
                                    ? 'border-blue-400 bg-blue-100 text-blue-800'
                                    : isBudgetValidator
                                    ? 'border-purple-400 bg-purple-100 text-purple-800'
                                    : isAssetTagging
                                    ? 'border-amber-400 bg-amber-100 text-amber-800'
                                    : 'border-slate-300 text-slate-700 bg-white'
                                }`}
                              >
                                Tahap {s.stepOrder}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-900 truncate">
                                    {(s.approverName || 'Pilih Approver').replace(/\s*\(BIMA Supervisor\)/gi, '')}
                                  </span>
                                  {isBima && (
                                    <Badge className="bg-indigo-600 text-white text-[9px] px-1 py-0 h-4">
                                      IT Validation
                                    </Badge>
                                  )}
                                  {isDirector && (
                                    <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 h-4 font-normal">
                                      CC &amp; Co-Approve: Freshya (Board Secretary)
                                    </Badge>
                                  )}
                                  {isAssetTagging && (
                                    <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0 h-4 font-normal">
                                      CC: Evo Dwi
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-600 truncate block">
                                  {isBima
                                    ? 'BIMA Supervisor'
                                    : isBudgetValidator
                                    ? 'Budget Validator'
                                    : isAssetTagging
                                    ? 'Asset Tagging'
                                    : s.jobTitle || s.label}
                                  {isDirector && (
                                    <span className="text-blue-700 font-medium ml-1">
                                      (CC: Freshya Ochtovita)
                                    </span>
                                  )}
                                  {isAssetTagging && (
                                    <span className="text-amber-700 font-medium ml-1">
                                      (CC: Evo Dwi)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {s.isLocked ? (
                              <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>✓ Disetujui (Terkunci)</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {/* Reorder Buttons */}
                                <div className="flex items-center border border-slate-200 rounded-md bg-white">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                    disabled={idx === 0 || previewSteps[idx - 1]?.isLocked}
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
                                    disabled={idx === previewSteps.length - 1}
                                    onClick={() => handleMoveApprover(idx, 'down')}
                                    title="Geser ke Bawah"
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                {/* Change Employee Dropdown (only for non-mandatory steps) */}
                                {employeeOptions.length > 0 && !isMandatory && (
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

                                {/* Delete Button or Mandatory Badge */}
                                {!isMandatory ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                    onClick={() => handleRemoveApprover(idx)}
                                    title="Hapus Approver"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="h-7 px-2.5 border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-semibold flex items-center gap-1 shrink-0"
                                    title={`Tahapan wajib ${mandatoryInfo.stepName} - tidak dapat dihapus`}
                                  >
                                    <Lock className="h-3 w-3 text-amber-600" /> Wajib
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Memuat rantai approver...</p>
                  )}

                  {/* Info Notice */}
                  <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                    <div className="space-y-0.5 text-[11px]">
                      <p className="font-semibold">Alur Persetujuan &amp; Penomoran Pasca-Direksi:</p>
                      <p>
                        Setelah persetujuan penuh hingga Direksi, dokumen otomatis diteruskan ke tim Finance (<strong>Syamsul Bahri &amp; Evo Dwi</strong>) untuk penginputan <em>Kelompok Aset &amp; Nomor Aset</em> sebelum form dinyatakan selesai (full approved) dan dokumen resmi PDF diterbitkan.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* STEP 2: TANDA TANGAN DIGITAL PEMOHON */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <div>
                      <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <PenLine className="h-4 w-4 text-emerald-600" />
                        4. Tanda Tangan Digital Pemohon (Diajukan Oleh) <span className="text-rose-500">*</span>
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        Bubuhkan tanda tangan Anda sebagai pemohon resmi pengadaan CapEx ini. Tanda tangan akan dicantumkan pada kolom &quot;DIAJUKAN OLEH&quot; di dokumen PDF resmi.
                      </CardDescription>
                    </div>
                    {submitterSig && (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-semibold gap-1 self-start sm:self-auto shrink-0">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> TTD Siap Dicantumkan
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3.5 text-xs">
                  {/* Mode switcher tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold max-w-md">
                    {profileSig && (
                      <button
                        type="button"
                        onClick={() => {
                          setSigMode('profile')
                          setSubmitterSig(profileSig)
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-md transition-all text-center text-xs ${
                          sigMode === 'profile'
                            ? 'bg-white text-emerald-800 shadow-xs font-bold'
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
                      className={`flex-1 py-1.5 px-3 rounded-md transition-all text-center text-xs ${
                        sigMode === 'draw'
                          ? 'bg-white text-blue-800 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Coretan Tangan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSigMode('upload')
                        if (uploadedSigUrl) {
                          setSubmitterSig(uploadedSigUrl)
                        } else if (sigMode === 'profile') {
                          setSubmitterSig(null)
                        }
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-md transition-all text-center text-xs ${
                        sigMode === 'upload'
                          ? 'bg-white text-indigo-800 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload Gambar
                    </button>
                  </div>

                  {/* Hidden input for upload */}
                  <input
                    ref={signatureFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleSignatureImageUpload}
                  />

                  {/* Mode Profile */}
                  {sigMode === 'profile' && profileSig && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 flex flex-col items-center justify-center min-h-[120px] max-w-md relative">
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Terdaftar di Profil
                      </span>
                      <img
                        src={profileSig}
                        alt="Tanda Tangan Pemohon"
                        className="max-h-24 object-contain my-1"
                      />
                      <p className="text-[11px] font-semibold text-slate-700 mt-1">
                        {currentEmployee?.name || 'Pemohon'}
                      </p>
                    </div>
                  )}

                  {/* Mode Draw */}
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
                        height={130}
                      />
                    </div>
                  )}

                  {/* Mode Upload */}
                  {sigMode === 'upload' && (
                    <div className="max-w-md space-y-2">
                      {uploadedSigUrl ? (
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 flex flex-col items-center justify-center min-h-[120px] relative">
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
                          className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center min-h-[120px]"
                        >
                          <div className="p-2 bg-indigo-50 rounded-full text-indigo-600 mb-2">
                            <Upload className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-800">
                            Klik untuk Unggah Gambar Tanda Tangan
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Format PNG, JPG, JPEG, atau WebP (Maks. 5 MB)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-border/70 shrink-0 bg-white flex items-center justify-between">
          {step === 1 ? (
            <>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Total Nilai CapEx:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatRupiah(totalEstimatedPrice)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGoToStep2}
                  disabled={isLoadingPreview || isUploadingFile}
                  className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {isLoadingPreview ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memvalidasi...
                    </>
                  ) : (
                    <>
                      Lanjut ke Step 2 (Review) <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                disabled={isPending}
                className="h-9 gap-1.5 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Step 1
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  className="h-9 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmitFinal}
                  disabled={isPending}
                  className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengirimkan...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />{' '}
                      {mode === 'revision' ? 'Kirim Revisi Pengajuan (Resubmit)' : 'Kirim Pengajuan CER'}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
