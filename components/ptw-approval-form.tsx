'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SignatureCanvas from 'react-signature-canvas'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Lock,
  PenTool,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { downloadElementAsPdf } from '@/lib/pdf-download'
import {
  PERMIT_TYPE_OPTIONS,
  EQUIPMENT_CHECKLIST_PER_TYPE,
  HIRADC_PRESETS,
  normalizePermitType,
  normalizePermitTypes,
  getActivePermitTypeKeys,
  getDefaultEquipmentItems,
  isItemChecked,
} from '@/lib/ptw-helpers'

import { AdminPageShell } from '@/components/admin-page-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EnterpriseFormGrid } from '@/components/ui/enterprise-table-kit'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import { SignatureFloatingWidget } from '@/components/signature-floating-widget'
import {
  savePtwApprovalForm,
  submitPtwApprovalStepAction,
} from '@/app/dashboard/hse/izin-kerja-ptw/actions'

type ApprovalStep = {
  id: number
  stepOrder: number
  stepLabel: string
  approverName: string
  approverRole: string
  status: string
  signatureDataUrl: string | null
  remarks: string
  signedAt: Date | string | null
}

type PtwApprovalData = {
  permitId: number
  permitNumber: string
  projectName: string
  permitType: string
  location: string
  area: string
  startAt: Date | string | null
  endAt: Date | string | null
  applicantName: string
  fieldPicName: string
  authorizedByName: string
  status: string
  riskLevel: string
  description: string
  controlSteps: string
  ppe: string[]
  gasTestRequired: boolean
  isolationRequired: boolean
  approvals: ApprovalStep[]
  permissions: {
    canApprove: boolean
    canEdit: boolean
  }
}

const APD_OPTIONS = [
  'Helmet',
  'Safety Shoes',
  'Respirator',
  'Full Body Harness',
  'Safety Glasses',
  'Ear Plug',
  'Face Shield',
  'Welding Gloves',
  'Leather Gloves',
  'Dust Mask',
]





