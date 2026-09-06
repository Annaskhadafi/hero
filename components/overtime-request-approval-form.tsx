'use client'

import { useState, useTransition, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SignatureCanvas from 'react-signature-canvas'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  XCircle,
  PenTool,
  RotateCcw,
  AlertTriangle,
  SendHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { downloadElementAsPdf } from '@/lib/pdf-download'

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
// Re-export SearchableSelect for overtime approval form
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EnterpriseFormGrid } from '@/components/ui/enterprise-table-kit'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import {
  saveOvertimeApprovalForm,
  submitOvertimeApprovalStepAction,
} from '@/app/dashboard/overtime-requests/actions'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import { SignatureFloatingWidget } from '@/components/signature-floating-widget'

type ApprovalStep = {
  id: number
  stepOrder: number
  stepLabel: string
  approverName: string
  approverRole: string
  approverEmployeeId?: number | null
  approverEmail?: string | null
  status: string
  signatureDataUrl: string | null
  remarks: string
  signedAt: Date | string | null
}

type Participant = {
  id?: number
  employeeId: number
  employeeName: string
  category: string
  shiftCode: string
  rosterType: string
}

type LineItem = {
  id?: number
  lineLabel: string
  lineDescription: string
  targetUnit: string
  estimatedMinutes: number
  plannedPoints: number
  sortOrder: number
}

type OvertimeApprovalData = {
  documentId: number
  splNumber: string
  title: string
  workDate: Date | string
  plannedStartAt: Date | string | null
  plannedEndAt: Date | string | null
  status: string
  requestNotes: string
  executionNotes: string
  origin: string
  requestedByEmployeeId?: number | null
  requesterName: string
  requesterDepartment: string
  requesterJobTitle: string
  participants: Participant[]
  lineItems: LineItem[]
  approvals: ApprovalStep[]
  permissions: {
    canApprove: boolean
    canEdit: boolean
    isRequester: boolean
    currentEmployeeId?: number | null
    currentEmployeeEmail?: string | null
    currentEmployeeName?: string | null
    accessRole?: string
  }
}

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

function fmtDate(v: Date | string | null | undefined) {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

export function OvertimeRequestApprovalForm({
  data,
  employees: employeesProp = [],
}: {
  data: OvertimeApprovalData
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
  const [registeredSignature, setRegisteredSignature] = useState<string | null>(null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)

  useEffect(() => {
    getUserSignatureAction().then((res) => {
      if (res.success && res.signatureDataUrl) {
        setRegisteredSignature(res.signatureDataUrl)
        setPreviewSig(res.signatureDataUrl)
        setPreviewSignedAt(new Date())
      }
    })
  }, [])

  const [activeStepId, setActiveStepId] = useState<number>(() => {
    const pending = (data?.approvals || []).find((a) => a?.status === 'pending')
    const waitingAfterApproved = (data?.approvals || []).find((a) => (a?.status === 'waiting' || a?.status === 'pending') && a?.stepOrder > 1)
    const firstUnapproved = (data?.approvals || []).find((a) => a?.status !== 'approved')
    return pending ? pending.id : waitingAfterApproved ? waitingAfterApproved.id : firstUnapproved ? firstUnapproved.id : (data?.approvals?.[0]?.id ?? 1)
  })
  const [stepRemarks, setStepRemarks] = useState<Record<number, string>>({})

  // Editable SPL Fields
  const [title, setTitle] = useState(data.title || '')
  const [workDate, setWorkDate] = useState(formatDateInput(data.workDate) || new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(formatDateInput(data.plannedStartAt) || formatDateInput(data.workDate))
  const [startTime, setStartTime] = useState(formatTimeInput(data.plannedStartAt) || '17:00')
  const [endDate, setEndDate] = useState(formatDateInput(data.plannedEndAt) || formatDateInput(data.workDate))
  const [endTime, setEndTime] = useState(formatTimeInput(data.plannedEndAt) || '21:00')
  const [status, setStatus] = useState(data.status || 'Submitted')
  const [requestNotes, setRequestNotes] = useState(data.requestNotes || '')

  // Editable Participants List
  const [participants, setParticipants] = useState<Participant[]>(data.participants || [])
  const [selectedAddWorkerId, setSelectedAddWorkerId] = useState<string>('')

  // Editable Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    data.lineItems && data.lineItems.length > 0
      ? data.lineItems
      : [
          {
            id: 1,
            lineLabel: 'Tyre inspection dan pressure check',
            lineDescription: 'Inspeksi berkala dan kalibrasi tekanan angin ban unit dump truck.',
            targetUnit: '4 Unit',
            estimatedMinutes: 60,
            plannedPoints: 10,
            sortOrder: 1,
          },
        ]
  )

  // Recommendation & Signatories state
  const [recommendation, setRecommendation] = useState<string>('approve')
  const [contractExtendedMonths, setContractExtendedMonths] = useState<string>('6')

  const initialRequester = data.approvals.find((a) => a.approverRole === 'employee' || a.approverRole === 'requester')
  const initialLeader = data.approvals.find((a) => a.approverRole === 'leader' || a.approverRole === 'pjo_or_te_initial')
  const initialSectionHead = data.approvals.find((a) => a.approverRole === 'section_head' || a.approverRole === 'section_head_confirmation')
  const initialManager = data.approvals.find((a) => a.approverRole === 'manager' || a.approverRole === 'department_head')

  const [selectedRequesterId, setSelectedRequesterId] = useState<string>(() => {
    if (data.requestedByEmployeeId) return String(data.requestedByEmployeeId)
    const matched = employeesProp.find((e) => e.name === data.requesterName || e.name === initialRequester?.approverName)
    return matched ? String(matched.id) : ''
  })
  const [requesterTitle, setRequesterTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedRequesterId || e.name === data.requesterName)
    return matched?.jobTitle || matched?.rank || matched?.position || data.requesterJobTitle || 'Serviceman'
  })

  const [selectedLeaderId, setSelectedLeaderId] = useState<string>(() => {
    if (initialLeader?.approverEmployeeId) return String(initialLeader.approverEmployeeId)
    const matched = employeesProp.find((e) => e.name === initialLeader?.approverName)
    return matched ? String(matched.id) : ''
  })
  const [leaderTitle, setLeaderTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedLeaderId || e.name === initialLeader?.approverName)
    return matched?.jobTitle || matched?.rank || matched?.position || 'Leader / Pengawas'
  })

  const [selectedSectionHeadId, setSelectedSectionHeadId] = useState<string>(() => {
    if (initialSectionHead?.approverEmployeeId) return String(initialSectionHead.approverEmployeeId)
    const matched = employeesProp.find((e) => e.name === initialSectionHead?.approverName)
    return matched ? String(matched.id) : ''
  })
  const [sectionHeadTitle, setSectionHeadTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedSectionHeadId || e.name === initialSectionHead?.approverName)
    return matched?.jobTitle || matched?.rank || matched?.position || 'Section Head'
  })

  const [selectedManagerId, setSelectedManagerId] = useState<string>(() => {
    if (initialManager?.approverEmployeeId) return String(initialManager.approverEmployeeId)
    const matched = employeesProp.find((e) => e.name === initialManager?.approverName)
    return matched ? String(matched.id) : ''
  })
  const [managerTitle, setManagerTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedManagerId || e.name === initialManager?.approverName)
    return matched?.jobTitle || matched?.rank || matched?.position || 'Department Head / Manager'
  })

  const isApproved = (data.status || '').toLowerCase() === 'approved'
  const isReverted = (data.status || '').toLowerCase() === 'reverted' || (data.status || '').toLowerCase() === 'needs_revision'
  const isRejected = (data.status || '').toLowerCase() === 'rejected'
  const isLocked = isApproved || isRejected

  const [activeView, setActiveView] = useState<'form' | 'preview'>('form')

  const handleAddWorker = () => {
    if (!selectedAddWorkerId) {
      toast.error('Pilih karyawan terlebih dahulu.')
      return
    }
    const emp = employeesProp.find((e) => String(e.id) === selectedAddWorkerId)
    if (!emp) return

    if (participants.some((p) => p.employeeId === emp.id)) {
      toast.error('Karyawan sudah ada di dalam daftar peserta lembur.')
      return
    }

    const newWorker: Participant = {
      employeeId: emp.id,
      employeeName: emp.name,
      category: 'after_mandatory_ot',
      shiftCode: 'DS',
      rosterType: '5:2',
    }

    setParticipants([...participants, newWorker])
    setSelectedAddWorkerId('')
    toast.success(`${emp.name} ditambahkan ke daftar lembur`)
  }

  const handleRemoveWorker = (empId: number) => {
    setParticipants(participants.filter((p) => p.employeeId !== empId))
  }

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: Date.now(),
      lineLabel: 'Pekerjaan Lembur Tambahan',
      lineDescription: '',
      targetUnit: '1 Unit',
      estimatedMinutes: 60,
      plannedPoints: 10,
      sortOrder: lineItems.length + 1,
    }
    setLineItems([...lineItems, newItem])
  }

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
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
      const plannedStartAt = startDate && startTime ? new Date(`${startDate}T${startTime}:00`) : null
      const plannedEndAt = endDate && endTime ? new Date(`${endDate}T${endTime}:00`) : null

      const selectedRequester = employeesProp.find((e) => String(e.id) === selectedRequesterId)
      const selectedLeader = employeesProp.find((e) => String(e.id) === selectedLeaderId)
      const selectedSectionHead = employeesProp.find((e) => String(e.id) === selectedSectionHeadId)
      const selectedManager = employeesProp.find((e) => String(e.id) === selectedManagerId)

      const res = await saveOvertimeApprovalForm({
        documentId: data.documentId,
        requestedByEmployeeId: selectedRequester ? selectedRequester.id : undefined,
        title,
        workDate,
        plannedStartAt,
        plannedEndAt,
        requestNotes,
        status,
        participants,
        lineItems,
        signatures: signaturesByStepId,
        stepRemarks,
        leaderName: selectedLeader?.name,
        superiorName: selectedSectionHead?.name,
        managerName: selectedManager?.name,
        signatories: [
          ...(initialRequester ? [{ id: initialRequester.id, stepOrder: initialRequester.stepOrder, name: selectedRequester?.name || data.requesterName, employeeId: selectedRequester?.id, email: selectedRequester?.email }] : []),
          ...(initialLeader ? [{ id: initialLeader.id, stepOrder: initialLeader.stepOrder, name: selectedLeader?.name, employeeId: selectedLeader?.id, email: selectedLeader?.email }] : []),
          ...(initialSectionHead ? [{ id: initialSectionHead.id, stepOrder: initialSectionHead.stepOrder, name: selectedSectionHead?.name, employeeId: selectedSectionHead?.id, email: selectedSectionHead?.email }] : []),
          ...(initialManager ? [{ id: initialManager.id, stepOrder: initialManager.stepOrder, name: selectedManager?.name, employeeId: selectedManager?.id, email: selectedManager?.email }] : []),
        ],
      })

      if (res.success) {
        toast.success('Surat Perintah Lembur (SPL) berhasil disimpan!')
        router.refresh()
      } else {
        toast.error('Gagal menyimpan: ' + (res.error || 'Terjadi kesalahan'))
      }
    })
  }

  const handleApproveStep = (stepId: number) => {
    startTransition(async () => {
      const signatureDataUrl = signaturesByStepId[stepId] || getCanvasSignatureDataUrl() || previewSig
      if (!signatureDataUrl) {
        toast.error('Tanda tangan digital wajib diisi.')
        return
      }

      const selectedLeader = employeesProp.find((e) => String(e.id) === selectedLeaderId)
      const selectedSectionHead = employeesProp.find((e) => String(e.id) === selectedSectionHeadId)
      const selectedManager = employeesProp.find((e) => String(e.id) === selectedManagerId)

      await saveOvertimeApprovalForm({
        documentId: data.documentId,
        participants,
        lineItems,
        requestNotes: data.requestNotes,
        leaderName: selectedLeader?.name || undefined,
        superiorName: selectedSectionHead?.name || undefined,
        managerName: selectedManager?.name || undefined,
      })

      const targetApproval = (data.approvals || []).find((a) => a.id === stepId) || (data.approvals || []).find((a) => a.stepOrder === stepId) || data.approvals?.[0]
      const actualStepId = targetApproval ? targetApproval.id : stepId

      const fd = new FormData()
      fd.set('sessionId', String(data.documentId))
      fd.set('approvalId', String(actualStepId))
      fd.set('action', 'approve')
      fd.set('signatureDataUrl', signatureDataUrl)
      fd.set('remarks', stepRemarks[stepId] || '')

      const res = await submitOvertimeApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success('Approval SPL berhasil disetujui & ditandatangani!')
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
      const targetApproval = (data.approvals || []).find((a) => a.id === stepId) || (data.approvals || []).find((a) => a.stepOrder === stepId) || data.approvals?.[0]
      const actualStepId = targetApproval ? targetApproval.id : stepId

      const fd = new FormData()
      fd.set('sessionId', String(data.documentId))
      fd.set('approvalId', String(actualStepId))
      fd.set('action', 'reject')
      fd.set('remarks', stepRemarks[stepId] || '')

      const res = await submitOvertimeApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success('SPL ditolak.')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal menolak approval.')
      }
    })
  }

  const executeRevertStep = (stepId: number) => {
    startTransition(async () => {
      const targetApproval = (data.approvals || []).find((a) => a.id === stepId) || (data.approvals || []).find((a) => a.stepOrder === stepId) || data.approvals?.[0]
      const actualStepId = targetApproval ? targetApproval.id : stepId

      const fd = new FormData()
      fd.set('sessionId', String(data.documentId))
      fd.set('approvalId', String(actualStepId))
      fd.set('action', 'revert')
      fd.set('remarks', stepRemarks[stepId] || 'SPL dikembalikan oleh Department Head untuk revisi.')

      const res = await submitOvertimeApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success(res.message || 'SPL berhasil dikembalikan untuk revisi.')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal mengembalikan SPL.')
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
    toast.loading('Menyiapkan file PDF...', { id: 'spl-form-dl' })
    try {
      const el = document.querySelector('.pdf-wrapper') as HTMLElement
      if (el) {
        await downloadElementAsPdf(el, `SPL_${data.splNumber.replace(/[\/\\]/g, '_')}.pdf`)
        toast.success('PDF berhasil diunduh!', { id: 'spl-form-dl' })
      } else {
        toast.error('Gagal menemukan template PDF', { id: 'spl-form-dl' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengunduh PDF', { id: 'spl-form-dl' })
    } finally {
      setIsDownloading(false)
    }
  }

  const approvalHistoryForDisplay = useMemo(() => {
    const selectedLeader = employeesProp.find((e) => String(e.id) === selectedLeaderId)
    const selectedSectionHead = employeesProp.find((e) => String(e.id) === selectedSectionHeadId)
    const selectedRequester = employeesProp.find((e) => String(e.id) === selectedRequesterId)

    const defaultSteps = [
      { stepOrder: 1, stepLabel: 'Karyawan Sign', approverRole: 'employee', id: initialRequester?.id || 1, status: initialRequester?.status || 'pending', approverName: selectedRequester?.name || initialRequester?.approverName || data.requesterName || 'Pemohon', signatureDataUrl: null, remarks: '', signedAt: null },
      { stepOrder: 2, stepLabel: 'Leader / Pengawas', approverRole: 'leader', id: initialLeader?.id || 2, status: initialLeader?.status || 'waiting', approverName: selectedLeader?.name || initialLeader?.approverName || 'Leader / Pengawas', signatureDataUrl: null, remarks: '', signedAt: null },
      { stepOrder: 3, stepLabel: 'Section Head', approverRole: 'section_head', id: initialSectionHead?.id || 3, status: initialSectionHead?.status || 'waiting', approverName: selectedSectionHead?.name || initialSectionHead?.approverName || 'Section Head', signatureDataUrl: null, remarks: '', signedAt: null },
    ]

    const merged = defaultSteps.map((def) => {
      const match = (data.approvals || []).find((a) => a.stepOrder === def.stepOrder || a.approverRole === def.approverRole)
      const dynamicName =
        (def.stepOrder === 1 && selectedRequester?.name) ||
        (def.stepOrder === 2 && selectedLeader?.name) ||
        (def.stepOrder === 3 && selectedSectionHead?.name)

      if (match) {
        return {
          ...def,
          ...match,
          id: match.id,
          approverName: dynamicName || match.approverName || def.approverName,
        }
      }
      return {
        ...def,
        approverName: dynamicName || def.approverName,
      }
    })

    return merged.map((step) => {
      const isApproved = step.status === 'approved'
      const isActivelySigning = activeStepId === step.id && Boolean(previewSig)
      const currentSig = isApproved
        ? (signaturesByStepId[step.id] || step.signatureDataUrl)
        : isActivelySigning
        ? previewSig
        : null
      const currentRemark = stepRemarks[step.id] !== undefined ? stepRemarks[step.id] : step.remarks
      const isCurrentActive = activeStepId === step.id

      return {
        ...step,
        status: step.status || 'waiting',
        signatureDataUrl: currentSig,
        remarks: currentRemark || step.remarks,
        signedAt: isApproved
          ? step.signedAt
          : isActivelySigning
          ? (previewSignedAt || new Date())
          : null,
      }
    })
  }, [data.approvals, activeStepId, previewSig, previewSignedAt, stepRemarks, signaturesByStepId, selectedRequesterId, selectedLeaderId, selectedSectionHeadId, employeesProp, initialRequester, initialLeader, initialSectionHead, data.requesterName])

  const currentEmpId = data.permissions.currentEmployeeId
  const currentEmpEmail = (data.permissions.currentEmployeeEmail || '').toLowerCase().trim()
  const currentEmpName = (data.permissions.currentEmployeeName || '').toLowerCase().trim()

  const activeStep = approvalHistoryForDisplay.find((a) => a.id === activeStepId) || approvalHistoryForDisplay.find((a) => a.status === 'pending') || approvalHistoryForDisplay.find((a) => (a.status === 'waiting' || a.status === 'pending') && a.stepOrder > 1) || approvalHistoryForDisplay.find((a) => a.status !== 'approved') || approvalHistoryForDisplay[0]

  // STRICT IDENTITY CHECK: Only true if logged in user is the designated approver for the active step
  const isMyTurn = Boolean(
    activeStep &&
      (activeStep.status === 'pending' || activeStep.status === 'preview' || activeStep.status === 'waiting') &&
      ((activeStep.approverEmployeeId != null && activeStep.approverEmployeeId === currentEmpId) ||
        (Boolean(activeStep.approverEmail) &&
          activeStep.approverEmail?.toLowerCase().trim() === currentEmpEmail) ||
        (Boolean(activeStep.approverName) &&
          activeStep.approverName?.toLowerCase().trim() === currentEmpName))
  )

  const isStepActionable = isMyTurn
  const activeSignerName = isMyTurn
    ? (currentEmpName ? data.permissions.currentEmployeeName : activeStep?.approverName)
    : (activeStep?.approverName || 'Approver')

  const employeeSig = approvalHistoryForDisplay[0]
  const leaderSig = approvalHistoryForDisplay[1]
  const sectionHeadSig = approvalHistoryForDisplay[2]

  const employeeSigImage = (employeeSig?.status === 'approved' || employeeSig?.status === 'signed' || employeeSig?.status === 'completed')
    ? (signaturesByStepId[employeeSig?.id || 1] || employeeSig?.signatureDataUrl || null)
    : (isMyTurn && activeStepId === employeeSig?.id && previewSig ? previewSig : null)

  const leaderSigImage = leaderSig?.status === 'approved'
    ? (signaturesByStepId[leaderSig?.id || 2] || leaderSig?.signatureDataUrl || null)
    : (isMyTurn && activeStepId === leaderSig?.id && previewSig ? previewSig : null)

  const sectionHeadSigImage = sectionHeadSig?.status === 'approved'
    ? (signaturesByStepId[sectionHeadSig?.id || 3] || sectionHeadSig?.signatureDataUrl || null)
    : (isMyTurn && activeStepId === sectionHeadSig?.id && previewSig ? previewSig : null)

  function renderApprovalMeta(step: any) {
    if (!step?.signedAt) return null
    return (
      <div className="mt-1 space-y-0.5 text-[7pt] text-slate-500">
        {step?.signedAt && <div>Waktu TTD: {fmtDt(step.signedAt)}</div>}
      </div>
    )
  }

  return (
    <AdminPageShell
      eyebrow="HC • Form"
      title="Overtime Request (SPL) Review"
      description="Evaluasi Surat Perintah Lembur dan tanda tangan verifikasi bertingkat."
    >
      <div className="space-y-4">
        {/* Mobile/Tablet View Toggle */}
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
          {/* ── LEFT: Form Input ── */}
          <div className={cn('flex flex-col gap-6 print:hidden', activeView === 'preview' ? 'hidden xl:flex' : 'flex')}>
            {/* Status Alert Banners */}
            {isApproved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 flex items-start gap-3 shadow-xs">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm text-emerald-950">Dokumen Telah Disetujui Penuh (Approved)</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Surat Perintah Lembur ini telah disetujui lengkap oleh seluruh approver dan statusnya terkunci (final). Rincian peserta, jam lembur, dan tanda tangan tidak dapat diubah.
                  </p>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-start gap-3 shadow-xs">
                <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm text-rose-900">Dokumen ini telah ditolak (Rejected)</p>
                  <p className="text-xs text-rose-700 mt-0.5">Dokumen yang sudah di-reject tidak dapat diedit atau diajukan ulang. Silakan buat pengajuan lembur baru.</p>
                </div>
                <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0">
                  <Link href="/dashboard/overtime-requests">Buat Pengajuan Baru</Link>
                </Button>
              </div>
            )}

            {isReverted && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 flex items-start gap-3 shadow-xs">
                <RotateCcw className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-amber-900">Dokumen ini dikembalikan untuk revisi (Reverted)</p>
                  <p className="text-xs text-amber-700 mt-0.5">Silakan perbaiki data peserta atau jam lembur yang diperlukan, lalu klik <strong>"Kirim Ulang"</strong> untuk meneruskan kembali ke atasan yang meminta revisi.</p>
                </div>
              </div>
            )}

            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/overtime-requests">
                  <ArrowLeft className="mr-2 size-4" /> Kembali
                </Link>
              </Button>
              <Button onClick={handleDownloadPdf} disabled={isDownloading} variant="secondary" className="gap-2">
                <Download className="size-4" /> {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
              </Button>
              {!isLocked && (
                <Button
                  onClick={handleSaveForm}
                  disabled={isPending}
                  className={cn(
                    'ml-auto font-bold text-white',
                    isReverted ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                  )}
                >
                  {isReverted ? (
                    <>
                      <SendHorizontal className="mr-2 size-4" /> {isPending ? 'Mengirim Ulang...' : 'Kirim Ulang'}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" /> {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* ── CARD 1: DETAILS & PROFILE ── */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900">Details & Profile</CardTitle>
                  <Badge variant="outline" className={cn("capitalize text-xs font-semibold", isApproved && "bg-emerald-50 text-emerald-700 border-emerald-300")}>{status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 text-xs pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">SPL Number</Label>
                  <Input value={data.splNumber} disabled className="bg-slate-50 font-mono font-semibold h-10 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tanggal Pekerjaan (Work Date)</Label>
                  <Input
                    type="date"
                    value={workDate}
                    disabled={isLocked}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className={cn("h-10 text-xs font-medium", isLocked ? "bg-slate-50 text-slate-600 cursor-not-allowed border-slate-200" : "bg-slate-50/70 border-slate-200")}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Judul / Keperluan Lembur (Title)</Label>
                  <Input
                    value={title}
                    disabled={isLocked}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Overtime Emergency Tire Repair Dump Body"
                    className={cn("h-10 text-xs font-medium", isLocked ? "bg-slate-50 text-slate-600 cursor-not-allowed border-slate-200" : "bg-slate-50/70 border-slate-200")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Requester (Pemohon)</Label>
                  <Input value={data.requesterName} disabled className="bg-slate-50 h-10 text-xs font-medium" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Department</Label>
                  <Input value={data.requesterDepartment || 'Central Services'} disabled className="bg-slate-50 h-10 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Planned Start (Tgl & Jam Mulai)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      disabled={isLocked}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={cn("h-10 text-xs w-2/3", isLocked ? "bg-slate-50 text-slate-600 cursor-not-allowed border-slate-200" : "bg-slate-50/70 border-slate-200")}
                    />
                    <Input
                      type="time"
                      value={startTime}
                      disabled={isLocked}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={cn("h-10 text-xs w-1/3", isLocked ? "bg-slate-50 text-slate-600 cursor-not-allowed border-slate-200" : "bg-slate-50/70 border-slate-200")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Planned End (Tgl & Jam Selesai)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={endDate}
                      disabled={isLocked}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={cn("h-10 text-xs w-2/3", isLocked ? "bg-slate-50 text-slate-600 cursor-not-allowed border-slate-200" : "bg-slate-50/70 border-slate-200")}
                    />
                    <Input
                      type="time"
                      value={endTime}
                      disabled={isLocked}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={cn("h-10 text-xs w-1/3", isLocked ? "bg-slate-50 text-slate-600 cursor-not-allowed border-slate-200" : "bg-slate-50/70 border-slate-200")}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Catatan Khusus / Request Notes</Label>
                  <Textarea
                    rows={2}
                    value={requestNotes}
                    disabled={isLocked}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="Instruksi keselamatan, nomor SPK terkait, atau catatan operasional..."
                    className={cn("text-xs", isLocked ? "bg-slate-50 text-slate-600 cursor-not-allowed border-slate-200" : "bg-slate-50/70 border-slate-200")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── CARD 2: A. WORKERS (PESERTA LEMBUR) — PDF TABLE MATCHED ── */}
            <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">A. Workers (Peserta Lembur)</CardTitle>
                    <CardDescription className="text-xs">
                      Daftar teknisi & peserta lembur (format sesuai tabel PDF).
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                    {participants.length} Orang
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Worker Selector Header */}
                {!isLocked && (
                  <div className="p-3 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
                    <SearchableSelect
                      label="Tambah Peserta"
                      placeholder="PILIH KARYAWAN UNTUK DITAMBAHKAN..."
                      value={selectedAddWorkerId}
                      onValueChange={(val) => setSelectedAddWorkerId(val)}
                      options={employeesProp.map((e) => ({
                        value: String(e.id),
                        label: `${e.name} (${e.employeeSn || e.employeeId || '-'}) — ${e.jobTitle || e.department || 'Technician'}`,
                      }))}
                      widthClassName="w-full"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddWorker}
                      className="h-9 text-xs font-bold gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                    >
                      <UserPlus className="size-3.5" /> TAMBAH
                    </Button>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-bold">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Name (Nama Karyawan)</th>
                        <th className="py-2.5 px-2.5 w-24 text-center">Shift</th>
                        <th className="py-2.5 px-2.5 w-24 text-center">Roster</th>
                        <th className="py-2.5 px-3 min-w-[160px]">Category</th>
                        {!isLocked && <th className="py-2.5 px-2 w-10 text-center"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {participants.length > 0 ? (
                        participants.map((p, idx) => (
                          <tr key={p.id ? `spl-participant-${p.id}` : `spl-p-${p.employeeId ?? 'anon'}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{p.employeeName}</td>
                            <td className="py-2 px-2.5">
                              <select
                                value={p.shiftCode}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const newP = [...participants]
                                  newP[idx].shiftCode = e.target.value
                                  setParticipants(newP)
                                }}
                                className={cn("w-full h-8 text-xs font-semibold border rounded-md px-2 text-center", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-200")}
                              >
                                <option value="DS">DS (Day)</option>
                                <option value="NS">NS (Night)</option>
                                <option value="OFF">OFF Day</option>
                              </select>
                            </td>
                            <td className="py-2 px-2.5">
                              <select
                                value={p.rosterType}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const newP = [...participants]
                                  newP[idx].rosterType = e.target.value
                                  setParticipants(newP)
                                }}
                                className={cn("w-full h-8 text-xs font-semibold border rounded-md px-2 text-center", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-200")}
                              >
                                <option value="5:2">5:2</option>
                                <option value="6:1">6:1</option>
                                <option value="10:2">10:2</option>
                                <option value="12:1">12:1</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={p.category}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const newP = [...participants]
                                  newP[idx].category = e.target.value
                                  setParticipants(newP)
                                }}
                                className={cn("w-full h-8 text-xs font-semibold border rounded-md px-2 capitalize", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-200")}
                              >
                                <option value="after_mandatory_ot">After Mandatory OT</option>
                                <option value="off_day_ot">Off Day OT</option>
                                <option value="emergency_callout">Emergency Callout</option>
                              </select>
                            </td>
                            {!isLocked && (
                              <td className="py-2 px-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveWorker(p.employeeId)}
                                  className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isLocked ? 5 : 6} className="py-6 text-center text-xs text-slate-400">
                            Belum ada peserta lembur.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ── CARD 3: B. LINE ITEMS (AKTIVITAS PEKERJAAN) — PDF TABLE MATCHED ── */}
            <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">B. Line Items (Aktivitas Pekerjaan)</CardTitle>
                    <CardDescription className="text-xs">
                      Rincian aktivitas lembur & target unit (format sesuai tabel PDF).
                    </CardDescription>
                  </div>
                  {!isLocked && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddLineItem}
                      className="h-8 text-xs font-semibold gap-1.5 bg-white border-slate-300 hover:bg-slate-50 shadow-2xs"
                    >
                      <Plus className="size-3.5" /> Tambah Aktivitas
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-bold">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Activity (Aktivitas)</th>
                        <th className="py-2.5 px-2.5 w-28 text-center">Target</th>
                        <th className="py-2.5 px-2.5 w-24 text-center">Minutes</th>
                        <th className="py-2.5 px-2.5 w-20 text-center">Points</th>
                        {!isLocked && <th className="py-2.5 px-2 w-10 text-center"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.length > 0 ? (
                        lineItems.map((item, idx) => (
                          <tr key={item.id ? `spl-item-${item.id}` : `spl-it-${item.employeeId ?? 'anon'}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <Input
                                value={item.lineLabel}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const newItems = [...lineItems]
                                  newItems[idx].lineLabel = e.target.value
                                  setLineItems(newItems)
                                }}
                                placeholder="Nama aktivitas..."
                                className={cn("h-8 text-xs font-medium", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-200")}
                              />
                            </td>
                            <td className="py-2 px-2.5">
                              <Input
                                value={item.targetUnit || ''}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const newItems = [...lineItems]
                                  newItems[idx].targetUnit = e.target.value
                                  setLineItems(newItems)
                                }}
                                placeholder="4 Unit / -"
                                className={cn("h-8 text-xs text-center font-mono", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-200")}
                              />
                            </td>
                            <td className="py-2 px-2.5">
                              <Input
                                type="number"
                                value={item.estimatedMinutes}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const newItems = [...lineItems]
                                  newItems[idx].estimatedMinutes = Number(e.target.value) || 0
                                  setLineItems(newItems)
                                }}
                                placeholder="60"
                                className={cn("h-8 text-xs text-center font-medium", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-200")}
                              />
                            </td>
                            <td className="py-2 px-2.5">
                              <Input
                                type="number"
                                value={item.plannedPoints}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const newItems = [...lineItems]
                                  newItems[idx].plannedPoints = Number(e.target.value) || 0
                                  setLineItems(newItems)
                                }}
                                placeholder="10"
                                className={cn("h-8 text-xs text-center font-bold", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-200 text-slate-800")}
                              />
                            </td>
                            {!isLocked && (
                              <td className="py-2 px-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveLineItem(idx)}
                                  className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isLocked ? 5 : 6} className="py-6 text-center text-xs text-slate-400">
                            Belum ada aktivitas lembur. Klik <span className="font-semibold text-slate-700">"Tambah Aktivitas"</span>.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ── CARD 4: STATUS APPROVAL ── */}
            <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800">Status Approval</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-4">
                {approvalHistoryForDisplay.map((step, idx) => {
                  return (
                    <div
                      key={`spl-status-step-${step.id || step.stepOrder}-${step.approverRole || 'role'}-${idx}`}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border p-4 bg-white transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] border-slate-200/80'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{step.approverName || 'Approver'}</p>
                        <p className="text-xs text-slate-400">{step.stepLabel}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {step.status === 'approved' ? (
                          <Badge className="bg-emerald-50 text-emerald-600 rounded-full border-0 px-3 py-1 font-bold text-[10px] tracking-wide">
                            DISETUJUI
                          </Badge>
                        ) : (step.status === 'pending' || activeStep?.id === step.id) && step.status !== 'approved' ? (
                          <Badge className="bg-amber-50 text-amber-600 rounded-full border-0 px-3 py-1 font-bold text-[10px] tracking-wide animate-pulse">
                            GILIRAN ANDA
                          </Badge>
                        ) : step.status === 'reverted' ? (
                          <Badge className="bg-amber-50 text-amber-700 rounded-full border-0 px-3 py-1 font-bold text-[10px] tracking-wide">
                            DIKEMBALIKAN
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

            {/* ── CARD 5: SIGNATORIES (DAILY ACTIVITY PARITY) ── */}
            <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold">Signatories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1: Serviceman / Karyawan */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Serviceman / Karyawan</Label>
                    <SearchableSelect
                      label="Serviceman"
                      placeholder="PILIH SERVICEMAN..."
                      disabled={isLocked}
                      value={selectedRequesterId}
                      onValueChange={(val) => {
                        setSelectedRequesterId(val)
                        const matched = employeesProp.find((e) => String(e.id) === val)
                        if (matched) {
                          setRequesterTitle(matched.jobTitle || matched.rank || matched.position || 'Serviceman')
                        }
                      }}
                      options={employeesProp.map((emp) => ({
                        value: String(emp.id),
                        label: `${emp.name} - ${emp.jobTitle || emp.rank || 'Serviceman'}`,
                      }))}
                      widthClassName="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Job Title</Label>
                    <Input
                      value={requesterTitle}
                      disabled={isLocked}
                      onChange={(e) => setRequesterTitle(e.target.value)}
                      placeholder="Serviceman"
                      className={cn("h-10 text-xs", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-slate-50/60 border-slate-200")}
                    />
                  </div>

                  {/* Row 2: Leader / Pengawas */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Leader / Pengawas Name</Label>
                    <SearchableSelect
                      label="Leader"
                      placeholder="PILIH LEADER / PENGAWAS..."
                      disabled={isLocked}
                      value={selectedLeaderId}
                      onValueChange={(val) => {
                        setSelectedLeaderId(val)
                        const matched = employeesProp.find((e) => String(e.id) === val)
                        if (matched) {
                          setLeaderTitle(matched.jobTitle || matched.rank || matched.position || 'Leader / Pengawas')
                        }
                      }}
                      options={employeesProp.map((emp) => ({
                        value: String(emp.id),
                        label: `${emp.name} - ${emp.jobTitle || emp.rank || 'Leader'}`,
                      }))}
                      widthClassName="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Leader Title</Label>
                    <Input
                      value={leaderTitle}
                      disabled={isLocked}
                      onChange={(e) => setLeaderTitle(e.target.value)}
                      placeholder="Leader / Pengawas"
                      className={cn("h-10 text-xs", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-slate-50/60 border-slate-200")}
                    />
                  </div>

                  {/* Row 3: Section Head */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Section Head Name</Label>
                    <SearchableSelect
                      label="Section Head"
                      placeholder="PILIH SECTION HEAD..."
                      disabled={isLocked}
                      value={selectedSectionHeadId}
                      onValueChange={(val) => {
                        setSelectedSectionHeadId(val)
                        const matched = employeesProp.find((e) => String(e.id) === val)
                        if (matched) {
                          setSectionHeadTitle(matched.jobTitle || matched.rank || matched.position || 'Section Head')
                        }
                      }}
                      options={employeesProp.map((emp) => ({
                        value: String(emp.id),
                        label: `${emp.name} - ${emp.jobTitle || emp.rank || 'Section Head'}`,
                      }))}
                      widthClassName="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Section Head Title</Label>
                    <Input
                      value={sectionHeadTitle}
                      disabled={isLocked}
                      onChange={(e) => setSectionHeadTitle(e.target.value)}
                      placeholder="Section Head"
                      className={cn("h-10 text-xs", isLocked ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-slate-50/60 border-slate-200")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── CARD 6: TANDA TANGAN ELEKTRONIK ── */}
            <Card className={cn("rounded-[1.2rem] shadow-sm ring-1", isMyTurn && !isLocked ? "ring-amber-300/80 bg-white" : "ring-slate-200/70 bg-slate-50/40")}>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      {isApproved ? 'Status Persetujuan (Selesai)' : isMyTurn ? `TTD Digital - ${activeSignerName}` : `Status Persetujuan - ${activeStep?.approverName || 'Approver'}`}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {isApproved ? 'Seluruh tahapan persetujuan telah disetujui (Approved).' : `Tahap: ${activeStep?.stepLabel || '-'} (${activeStep?.approverName || 'Approver'})`}
                    </CardDescription>
                  </div>
                  {isApproved ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full px-3 py-1 font-bold text-[10px]">
                      DISETUJUI (TERKUNCI)
                    </Badge>
                  ) : activeStep?.status === 'approved' ? (
                    <Badge className="bg-emerald-50 text-emerald-600 rounded-full border-0 px-3 py-1 font-bold text-[10px]">
                      DISETUJUI
                    </Badge>
                  ) : isMyTurn ? (
                    <Badge className="bg-amber-500 text-white rounded-full border-0 px-3 py-1 font-bold text-[10px] shadow-xs animate-pulse">
                      GILIRAN ANDA
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 border-slate-300 bg-white rounded-full px-3 py-1 font-bold text-[10px]">
                      MENUNGGU APPROVER
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {isApproved ? (
                  <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 p-4 text-xs text-emerald-900 font-semibold flex items-center gap-3 shadow-xs">
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-950">Dokumen Telah Disetujui Lengkap (Approved)</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Seluruh tanda tangan digital dan data SPL telah terverifikasi secara sah. Dokumen ini terkunci dan tidak dapat diubah lagi.
                      </p>
                    </div>
                  </div>
                ) : activeStep?.status === 'approved' ? (
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/70 p-4 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    Tahap ini telah disetujui oleh {activeStep.approverName || 'Approver'}.
                  </div>
                ) : isMyTurn ? (
                  <>
                    {/* Auto-Sign Digital Signature Indicator */}
                    {registeredSignature ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-24 items-center justify-center rounded-lg border border-slate-200/80 bg-white p-1.5 shadow-inner">
                            <img src={registeredSignature} alt="Tanda Tangan Saya" className="max-h-11 max-w-full object-contain" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Tanda Tangan Digital Anda</p>
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

                    {/* Catatan Approval (Opsional) */}
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs font-semibold text-slate-700">Catatan Approval (Opsional)</Label>
                      <Textarea
                        placeholder="Tuliskan catatan atau rekomendasi khusus..."
                        rows={2}
                        value={activeStep?.id ? stepRemarks[activeStep.id] || '' : ''}
                        onChange={(e) => {
                          if (activeStep?.id) {
                            setStepRemarks((prev) => ({ ...prev, [activeStep.id]: e.target.value }))
                          }
                        }}
                        className="bg-slate-50 border-slate-200 text-xs resize-none rounded-xl"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {/* Tombol Reject */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs uppercase px-4 py-2"
                        onClick={() => {
                          const id = activeStep?.id || activeStepId
                          if (id) handleRejectStep(id)
                        }}
                      >
                        <XCircle className="mr-1 size-3.5" /> REJECT
                      </Button>

                      {/* Tombol Revert */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className="rounded-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 font-bold text-xs uppercase px-4 py-2"
                        onClick={() => {
                          const id = activeStep?.id || activeStepId
                          if (id) handleRevertStep(id)
                        }}
                      >
                        <RotateCcw className="mr-1 size-3.5" /> REVERT
                      </Button>

                      <Button
                        size="sm"
                        disabled={isPending}
                        className="text-xs rounded-full ml-auto bg-teal-800 hover:bg-teal-900 text-white font-bold px-5 py-2.5 shadow-sm"
                        onClick={() => {
                          const sig = registeredSignature || (activeStep?.id ? signaturesByStepId[activeStep.id] : '') || previewSig
                          if (!sig) {
                            toast.error('Anda belum mendaftarkan tanda tangan. Silakan daftarkan tanda tangan Anda terlebih dahulu.')
                            setIsRegisterModalOpen(true)
                            return
                          }
                          if (activeStep?.id) {
                            handleApproveStep(activeStep.id)
                          } else {
                            handleSaveForm()
                          }
                        }}
                      >
                        <CheckCircle2 className="mr-1 size-3.5" /> {isPending ? 'MENYIMPAN & MENYETUJUI...' : 'TAMBAHKAN KE PDF & SETUJUI'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl bg-white border border-slate-200 p-4 text-xs text-slate-700 flex items-start gap-3 shadow-xs">
                    <svg className="size-5 text-amber-600 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Menunggu persetujuan dari {activeStep?.approverName || 'Approver'}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Dokumen saat ini sedang menunggu persetujuan pada tahap <strong>{activeStep?.stepLabel}</strong>. Hanya penandatangan yang ditugaskan (<strong>{activeStep?.approverName}</strong>) yang dapat menandatangani dokumen ini.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <SignatureFloatingWidget
              isOpenDirectModal={isRegisterModalOpen}
              onCloseDirectModal={() => setIsRegisterModalOpen(false)}
              onSignatureUpdated={(dataUrl) => {
                setRegisteredSignature(dataUrl)
                setPreviewSig(dataUrl)
                setPreviewSignedAt(new Date())
                if (activeStep?.id) {
                  setSignaturesByStepId((prev) => ({ ...prev, [activeStep.id]: dataUrl }))
                }
              }}
            />
          </div>

          {/* ── RIGHT: Live A4 PDF Preview ── */}
          <div className={cn("rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:hidden overflow-auto", activeView === 'form' ? 'hidden xl:block' : 'block')}>
            <div
              id="pdf-page-1"
              className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
              style={{
                backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                backgroundSize: '100% 100%',
              }}
            >
              <div
                id="pdf-content"
                className="pdf-wrapper-content relative z-10 outline-none text-[8.5pt] font-sans leading-tight"
                style={{
                  color: 'black',
                  paddingTop: '38mm',
                  paddingBottom: '35mm',
                  paddingLeft: '20mm',
                  paddingRight: '20mm',
                  height: '297mm',
                  overflow: 'hidden',
                }}
              >
                {/* Header Document */}
                <h1 className="text-center font-bold text-[11pt] mb-1 uppercase">SURAT PERINTAH LEMBUR (SPL)</h1>
                <p className="text-center font-semibold text-[8pt] text-slate-700 mb-3">PT CHITRA PARATAMA • HUMAN CAPITAL</p>

                {/* Section 1: Details */}
                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8.5pt]">
                  <tbody>
                    <tr>
                      <td colSpan={4} className="font-bold bg-slate-50">Details & Request Profile</td>
                    </tr>
                    <tr>
                      <td className="w-1/4 font-bold bg-slate-50">SPL Number</td>
                      <td className="w-1/4 font-mono font-semibold">{data.splNumber}</td>
                      <td className="w-1/4 font-bold bg-slate-50">Work Date</td>
                      <td className="w-1/4 font-semibold">{fmtDate(workDate)}</td>
                    </tr>
                    <tr>
                      <td className="font-bold bg-slate-50">Title / Keperluan</td>
                      <td colSpan={3} className="font-semibold">{title || '—'}</td>
                    </tr>
                    <tr>
                      <td className="font-bold bg-slate-50">Requester Name</td>
                      <td>{data.requesterName}</td>
                      <td className="font-bold bg-slate-50">Department</td>
                      <td>{data.requesterDepartment || 'Central Services'}</td>
                    </tr>
                    <tr>
                      <td className="font-bold bg-slate-50">Planned Schedule</td>
                      <td colSpan={3}>
                        {startDate} ({startTime}) s.d. {endDate} ({endTime})
                      </td>
                    </tr>
                    {requestNotes && (
                      <tr>
                        <td className="font-bold bg-slate-50">Request Notes</td>
                        <td colSpan={3}>{requestNotes}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Section 2: Workers */}
                <div className="font-bold mb-1">A. Workers ({participants.length} Orang)</div>
                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[8pt]">
                  <thead>
                    <tr className="bg-slate-50 font-bold">
                      <th className="w-[8%]">#</th>
                      <th className="text-left w-[42%]">Name</th>
                      <th className="w-[15%]">Shift</th>
                      <th className="w-[15%]">Roster</th>
                      <th className="w-[20%]">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-2 text-slate-400 italic">Belum ada peserta lembur.</td>
                      </tr>
                    ) : (
                      participants.map((p, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td className="text-left font-semibold">{p.employeeName}</td>
                          <td>{p.shiftCode}</td>
                          <td>{p.rosterType}</td>
                          <td className="capitalize text-[7.5pt]">{p.category.replace(/_/g, ' ')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Section 3: Line Items */}
                <div className="font-bold mb-1">B. Line Items (Aktivitas Pekerjaan)</div>
                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                  <thead>
                    <tr className="bg-slate-50 text-center font-bold">
                      <th className="w-[8%]">#</th>
                      <th className="text-left w-[40%]">Activity</th>
                      <th className="w-[18%]">Target</th>
                      <th className="w-[14%]">Minutes</th>
                      <th className="w-[20%]">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td className="font-medium">{item.lineLabel}</td>
                        <td className="text-center">{item.targetUnit || '—'}</td>
                        <td className="text-center">{item.estimatedMinutes} m</td>
                        <td className="text-center font-bold">{item.plannedPoints} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Section 4: Approval Steps Table */}
                <div className="font-bold mb-1">C. Approval Steps</div>
                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[8pt]">
                  <thead>
                    <tr className="bg-slate-50 font-bold">
                      <th className="w-[6%]">#</th>
                      <th className="text-left w-[22%]">Tahap</th>
                      <th className="text-left w-[22%]">Approver</th>
                      <th className="w-[14%]">Status</th>
                      <th className="w-[18%]">Waktu</th>
                      <th className="text-left w-[18%]">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalHistoryForDisplay.map((step, idx) => (
                      <tr key={`spl-pdf-step-${step.id || step.stepOrder}-${step.approverRole || 'role'}-${idx}`}>
                        <td>{step.stepOrder}</td>
                        <td className="text-left">{step.stepLabel}</td>
                        <td className="text-left">{step.approverName || '-'}</td>
                        <td className="capitalize font-semibold">{step.status}</td>
                        <td className="text-[7pt]">{fmtDt(step.signedAt)}</td>
                        <td className="text-left text-[7pt] text-slate-600">{step.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                           {/* Section 5: Signatories (3 Roles: Serviceman, Leader, Section Head) */}
                <div className="font-bold mb-2 text-[8.5pt]">Signatories</div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4 text-center">
                  {/* 1. Serviceman / Karyawan */}
                  {(() => {
                    const isSigned1 = employeeSig?.status === 'approved' || employeeSig?.status === 'signed' || employeeSig?.status === 'completed'
                    return (
                      <div className="flex flex-col items-center text-center">
                        <div className="text-[7pt] text-slate-500 font-semibold mb-1">Employee Signature</div>
                        <div className="h-16 w-full flex items-center justify-center my-1">
                          {isSigned1 && employeeSigImage ? (
                            <img src={employeeSigImage} alt="TTD" className="max-h-14 max-w-full object-contain" />
                          ) : isSigned1 && employeeSig?.signedAt ? (
                            <div className="flex flex-col items-center justify-center text-center">
                              <span className="text-[6.5pt] font-bold text-emerald-600">✓ Digitally Signed ({fmtDt(employeeSig?.signedAt)})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                          )}
                        </div>
                        <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                          {employeeSig?.approverName || data.requesterName}
                        </div>
                        <div className="text-[7pt] text-slate-600 font-medium">{requesterTitle || 'Serviceman'}</div>
                        <div className="text-[6.5pt] text-slate-400 mt-0.5">
                          {isSigned1 && employeeSig?.signedAt ? `Waktu TTD: ${fmtDt(employeeSig.signedAt)}` : '—'}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 2. Leader / Pengawas */}
                  {(() => {
                    const isApproved2 = leaderSig?.status === 'approved'
                    return (
                      <div className="flex flex-col items-center text-center">
                        <div className="text-[7pt] text-slate-500 font-semibold mb-1">Leader / Supervisor Signature</div>
                        <div className="h-16 w-full flex items-center justify-center my-1">
                          {isApproved2 && leaderSigImage ? (
                            <img src={leaderSigImage} alt="TTD" className="max-h-14 max-w-full object-contain" />
                          ) : isApproved2 && leaderSig?.signedAt ? (
                            <div className="flex flex-col items-center justify-center text-center">
                              <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({fmtDt(leaderSig?.signedAt)})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                          )}
                        </div>
                        <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                          {leaderSig?.approverName || 'Leader / Supervisor'}
                        </div>
                        <div className="text-[7pt] text-slate-600 font-medium">{leaderTitle || 'Leader / Supervisor'}</div>
                        <div className="text-[6.5pt] text-slate-400 mt-0.5">
                          {isApproved2 && leaderSig?.signedAt ? `Waktu TTD: ${fmtDt(leaderSig.signedAt)}` : '—'}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 3. Section Head */}
                  {(() => {
                    const isApproved3 = sectionHeadSig?.status === 'approved'
                    return (
                      <div className="flex flex-col items-center text-center">
                        <div className="text-[7pt] text-slate-500 font-semibold mb-1">Section Head Signature</div>
                        <div className="h-16 w-full flex items-center justify-center my-1">
                          {isApproved3 && sectionHeadSigImage ? (
                            <img src={sectionHeadSigImage} alt="TTD" className="max-h-14 max-w-full object-contain" />
                          ) : isApproved3 && sectionHeadSig?.signedAt ? (
                            <div className="flex flex-col items-center justify-center text-center">
                              <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({fmtDt(sectionHeadSig?.signedAt)})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                          )}
                        </div>
                        <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                          {sectionHeadSig?.approverName || 'Section Head'}
                        </div>
                        <div className="text-[7pt] text-slate-600 font-medium">{sectionHeadTitle || 'Section Head'}</div>
                        <div className="text-[6.5pt] text-slate-400 mt-0.5">
                          {isApproved3 && sectionHeadSig?.signedAt ? `Waktu TTD: ${fmtDt(sectionHeadSig.signedAt)}` : '—'}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div className="text-right text-[7pt] text-gray-400 mt-4">
                  PT Chitra Paratama • HERO Platform
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