function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeInput(value: Date | string | null | undefined) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${mins}`
}

function fmtDt(v: Date | string | null | undefined) {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function hasVisibleCanvasInk(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || canvas.width === 0 || canvas.height === 0) return false
  try {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3]
      const isDarkInk = pixels[i] < 245 || pixels[i + 1] < 245 || pixels[i + 2] < 245
      if (alpha > 12 && isDarkInk) return true
    }
  } catch {
    return false
  }
  return false
}

function riskBadgeColor(level: string) {
  const l = level?.toLowerCase() || ''
  if (l === 'critical' || l === 'extreme' || l === 'high') return 'bg-rose-100 text-rose-800 border-rose-200'
  if (l === 'medium' || l === 'moderate') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-emerald-100 text-emerald-800 border-emerald-200'
}

export function PtwApprovalForm({
  data,
  employees: employeesProp = [],
}: {
  data: PtwApprovalData
  employees?: any[]
}) {
  const router = useRouter()
  const { setOpen } = useSidebar()
  const hasAutoClosed = useRef(false)

  useEffect(() => {
    if (!hasAutoClosed.current) {
      setOpen(false)
      hasAutoClosed.current = true
    }
  }, [setOpen])

  const [isPending, startTransition] = useTransition()
  const sigRef = useRef<SignatureCanvas | null>(null)
  const [signaturesByStepId, setSignaturesByStepId] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    ;(data?.approvals || []).forEach((a) => {
      if (a?.signatureDataUrl) {
        map[a.id] = a.signatureDataUrl
      }
    })
    return map
  })

  useEffect(() => {
    if (data?.approvals && data.approvals.length > 0) {
      setSignaturesByStepId((prev) => {
        const next = { ...prev }
        data.approvals.forEach((a) => {
          if (a?.signatureDataUrl) {
            next[a.id] = a.signatureDataUrl
          }
        })
        return next
      })
    }
  }, [data?.approvals])
  const [previewSig, setPreviewSig] = useState<string>('')
  const [previewSignedAt, setPreviewSignedAt] = useState<Date | null>(null)
  const [registeredSignature, setRegisteredSignature] = useState<string | null>((data as any)?.registeredSignature || null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false)
  const [origin, setOrigin] = useState<string>('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // Fetch logged in user's saved digital signature from profile
  useEffect(() => {
    async function loadSignature() {
      try {
        const res = await getUserSignatureAction()
        if (res.success && res.hasSignature && res.signatureDataUrl) {
          setRegisteredSignature(res.signatureDataUrl)
        }
      } catch (err) {
        console.error('Error fetching user signature in PTW form:', err)
      }
    }
    loadSignature()
  }, [])

  const [activeStepId, setActiveStepId] = useState<number>(() => {
    const nextUnapproved = (data?.approvals || []).find((a) => a?.status !== 'approved' && a?.status !== 'rejected')
    return nextUnapproved ? nextUnapproved.id : (data?.approvals?.[data.approvals.length - 1]?.id ?? 1)
  })
  const [stepRemarks, setStepRemarks] = useState<Record<number, string>>({})
  const [generalRemark, setGeneralRemark] = useState<string>('')

  // 18-Field PTW Form State
  const [projectName, setProjectName] = useState(data.projectName || '')
  const [hiradcReference, setHiradcReference] = useState(() => {
    if (data.description) {
      const match = data.description.match(/\[Referensi HIRADC:\s*([^\]]+)\]/)
      if (match) return match[1].trim()
    }
    return ''
  })
  const [permitType, setPermitType] = useState(data.permitType || 'Hot Work')
  const [location, setLocation] = useState(data.location || '')
  const [area, setArea] = useState(data.area || '')
  const [startDate, setStartDate] = useState(formatDateInput(data.startAt) || new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState(formatTimeInput(data.startAt) || '08:00')
  const [endDate, setEndDate] = useState(formatDateInput(data.endAt) || new Date().toISOString().split('T')[0])
  const [endTime, setEndTime] = useState(formatTimeInput(data.endAt) || '17:00')
  const [description, setDescription] = useState(data.description || '')
  const [controlSteps, setControlSteps] = useState(data.controlSteps || '')
  const [selectedApplicant, setSelectedApplicant] = useState(data.applicantName || '')
  const [selectedFieldPic, setSelectedFieldPic] = useState(data.fieldPicName || '')
  const [status, setStatus] = useState(data.status || 'Submitted')
  const [selectedAuthorized, setSelectedAuthorized] = useState(data.authorizedByName || '')
  const [riskLevel, setRiskLevel] = useState(data.riskLevel || 'Medium')
  const [gasTestRequired, setGasTestRequired] = useState<boolean>(Boolean(data.gasTestRequired))
  const [ppe, setPpe] = useState<string[]>(() => {
    if (data.ppe && Array.isArray(data.ppe) && data.ppe.length > 0) {
      const validApd = data.ppe.filter((item) => !item.includes('?') && item.length < 35)
      if (validApd.length > 0) return validApd
    }
    return ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness']
  })
  const [customApdInput, setCustomApdInput] = useState('')
  const [checkedEquipment, setCheckedEquipment] = useState<string[]>(() => {
    if (data.controlSteps) {
      const lines = data.controlSteps
        .split('\n')
        .map((l) => l.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
      if (lines.length > 0) return lines
    }
    return []
  })

  const toggleEquipmentItem = (itemLabel: string) => {
    setCheckedEquipment((prev) => {
      const next = prev.includes(itemLabel) ? prev.filter((i) => i !== itemLabel) : [...prev, itemLabel]
      setControlSteps(next.map((l, i) => `${i + 1}. ${l}`).join('\n'))
      return next
    })
  }

  const checkIsItemChecked = (itemText: string) => {
    return isItemChecked(itemText, checkedEquipment)
  }

  const [activeView, setActiveView] = useState<'form' | 'preview'>('form')

  const handleHiradcSelect = (val: string) => {
    setHiradcReference(val)
    const matched = HIRADC_PRESETS.find((p) => p.value === val)
    if (matched) {
      const normType = normalizePermitTypes(matched.permitType)
      setPermitType(normType)
      setLocation(matched.location)
      setArea(matched.area)
      setRiskLevel(matched.riskLevel)
      setDescription(matched.description)
      
      const newChecked = getDefaultEquipmentItems(normType)
      setCheckedEquipment(newChecked)
      setPpe(matched.ppe && matched.ppe.length > 0 ? matched.ppe : ['Helmet', 'Safety Shoes', 'Face Shield'])
      
      const formattedControls = newChecked.length > 0
        ? newChecked.map((l, i) => `${i + 1}. ${l}`).join('\n')
        : matched.controlSteps
      setControlSteps(formattedControls)

      toast.success(`Autofill HIRADC diterapkan: ${matched.label}`)
    } else if (val) {
      toast.info(`HIRADC Custom diterapkan: "${val}". Silakan isi manual deskripsi & kontrol risiko.`)
    }
  }

  const togglePpe = (item: string) => {
    setPpe((prev) => (prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]))
  }

  const getCanvasSignatureDataUrl = () => {
    const signature = sigRef.current
    if (!signature) return ''
    const canvas = signature.getCanvas()
    if (!hasVisibleCanvasInk(canvas) && signature.isEmpty()) return ''
    try {
      return signature.getTrimmedCanvas().toDataURL('image/png')
    } catch {
      return signature.toDataURL('image/png')
    }
  }

  const updateSignaturePreview = () => {
    const dataUrl = getCanvasSignatureDataUrl()
    if (dataUrl) {
      if (activeStepId) {
        setSignaturesByStepId((prev) => ({ ...prev, [activeStepId]: dataUrl }))
      }
      setPreviewSig(dataUrl)
      setPreviewSignedAt(new Date())
    }
    return dataUrl
  }

  const handleSaveForm = () => {
    startTransition(async () => {
      const startAt = startDate && startTime ? new Date(`${startDate}T${startTime}:00`) : undefined
      const endAt = endDate && endTime ? new Date(`${endDate}T${endTime}:00`) : undefined

      const formattedControlSteps = checkedEquipment.length > 0
        ? checkedEquipment.map((l, i) => `${i + 1}. ${l}`).join('\n')
        : controlSteps

      let cleanDesc = description
      if (cleanDesc.includes('[Referensi HIRADC:')) {
        cleanDesc = cleanDesc.replace(/\[Referensi HIRADC:[^\]]+\]\s*/, '')
      }
      const finalDescription = hiradcReference.trim()
        ? `[Referensi HIRADC: ${hiradcReference.trim()}]\n${cleanDesc}`
        : cleanDesc

      const res = await savePtwApprovalForm({
        permitId: data.permitId,
        projectName,
        permitType,
        location,
        area,
        startAt,
        endAt,
        applicantName: selectedApplicant,
        fieldPicName: selectedFieldPic,
        authorizedByName: selectedAuthorized,
        status,
        riskLevel,
        description: finalDescription,
        controlSteps: formattedControlSteps,
        ppe,
        signatures: signaturesByStepId,
        stepRemarks,
      })

      if (res.success) {
        toast.success('Izin Kerja Aman (PTW) berhasil disimpan')
        router.refresh()
      } else {
        toast.error('Gagal menyimpan: ' + (res.error || 'Terjadi kesalahan'))
      }
    })
  }

  const handleApproveStep = (stepId: number) => {
    const signatureDataUrl = registeredSignature || signaturesByStepId[stepId] || getCanvasSignatureDataUrl() || previewSig
    if (!signatureDataUrl) {
      toast.error('Anda belum mendaftarkan tanda tangan. Silakan daftarkan tanda tangan terlebih dahulu.')
      setIsRegisterModalOpen(true)
      return
    }

    startTransition(async () => {
      const formattedControlSteps = checkedEquipment.length > 0
        ? checkedEquipment.map((l, i) => `${i + 1}. ${l}`).join('\n')
        : controlSteps

      await savePtwApprovalForm({
        permitId: data.permitId,
        projectName,
        permitType,
        location,
        area,
        applicantName: selectedApplicant,
        fieldPicName: selectedFieldPic,
        authorizedByName: selectedAuthorized,
        status,
        riskLevel,
        description,
        controlSteps: formattedControlSteps,
        ppe,
      })

      const fd = new FormData()
      fd.set('sessionId', String(data.permitId))
      fd.set('approvalId', String(stepId))
      fd.set('action', 'approve')
      fd.set('signatureDataUrl', signatureDataUrl)
      fd.set('remarks', stepRemarks[stepId] || '')

      const res = await submitPtwApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success('Persetujuan berhasil ditandatangani!')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal memproses approval.')
      }
    })
  }

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    actionType: 'reject' | 'revert'
    stepId: number
  } | null>(null)

  const executeRejectStep = (stepId: number) => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('sessionId', String(data.permitId))
      fd.set('approvalId', String(stepId))
      fd.set('action', 'reject')
      fd.set('remarks', stepRemarks[stepId] || '')

      const res = await submitPtwApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success('Permohonan PTW ditolak.')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal menolak approval.')
      }
    })
  }

  const executeRevertStep = (stepId: number) => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('sessionId', String(data.permitId))
      fd.set('approvalId', String(stepId))
      fd.set('action', 'revert')
      fd.set('remarks', stepRemarks[stepId] || 'Dokumen PTW dikembalikan untuk revisi.')

      const res = await submitPtwApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success(res.message || 'Dokumen PTW berhasil dikembalikan untuk revisi.')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal mengembalikan PTW.')
      }
    })
  }

  const handleRejectStep = (stepId: number) => {
    setConfirmDialog({ isOpen: true, actionType: 'reject', stepId })
  }

  const handleRevertStep = (stepId: number) => {
    setConfirmDialog({ isOpen: true, actionType: 'revert', stepId })
  }

  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    toast.loading('Menyiapkan file PDF...', { id: 'ptw-form-dl' })
    try {
      const el = document.querySelector('.pdf-wrapper') as HTMLElement
      if (el) {
        await downloadElementAsPdf(el, `PTW_${data.permitNumber.replace(/[\/\\]/g, '_')}.pdf`, { orientation: 'landscape' })
        toast.success('PDF Landscape A4 berhasil diunduh!', { id: 'ptw-form-dl' })
      } else {
        toast.error('Gagal menemukan template PDF', { id: 'ptw-form-dl' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengunduh PDF', { id: 'ptw-form-dl' })
    } finally {
      setIsDownloading(false)
    }
  }

  const approvalHistoryForDisplay = (data?.approvals?.length
    ? data.approvals.filter((s) => s.stepOrder <= 3)
    : [
        { id: 1, stepOrder: 1, stepLabel: 'Pelaksana Kerja', approverName: selectedApplicant || 'Pelaksana Kerja', approverRole: 'applicant', status: 'approved', signatureDataUrl: null, remarks: '', signedAt: data.startAt },
        { id: 2, stepOrder: 2, stepLabel: 'Pemberi Kerja', approverName: selectedFieldPic || 'Pemberi Kerja', approverRole: 'safety_officer', status: 'pending', signatureDataUrl: null, remarks: '', signedAt: null },
        { id: 3, stepOrder: 3, stepLabel: 'Safety Dept', approverName: selectedAuthorized || 'Safety Dept', approverRole: 'field_pic', status: 'waiting', signatureDataUrl: null, remarks: '', signedAt: null },
      ]
  ).map((step) => ({
    ...step,
    stepLabel:
      step.stepOrder === 1 || step.approverRole === 'applicant'
        ? 'Pelaksana Kerja'
        : step.stepOrder === 2 || step.approverRole === 'safety_officer'
        ? 'Pemberi Kerja'
        : step.stepOrder === 3 || step.approverRole === 'field_pic' || step.approverRole === 'authorized'
        ? 'Safety Dept'
        : step.stepLabel,
  }))

  const step1 = approvalHistoryForDisplay.find((s) => s.stepOrder === 1 || s.approverRole === 'applicant')
  const step2 = approvalHistoryForDisplay.find((s) => s.stepOrder === 2 || s.approverRole === 'safety_officer')
  const step3 = approvalHistoryForDisplay.find((s) => s.stepOrder === 3 || s.approverRole === 'field_pic' || s.approverRole === 'authorized')

  const isStep1Locked = Boolean(step1?.status === 'approved' || step1?.signatureDataUrl || data.status === 'Approved')
  const isStep2Locked = Boolean(step2?.status === 'approved' || step2?.signatureDataUrl || data.status === 'Approved')
  const isStep3Locked = Boolean(step3?.status === 'approved' || step3?.signatureDataUrl || data.status === 'Approved')

  const step1Sig = (step1 && signaturesByStepId[step1.id]) || step1?.signatureDataUrl || (activeStepId === step1?.id && previewSig ? previewSig : null)
  const step2Sig = (step2 && signaturesByStepId[step2.id]) || step2?.signatureDataUrl || (activeStepId === step2?.id && previewSig ? previewSig : null)
  const step3Sig = (step3 && signaturesByStepId[step3.id]) || step3?.signatureDataUrl || (activeStepId === step3?.id && previewSig ? previewSig : null)

  function renderApprovalMeta(step?: (typeof approvalHistoryForDisplay)[number] | null, sigDateOverride?: Date | string | null) {
    if (!step) return null
    const dateToUse = sigDateOverride || step.signedAt
    return (
      <div className="mt-1 text-[6.5pt] text-gray-500">
        <div>{dateToUse ? fmtDt(dateToUse) : 'Belum Ditandatangani'}</div>
        {step.remarks ? <div className="italic text-gray-400">"{step.remarks}"</div> : null}
      </div>
    )
  }

  const activeStep = approvalHistoryForDisplay.find((a) => a.id === activeStepId) || approvalHistoryForDisplay[0]

  return (
    <AdminPageShell
      eyebrow="HSE • Form"
      title="Permit to Work (PTW) Review"
      description="Evaluasi izin kerja aman dan tanda tangan verifikasi bertingkat."
    >
      <div className="space-y-4">
        {/* Mobile/Tablet View Toggle (visible on < xl) */}
        <div className="flex xl:hidden items-center justify-center p-1 bg-slate-100 rounded-full max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setActiveView('form')}
            className={cn(
              'flex-1 py-1.5 text-xs font-bold rounded-full transition-all text-center',
              activeView === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            📝 Formulir Input
          </button>
          <button
            type="button"
            onClick={() => setActiveView('preview')}
            className={cn(
              'flex-1 py-1.5 text-xs font-bold rounded-full transition-all text-center',
              activeView === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            📄 Live PDF Preview
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* ── LEFT: Form ── */}
          <div className={cn('flex flex-col gap-6 print:hidden', activeView === 'preview' ? 'hidden xl:flex' : 'flex')}>
            {/* Top Action Bar (Contract Review Parity) */}
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/hse/izin-kerja-ptw">
                  <ArrowLeft className="mr-2 size-4" /> Kembali
                </Link>
              </Button>
              <Button onClick={handleDownloadPdf} disabled={isDownloading} variant="secondary" className="gap-2">
                <Download className="size-4" /> {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
              </Button>
              <Button
                onClick={handleSaveForm}
                disabled={isPending}
                className="ml-auto bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                <Save className="mr-2 size-4" /> {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>

            {/* ── 18-FIELD PERMIT DETAILS CARD ── */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Details & Permit Information
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Field PTW lengkap untuk kontrol pekerjaan berisiko di workshop mining.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('rounded-full text-[10px] uppercase font-bold', riskBadgeColor(riskLevel))}>
                      <AlertTriangle className="mr-1 size-3" />
                      {riskLevel}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-xs font-semibold">{status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-xs">
                {/* Field 1: Nama Proyek / Kontrak */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Nama proyek / kontrak</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ketik nama proyek / kontrak"
                    className="h-10 bg-slate-50/70 border-slate-200 text-xs font-medium"
                  />
                </div>

                {/* Field 2: Referensi HIRADC */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Referensi HIRADC</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          <span>Pilih dari Preset HIRADC</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-80 p-2 z-50">
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5 px-2">Klik Preset untuk Autofill Form:</p>
                        <div className="space-y-1 max-h-56 overflow-auto">
                          {HIRADC_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => handleHiradcSelect(preset.value)}
                              className="w-full text-left p-2 rounded-lg hover:bg-blue-50 text-xs transition-colors border border-transparent hover:border-blue-100"
                            >
                              <div className="font-semibold text-slate-900">{preset.label}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{preset.description}</div>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Input
                    placeholder="Ketik referensi HIRADC / judul aktivitas pekerjaan..."
                    value={hiradcReference}
                    onChange={(e) => setHiradcReference(e.target.value)}
                    className="h-10 bg-slate-50/70 border-slate-200 text-xs"
                  />

                  {/* Preset Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-400">Preset Cepat:</span>
                    {HIRADC_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => handleHiradcSelect(p.value)}
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all",
                          hiradcReference === p.value
                            ? "bg-blue-600 text-white border-blue-600 font-semibold"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        )}
                      >
                        {p.label.split('/')[0].trim()}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] font-medium text-slate-400">
                    Ketik langsung referensi HIRADC (langsung tersimpan real-time), atau klik preset di atas untuk autofill detail pekerjaan.
                  </p>
                </div>

                {/* Field 3 & 4: Tipe Izin Kerja & Lokasi Spesifik */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Tipe izin kerja (Dapat Pilih Lebih Dari Satu)</Label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {PERMIT_TYPE_OPTIONS.map((opt) => {
                        const activeTypes = getActivePermitTypeKeys(permitType)
                        const isSelected = activeTypes.includes(opt.value)
                        return (
                          <button
                            type="button"
                            key={opt.value}
                            onClick={() => {
                              let currentTypes = getActivePermitTypeKeys(permitType)
                              let updatedTypes: string[]
                              const isRemoving = currentTypes.includes(opt.value)
                              if (isRemoving) {
                                updatedTypes = currentTypes.filter(t => t !== opt.value)
                              } else {
                                updatedTypes = [...currentTypes, opt.value]
                              }
                              const newPermitTypeStr = updatedTypes.join(', ') || 'Cold Permit'
                              setPermitType(newPermitTypeStr)

                              if (isRemoving) {
                                const removedTypeItems = EQUIPMENT_CHECKLIST_PER_TYPE[opt.value]?.items.map((i) => i.label) || []
                                setCheckedEquipment((prev) => prev.filter((item) => !isItemChecked(item, removedTypeItems)))
                              }
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 ring-1 ring-slate-900/20"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            <span>{isSelected ? "☑" : "☐"}</span>
                            <span>{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Lokasi spesifik</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Silo Material Kering No. 3"
                      className="h-10 bg-slate-50/70 border-slate-200 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Dynamic Item Check / Checklist K3 per Selected Permit Type */}
                {(() => {
                  const activeTypes = getActivePermitTypeKeys(permitType)
                  if (activeTypes.length === 0) return null
                  return (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Item Check / Peralatan & Checklist K3 Terpilih</span>
                        </Label>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {activeTypes.length} Tipe Izin Terpilih
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Item check K3 otomatis disesuaikan berdasarkan jenis izin kerja berisiko yang dipilih:
                      </p>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {activeTypes.map((pType) => {
                          const data = EQUIPMENT_CHECKLIST_PER_TYPE[pType]
                          if (!data) return null
                          return (
                            <div key={pType} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2">
                              <div className="font-bold text-[11px] text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
                                <span className="uppercase text-slate-900">{pType}</span>
                                <span className="text-[9px] font-mono text-slate-400 font-normal">{data.items.length} Item Check</span>
                              </div>
                              <div className="text-[10px] italic text-slate-500 font-medium leading-tight">
                                {data.subHeader}
                              </div>
                              <div className="space-y-1 pt-1">
                                {data.items.map((item) => {
                                  const isChecked = checkIsItemChecked(item.label)
                                  return (
                                    <label
                                      key={item.id}
                                      className={cn(
                                        "flex items-start gap-2 p-1.5 rounded-md border cursor-pointer transition-all text-[11px] font-medium leading-tight select-none",
                                        isChecked
                                          ? "bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs"
                                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleEquipmentItem(item.label)}
                                        className="mt-0.5 size-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      />
                                      <span className="flex-1">{item.label}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Field 5 & 6: Area Kerja & Tgl Mulai */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Area kerja</Label>
                    <Input
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="Contoh: Tire Repair Bay - Sector Utara"
                      className="h-10 bg-slate-50/70 border-slate-200 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Tgl mulai</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 bg-slate-50/70 border-slate-200 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Field 7 & 8: Jam Mulai & Tgl Selesai */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Jam mulai</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-10 bg-slate-50/70 border-slate-200 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Tgl selesai</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10 bg-slate-50/70 border-slate-200 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Field 9: Jam Selesai */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Jam selesai</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-10 bg-slate-50/70 border-slate-200 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Field 10: Deskripsi Pekerjaan */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Deskripsi pekerjaan</Label>
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mengeluarkan sisa material yang menggumpal di area corong silo bawah..."
                    className="bg-slate-50/70 border-slate-200 text-xs leading-relaxed"
                  />
                </div>

                {/* Row 1: 1. Pelaksana kerja | Status persetujuan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">Nama pelaksana kerja</Label>
                      {isStep1Locked && (
                        <span className="text-[10px] text-amber-800 bg-amber-50 font-bold px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                          <Lock className="size-3 text-amber-600" /> Disetujui / Terkunci
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      label="Pelaksana Kerja"
                      placeholder="PILIH PELAKSANA KERJA..."
                      value={selectedApplicant}
                      onValueChange={setSelectedApplicant}
                      disabled={isStep1Locked}
                      options={employeesProp.map((e) => ({
                        value: e.name,
                        label: `${e.name} — ${e.jobTitle || e.rank || e.role || 'Technician'}`,
                      }))}
                      widthClassName="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Status persetujuan</Label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full h-10 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1 text-xs shadow-sm font-semibold"
                    >
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: 2. Pemberi kerja | Risk level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">Nama pemberi kerja</Label>
                      {isStep2Locked && (
                        <span className="text-[10px] text-amber-800 bg-amber-50 font-bold px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                          <Lock className="size-3 text-amber-600" /> Disetujui / Terkunci
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      label="Pemberi Kerja"
                      placeholder="PILIH PEMBERI KERJA..."
                      value={selectedFieldPic}
                      onValueChange={setSelectedFieldPic}
                      disabled={isStep2Locked}
                      options={employeesProp.map((e) => ({
                        value: e.name,
                        label: `${e.name} — ${e.jobTitle || e.rank || e.role || 'Supervisor'}`,
                      }))}
                      widthClassName="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Risk level</Label>
                    <select
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value)}
                      className="w-full h-10 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1 text-xs shadow-sm font-semibold"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: 3. Safety dept | APD wajib */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">Nama safety dept / pengawas</Label>
                      {isStep3Locked && (
                        <span className="text-[10px] text-amber-800 bg-amber-50 font-bold px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                          <Lock className="size-3 text-amber-600" /> Disetujui / Terkunci
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      label="Safety Dept"
                      placeholder="PILIH SAFETY DEPT..."
                      value={selectedAuthorized}
                      onValueChange={setSelectedAuthorized}
                      disabled={isStep3Locked}
                      options={employeesProp.map((e) => ({
                        value: e.name,
                        label: `${e.name} — ${e.jobTitle || e.rank || e.role || 'HSE Superintendent'}`,
                      }))}
                      widthClassName="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">APD wajib</Label>
                    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50/70 min-h-10">
                      {ppe.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-600 text-white border border-teal-700 shadow-xs"
                        >
                          ✓ {item}
                          <button
                            type="button"
                            onClick={() => setPpe((prev) => prev.filter((p) => p !== item))}
                            className="ml-0.5 rounded hover:bg-teal-700 p-0.5"
                            title={`Hapus ${item}`}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}

                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-slate-700 border border-dashed border-slate-300 hover:border-teal-500 hover:text-teal-700 transition-colors shadow-xs"
                          >
                            <Plus className="size-3 text-teal-600" /> Tambah APD
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60 p-2.5 rounded-xl shadow-lg" align="start">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                            Pilih / Tambah APD
                          </div>
                          <div className="max-h-44 overflow-y-auto space-y-0.5">
                            {APD_OPTIONS.filter((opt) => !ppe.includes(opt)).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  if (!ppe.includes(opt)) setPpe((prev) => [...prev, opt])
                                }}
                                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition-colors"
                              >
                                + {opt}
                              </button>
                            ))}
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-100 flex gap-1.5">
                            <Input
                              placeholder="APD Kustom..."
                              value={customApdInput}
                              onChange={(e) => setCustomApdInput(e.target.value)}
                              className="h-7 text-xs bg-slate-50"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  if (customApdInput.trim() && !ppe.includes(customApdInput.trim())) {
                                    setPpe((prev) => [...prev, customApdInput.trim()])
                                    setCustomApdInput('')
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2 text-xs bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                              onClick={() => {
                                if (customApdInput.trim() && !ppe.includes(customApdInput.trim())) {
                                  setPpe((prev) => [...prev, customApdInput.trim()])
                                  setCustomApdInput('')
                                }
                              }}
                            >
                              Tambah
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>


                {/* Field 19: Attachment Documents */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <Label className="text-xs font-semibold text-slate-700">Lampiran dokumen pendukung</Label>
                  <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center gap-1 text-xs text-slate-500 font-medium">
                      <UploadCloud className="size-6 text-slate-400" />
                      <span>Pilih dokumen pendukung</span>
                      <span className="text-[10px] font-normal text-slate-400">PDF, JPG, PNG hingga 10MB</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── STATUS APPROVAL & SIGNATORIES CARD ── */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">Status Approval & Signatories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-4">
                {approvalHistoryForDisplay.map((step, idx) => {
                  const roleLabels: Record<string, string> = {
                    applicant: 'Pelaksana Kerja',
                    pelaksana: 'Pelaksana Kerja',
                    pelaksana_kerja: 'Pelaksana Kerja',
                    safety_officer: 'Pemberi Kerja',
                    pemberi_kerja: 'Pemberi Kerja',
                    field_pic: 'Safety Dept',
                    safety_dept: 'Safety Dept',
                    authorized: 'Safety Dept',
                  }
                  const displayName =
                    (step.stepOrder === 1 || step.approverRole === 'applicant' || step.approverRole === 'pelaksana' || step.approverRole === 'pelaksana_kerja')
                      ? (selectedApplicant || step.approverName || 'Pelaksana Kerja')
                      : (step.stepOrder === 2 || step.approverRole === 'safety_officer' || step.approverRole === 'pemberi_kerja')
                      ? (selectedFieldPic || step.approverName || 'Pemberi Kerja')
                      : (selectedAuthorized || step.approverName || 'Safety Dept')

                  const displayRole = roleLabels[step.approverRole] || step.stepLabel || 'Approver'

                  return (
                    <div
                      key={step.id || idx}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border p-4 bg-white transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] border-slate-200/80'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                        <p className="text-xs text-slate-400">{displayRole}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {step.status === 'approved' ? (
                          <Badge className="bg-emerald-50 text-emerald-600 rounded-full border-0 px-3 py-1 font-bold text-[10px] tracking-wide">
                            DISETUJUI
                          </Badge>
                        ) : step.status === 'pending' ? (
                          <Badge className="bg-amber-50 text-amber-600 rounded-full border-0 px-3 py-1 font-bold text-[10px] tracking-wide">
                            MENUNGGU
                          </Badge>
                        ) : step.status === 'rejected' ? (
                          <Badge className="bg-rose-50 text-rose-600 rounded-full border-0 px-3 py-1 font-bold text-[10px] tracking-wide">
                            DITOLAK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-slate-400 font-bold text-[10px] tracking-wide border-slate-200">
                            MENUNGGU
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* ── TANDA TANGAN ELEKTRONIK CARD (AUTO-SIGN PARITY) ── */}
            {data.status === 'Approved' || data.status === 'Rejected' || approvalHistoryForDisplay.some((s) => s.status === 'rejected') || step3?.status === 'approved' ? (
              <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70 p-5 bg-white">
                {data.status === 'Rejected' || approvalHistoryForDisplay.some((s) => s.status === 'rejected') ? (
                  <div className="flex items-center gap-3.5 bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <div className="size-10 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                      <XCircle className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-950">Dokumen PTW Telah Ditolak</h4>
                      <p className="text-xs text-rose-700 mt-0.5">
                        Proses verifikasi dan persetujuan Izin Kerja (PTW) ini telah ditolak. Kolom pengajuan tanda tangan digital dan tombol aksi sudah ditutup.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3.5 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="size-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">Dokumen PTW Telah Disetujui Sepenuhnya</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Seluruh tahap persetujuan dan verifikasi K3 telah lengkap disetujui. Kolom tanda tangan digital dan tombol aksi telah selesai.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">Tanda Tangan Elektronik</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Tahap: <strong>{activeStep?.stepLabel}</strong> ({activeStep?.approverName || 'Approver'})
                      </CardDescription>
                    </div>
                    {activeStep?.status === 'approved' ? (
                      <Badge className="bg-emerald-50 text-emerald-600 rounded-full border-0 px-3 py-1 font-bold text-[10px]">
                        DISETUJUI
                      </Badge>
                    ) : activeStep?.status === 'pending' ? (
                      <Badge className="bg-amber-50 text-amber-600 rounded-full border-0 px-3 py-1 font-bold text-[10px]">
                        GILIRAN ANDA
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 rounded-full px-3 py-1 font-bold text-[10px]">
                        MENUNGGU URUTAN
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Auto-Sign Digital Signature Indicator */}
                  {registeredSignature ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-24 items-center justify-center rounded-lg border border-slate-200/80 bg-white p-1.5 shadow-inner">
                          <img src={registeredSignature} alt="Tanda Tangan Saya" className="max-h-11 max-w-full object-contain" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Tanda Tangan Digital Terdaftar</p>
                          <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="size-3.5" /> Siap ditempelkan otomatis ke PDF
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="h-8 rounded-lg border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white"
                      >
                        <PenTool className="size-3 mr-1 text-slate-500" /> Ubah TTD
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="size-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-950">Belum Ada Tanda Tangan Terdaftar</p>
                          <p className="text-[11px] text-amber-800">Daftarkan tanda tangan sekali untuk menyetujui formulir ini.</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-sm"
                      >
                        <PenTool className="size-3.5 mr-1" /> Daftar TTD Sekarang
                      </Button>
                    </div>
                  )}

                  {(() => {
                    const targetStepId = activeStep?.id ?? activeStepId ?? 1
                    const isActionDisabled = isPending || (activeStep?.status === 'approved' && data.status === 'Approved')
                    return (
                      <>
                        <div className="space-y-1.5 pt-2">
                          <Label className="text-xs font-semibold text-slate-700">Catatan Approval (Opsional)</Label>
                          <Textarea
                            rows={2}
                            placeholder="Tuliskan catatan atau rekomendasi khusus..."
                            value={stepRemarks[targetStepId] ?? generalRemark}
                            onChange={(e) => {
                              const val = e.target.value
                              setGeneralRemark(val)
                              setStepRemarks((prev) => ({ ...prev, [targetStepId]: val }))
                            }}
                            className="bg-slate-50 border-slate-200 text-xs"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-full text-xs font-bold px-4 py-2 uppercase"
                            onClick={() => handleRejectStep(targetStepId)}
                            disabled={isActionDisabled}
                          >
                            <XCircle className="mr-1 size-3.5" /> REJECT
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 rounded-full text-xs font-bold px-4 py-2 uppercase"
                            onClick={() => handleRevertStep(targetStepId)}
                            disabled={isActionDisabled}
                          >
                            <RotateCcw className="mr-1 size-3.5" /> REVERT
                          </Button>

                          <Button
                            type="button"
                            className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold px-5 py-2.5 uppercase"
                            onClick={() => handleApproveStep(targetStepId)}
                            disabled={isActionDisabled}
                          >
                            <CheckCircle2 className="mr-1 size-3.5" /> DISETUJUI
                          </Button>
                        </div>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            <SignatureFloatingWidget
              isOpenDirectModal={isRegisterModalOpen}
              onCloseDirectModal={() => setIsRegisterModalOpen(false)}
              onSignatureUpdated={(dataUrl) => {
                setRegisteredSignature(dataUrl)
                setPreviewSig(dataUrl)
                setPreviewSignedAt(new Date())
                if (activeStepId) {
                  setSignaturesByStepId((prev) => ({ ...prev, [activeStepId]: dataUrl }))
                }
              }}
            />
          </div>

          {/* ── RIGHT: Live Landscape PDF Preview ── */}
          <div className={cn("rounded-[1.1rem] bg-slate-100 p-4 shadow-sm border border-slate-200 print:hidden overflow-auto", activeView === 'form' ? 'hidden xl:block' : 'block')}>
            {/* ponytail: landscape_a4_wrapper - standard A4 landscape dimensions (1122px x 793px @ 96dpi) */}
            <div
              id="pdf-page-1"
              className="pdf-wrapper relative mx-auto w-[1122px] min-h-[793px] shrink-0 bg-white shadow-sm border-2 border-slate-900 text-slate-900 font-sans text-[8.5pt] p-6 flex flex-col justify-between"
            >
              {/* ── HEADER TABLE ── */}
              <div className="grid grid-cols-[180px_1fr] border-b-2 border-slate-900">
                <div className="flex items-center justify-center p-2 border-r-2 border-slate-900 bg-white">
                  <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-12 object-contain" />
                </div>
                <div className="bg-[#bfe6ff] flex items-center justify-center font-bold text-base tracking-wider uppercase py-2.5 text-slate-900">
                  IJIN KERJA BERBAHAYA ( Work Permit )
                </div>
              </div>

              {/* ── FORM META FIELDS ── */}
              <div className="grid grid-cols-12 border-b-2 border-slate-900 text-[8pt]">
                <div className="col-span-4 border-r border-slate-900 p-1.5 bg-slate-50">
                  <span className="font-bold">No. Ijin Kerja Berbahaya :</span> <span className="font-mono font-semibold">{data.permitNumber}</span>
                </div>
                <div className="col-span-8 p-1.5 bg-slate-50">
                  <span className="font-bold">No. Work Order :</span> <span className="font-mono font-semibold">{data.permitNumber}</span>
                </div>

                <div className="col-span-4 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                  <span className="font-bold block text-[7.5pt] text-slate-500">Nama Pekerja :</span>
                  <span className="font-semibold text-slate-900">{selectedApplicant || '—'}</span>
                </div>
                <div className="col-span-3 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                  <span className="font-bold block text-[7.5pt] text-slate-500">Lokasi :</span>
                  <span className="font-semibold text-slate-900">{location || '—'} ({area || '—'})</span>
                </div>
                <div className="col-span-5 border-t border-slate-900 p-1.5 min-h-[44px]">
                  <span className="font-bold block text-[7.5pt] text-slate-500">Uraian Pekerjaan :</span>
                  <span className="font-semibold text-slate-900">{projectName || description || '—'}</span>
                </div>

                <div className="col-span-6 border-r border-slate-900 border-t border-slate-900 p-1.5 bg-blue-50/50">
                  <span className="font-bold text-slate-800">Referensi HIRADC :</span>{' '}
                  <span className="font-semibold text-blue-900">
                    {hiradcReference || (description?.match(/\[Referensi HIRADC:\s*(.*?)\]/)?.[1]) || '—'}
                  </span>
                </div>
                <div className="col-span-6 border-t border-slate-900 p-1.5 bg-blue-50/50">
                  <span className="font-bold text-slate-800">Tipe Izin Kerja Terpilih :</span>{' '}
                  <span className="font-semibold uppercase text-slate-900">{permitType || 'Cold Permit'}</span>
                </div>
              </div>

              {/* ── TABLE TITLE: JENIS PEKERJAAN ── */}
              <div className="bg-[#e2e8f0] text-center font-bold uppercase text-[8.5pt] py-1 border-b-2 border-slate-900">
                JENIS PEKERJAAN
              </div>

              {/* ── DYNAMIC COLUMNS FOR SELECTED PERMIT TYPES ONLY ── */}
              {(() => {
                const activeKeys = getActivePermitTypeKeys(permitType)
                const columnsToShow = activeKeys.length > 0
                  ? activeKeys.map((k) => {
                      if (k.includes('Hot')) return 'HOT'
                      if (k.includes('Confined')) return 'CONFINED'
                      if (k.includes('Digging')) return 'DIGGING'
                      if (k.includes('Cold')) return 'COLD'
                      return 'ELECTRICAL'
                    })
                  : ['HOT']

                const gridColsClass =
                  columnsToShow.length === 1
                    ? 'grid-cols-1'
                    : columnsToShow.length === 2
                    ? 'grid-cols-2'
                    : columnsToShow.length === 3
                    ? 'grid-cols-3'
                    : columnsToShow.length === 4
                    ? 'grid-cols-4'
                    : 'grid-cols-5'

                return (
                  <div className={`grid ${gridColsClass} border-b-2 border-slate-900 divide-x-2 divide-slate-900 text-[7.5pt]`}>
                    {/* Column 1: Hot Work Permit (Red Header) */}
                    {columnsToShow.includes('HOT') && (
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="bg-[#ef4444] text-white text-center font-bold py-1 uppercase border-b border-slate-900">
                            Hot Work Permit
                          </div>
                          <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                            <div>- Welding</div>
                            <div>- Cutting torch</div>
                            <div>- Grinding</div>
                            <div>- Brazing</div>
                          </div>
                          <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                            Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                          </div>
                          <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                            <thead>
                              <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                                <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                              </tr>
                            </thead>
                            <tbody>
                              {EQUIPMENT_CHECKLIST_PER_TYPE['Hot Work Permit'].items.map((item) => {
                                const isChecked = checkIsItemChecked(item.label)
                                return (
                                  <tr key={item.id}>
                                    <td>{item.label}</td>
                                    <td className="text-center">{isChecked ? '☑' : '☐'}</td>
                                    <td className="text-center">{!isChecked ? '☑' : '☐'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Column 2: Confined Space Permit (Yellow Header) */}
                    {columnsToShow.includes('CONFINED') && (
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="bg-[#eab308] text-slate-900 text-center font-bold py-1 uppercase border-b border-slate-900">
                            Confined Space Permit
                          </div>
                          <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                            <div>- Pekerjaan Tangki</div>
                            <div>- Chute</div>
                            <div>- Sewer / Saluran air</div>
                          </div>
                          <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                            Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                          </div>
                          <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                            <thead>
                              <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                                <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                              </tr>
                            </thead>
                            <tbody>
                              {EQUIPMENT_CHECKLIST_PER_TYPE['Confined Space Permit'].items.map((item) => {
                                const isChecked = checkIsItemChecked(item.label)
                                return (
                                  <tr key={item.id}>
                                    <td>{item.label}</td>
                                    <td className="text-center">{isChecked ? '☑' : '☐'}</td>
                                    <td className="text-center">{!isChecked ? '☑' : '☐'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Column 3: Digging Permit (Green Header) */}
                    {columnsToShow.includes('DIGGING') && (
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="bg-[#84cc16] text-slate-900 text-center font-bold py-1 uppercase border-b border-slate-900">
                            Digging Permit
                          </div>
                          <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                            <div>- Penggalian parit</div>
                            <div>- Pembuatan pondasi</div>
                            <div>- Penggalian jalur kabel listrik/telepon</div>
                            <div>- Penggalian jalur pipa air</div>
                          </div>
                          <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                            Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                          </div>
                          <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                            <thead>
                              <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                                <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                              </tr>
                            </thead>
                            <tbody>
                              {EQUIPMENT_CHECKLIST_PER_TYPE['Digging Permit'].items.map((item) => {
                                const isChecked = checkIsItemChecked(item.label)
                                return (
                                  <tr key={item.id}>
                                    <td>{item.label}</td>
                                    <td className="text-center">{isChecked ? '☑' : '☐'}</td>
                                    <td className="text-center">{!isChecked ? '☑' : '☐'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Column 4: Cold Work Permit (Cyan Header) */}
                    {columnsToShow.includes('COLD') && (
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="bg-[#06b6d4] text-white text-center font-bold py-1 uppercase border-b border-slate-900">
                            Cold Work Permit
                          </div>
                          <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                            <div>- Pekerjaan Perbaikan Sipil</div>
                            <div>- Inspeksi & Maintenance Umum</div>
                            <div>- Penataan & Kebersihan Area</div>
                          </div>
                          <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                            Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                          </div>
                          <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                            <thead>
                              <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                                <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                              </tr>
                            </thead>
                            <tbody>
                              {EQUIPMENT_CHECKLIST_PER_TYPE['Cold Permit'].items.map((item) => {
                                const isChecked = checkIsItemChecked(item.label)
                                return (
                                  <tr key={item.id}>
                                    <td>{item.label}</td>
                                    <td className="text-center">{isChecked ? '☑' : '☐'}</td>
                                    <td className="text-center">{!isChecked ? '☑' : '☐'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Column 5: Electrical / Mechanical Permit (Blue Header) */}
                    {columnsToShow.includes('ELECTRICAL') && (
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="bg-[#3b82f6] text-white text-center font-bold py-1 uppercase border-b border-slate-900">
                            Electrical / Mechanical Permit
                          </div>
                          <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                            <div>- Perbaikan Drainase & Kabel</div>
                            <div>- Pembuatan pondasi & Pompa</div>
                            <div>- Maintenance / LOTO Boiler</div>
                          </div>
                          <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                            Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.
                          </div>
                          <table className="w-full text-left border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-1 [&_td]:py-0.5 text-[7pt]">
                            <thead>
                              <tr className="bg-slate-100 text-[6.5pt] text-center font-bold">
                                <th className="w-[70%] border border-slate-300 px-1 py-0.5">Item Check</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Ya</th>
                                <th className="w-[15%] border border-slate-300 px-1 py-0.5">Tidak</th>
                              </tr>
                            </thead>
                            <tbody>
                              {EQUIPMENT_CHECKLIST_PER_TYPE['Electrical/Mechanical'].items.map((item) => {
                                const isChecked = checkIsItemChecked(item.label)
                                return (
                                  <tr key={item.id}>
                                    <td>{item.label}</td>
                                    <td className="text-center">{isChecked ? '☑' : '☐'}</td>
                                    <td className="text-center">{!isChecked ? '☑' : '☐'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── ALAT PELINDUNG DIRI (APD) WAJIB ── */}
              <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-slate-50/80">
                <span className="font-bold block text-[7.5pt] text-slate-900">ALAT PELINDUNG DIRI (APD) WAJIB :</span>
                <div className="flex flex-wrap gap-1.5 mt-1 font-semibold text-slate-800">
                  {ppe && ppe.length > 0 ? (
                    ppe.map((apd) => (
                      <span key={apd} className="inline-block bg-white border border-slate-400 rounded px-2 py-0.5 text-[7.5pt] shadow-2xs">
                        ☑ {apd}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">Standard K3 APD (Helmet, Safety Shoes, Glasses)</span>
                  )}
                </div>
              </div>

              {/* ── 3 KOLOM CATATAN VERIFIKASI & QR CODE ── */}
              <div className="grid grid-cols-12 border-b-2 border-slate-900 bg-slate-50/90 text-[8pt] items-stretch min-h-[75px] divide-x divide-slate-900">
                {/* 1. Catatan Pelaksana Pekerjaan */}
                <div className="col-span-3 p-2 flex flex-col justify-between border-slate-900">
                  <div>
                    <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
                      CATATAN PELAKSANA PEKERJAAN
                    </span>
                    <div className="text-[7pt] text-slate-700 leading-snug break-words">
                      {(step1?.id ? stepRemarks[step1.id] : undefined) || step1?.remarks || (
                        <span className="text-slate-400 italic text-[6.5pt]">Wajib ikuti SOP K3 lokasi kerja.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Catatan Pemberi Kerja */}
                <div className="col-span-3 p-2 flex flex-col justify-between border-slate-900">
                  <div>
                    <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
                      CATATAN PEMBERI KERJA
                    </span>
                    <div className="text-[7pt] text-slate-700 leading-snug break-words">
                      {(step2?.id ? stepRemarks[step2.id] : undefined) || step2?.remarks || (
                        <span className="text-slate-400 italic text-[6.5pt]">Area kerja aman & barikade terpasang.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Catatan Safety Dept */}
                <div className="col-span-3 p-2 flex flex-col justify-between border-slate-900">
                  <div>
                    <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
                      CATATAN SAFETY DEPT
                    </span>
                    <div className="text-[7pt] text-slate-700 leading-snug break-words">
                      {(step3?.id ? stepRemarks[step3.id] : undefined) || step3?.remarks || (
                        <span className="text-slate-400 italic text-[6.5pt]">Peralatan & APAR standby di lokasi.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. QR Code */}
                <div className="col-span-3 flex flex-col items-center justify-center p-1.5 border-slate-900 bg-white">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      origin ? `${origin}/review/ptw/${data.permitNumber}` : `https://hero.chitraparatama.com/review/ptw/${data.permitNumber}`
                    )}`}
                    alt="QR Code Lampiran PTW"
                    className="size-12 object-contain border border-slate-900 p-0.5 bg-white rounded"
                  />
                  <span className="text-[6pt] font-bold text-slate-900 mt-0.5 uppercase text-center">Scan QR Lampiran</span>
                </div>
              </div>

              {/* ── MASA BERLAKU IKB ── */}
              <div className="border-b-2 border-slate-900 text-[8pt]">
                <div className="bg-slate-100 text-center font-bold uppercase py-0.5 border-b border-slate-900 text-[8pt]">
                  MASA BERLAKU IKB (IJIN KERJA BERBAHAYA)
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-900">
                  <div className="grid grid-cols-2 divide-x divide-slate-900 border-r border-slate-900">
                    <div className="p-1 text-center">
                      <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL MULAI</span>
                      <span className="font-semibold">{startDate || '—'}</span>
                    </div>
                    <div className="p-1 text-center">
                      <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU MULAI</span>
                      <span className="font-semibold">{startTime || '08:00'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-900">
                    <div className="p-1 text-center">
                      <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL BERAKHIR</span>
                      <span className="font-semibold">{endDate || '—'}</span>
                    </div>
                    <div className="p-1 text-center">
                      <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU BERAKHIR</span>
                      <span className="font-semibold">{endTime || '17:00'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── VERIFIKASI & TANDA TANGAN (3 COLUMNS) ── */}
              <div className="grid grid-cols-3 divide-x-2 divide-slate-900 border-b-2 border-slate-900 text-[8pt]">
                <div className="p-1.5 text-center flex flex-col justify-between">
                  <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PELAKSANA PEKERJAAN</div>
                  <div className="h-14 flex flex-col items-center justify-center my-1">
                    {step1Sig || step1?.signatureDataUrl ? (
                      <img src={(step1Sig || step1?.signatureDataUrl) ?? ''} alt="TTD" className="max-h-10 object-contain" />
                    ) : null}
                    {step1?.status === 'rejected' ? (
                      <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak</span>
                    ) : step1?.status === 'reverted' ? (
                      <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan</span>
                    ) : step1?.status === 'approved' && !step1Sig && !step1?.signatureDataUrl ? (
                      <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui</span>
                    ) : !step1Sig && !step1?.signatureDataUrl ? (
                      <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
                    ) : null}
                  </div>
                  <div className="border-t border-slate-900 pt-1 font-bold">{selectedApplicant || step1?.approverName || 'NAMA & TANDA TANGAN'}</div>
                </div>

                <div className="p-1.5 text-center flex flex-col justify-between">
                  <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PEMBERI KERJA</div>
                  <div className="h-14 flex flex-col items-center justify-center my-1">
                    {step2?.status === 'rejected' ? (
                      <>
                        {(step2Sig || step2?.signatureDataUrl) && <img src={(step2Sig || step2?.signatureDataUrl) ?? ''} alt="TTD" className="max-h-8 object-contain" />}
                        <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak</span>
                      </>
                    ) : step2?.status === 'reverted' ? (
                      <>
                        {(step2Sig || step2?.signatureDataUrl) && <img src={(step2Sig || step2?.signatureDataUrl) ?? ''} alt="TTD" className="max-h-8 object-contain" />}
                        <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan</span>
                      </>
                    ) : (step2Sig || step2?.signatureDataUrl) ? (
                      <img src={(step2Sig || step2?.signatureDataUrl) ?? ''} alt="TTD" className="max-h-12 object-contain" />
                    ) : step2?.status === 'approved' ? (
                      <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui</span>
                    ) : (
                      <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
                    )}
                  </div>
                  <div className="border-t border-slate-900 pt-1 font-bold">{selectedFieldPic || step2?.approverName || 'NAMA & TANDA TANGAN'}</div>
                </div>

                <div className="p-1.5 text-center flex flex-col justify-between">
                  <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">VERIFIKASI (SAFETY DEPT)</div>
                  <div className="h-14 flex flex-col items-center justify-center my-1">
                    {step3?.status === 'rejected' ? (
                      <>
                        {(step3Sig || step3?.signatureDataUrl) && <img src={(step3Sig || step3?.signatureDataUrl) ?? ''} alt="TTD" className="max-h-8 object-contain" />}
                        <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak</span>
                      </>
                    ) : step3?.status === 'reverted' ? (
                      <>
                        {(step3Sig || step3?.signatureDataUrl) && <img src={(step3Sig || step3?.signatureDataUrl) ?? ''} alt="TTD" className="max-h-8 object-contain" />}
                        <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan</span>
                      </>
                    ) : (step3Sig || step3?.signatureDataUrl) ? (
                      <img src={(step3Sig || step3?.signatureDataUrl) ?? ''} alt="TTD" className="max-h-12 object-contain" />
                    ) : step3?.status === 'approved' ? (
                      <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui</span>
                    ) : (
                      <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
                    )}
                  </div>
                  <div className="border-t border-slate-900 pt-1 font-bold">{selectedAuthorized || step3?.approverName || 'NAMA & TANDA TANGAN'}</div>
                </div>
              </div>

              {/* ── CATATAN FOOTER ── */}
              <div className="p-2 text-[7pt] space-y-0.5 bg-slate-50 flex items-start justify-between">
                <div>
                  <span className="font-bold block text-slate-900">CATATAN :</span>
                  <div>1. Ijin kerja ini hanya berlaku untuk satu area kerja saja.</div>
                  <div>2. Ijin kerja ini selalu berada ditempat kerja</div>
                  <div>3. Dilarang melakukan pekerjaan sebelum ada ijin kerja</div>
                </div>
                <div className="text-right text-slate-500 font-mono text-[6.5pt] pt-1 shrink-0">
                  No. Form: CP-F-SHE-026 / P-HSE-SOP-031.00
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Confirmation Dialog for Reject / Revert */}
      <Dialog
        open={Boolean(confirmDialog?.isOpen)}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6 shadow-xl bg-white border border-slate-200">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl',
                  confirmDialog?.actionType === 'reject'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-amber-50 text-amber-600'
                )}
              >
                {confirmDialog?.actionType === 'reject' ? (
                  <XCircle className="size-5" />
                ) : (
                  <RotateCcw className="size-5" />
                )}
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                  {confirmDialog?.actionType === 'reject'
                    ? 'Apakah Anda yakin ingin menolak approval ini?'
                    : 'Apakah Anda yakin ingin mengembalikan approval ini?'}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
            <span className="font-semibold text-slate-700">Catatan tersimpan:</span>{' '}
            {confirmDialog && stepRemarks[confirmDialog.stepId] ? (
              <span>{stepRemarks[confirmDialog.stepId]}</span>
            ) : (
              <span className="italic text-slate-400">Tidak ada catatan tambahan.</span>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="text-xs rounded-xl h-9 px-4 font-semibold text-slate-600 border-slate-200"
              onClick={() => setConfirmDialog(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className={cn(
                'text-xs rounded-xl h-9 px-4 font-bold text-white shadow-sm',
                confirmDialog?.actionType === 'reject'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              )}
              onClick={() => {
                if (!confirmDialog) return
                const { actionType, stepId } = confirmDialog
                setConfirmDialog(null)
                if (actionType === 'reject') {
                  executeRejectStep(stepId)
                } else {
                  executeRevertStep(stepId)
                }
              }}
            >
              {confirmDialog?.actionType === 'reject' ? 'Ya, Tolak' : 'Ya, Kembalikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
