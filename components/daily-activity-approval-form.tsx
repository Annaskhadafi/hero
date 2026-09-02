'use client'

import { useState, useTransition, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SignatureCanvas from 'react-signature-canvas'
import {
  ArrowLeft,
  Printer,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PenLine,
  Trash2,
  Plus,
  FileSignature,
  PenTool,
  RotateCcw,
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ImagePlus,
  Search,
  SendHorizontal,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { downloadElementAsPdf } from '@/lib/pdf-download'

import {
  saveDailyActivityApprovalForm,
  submitDailyActivityApprovalStepAction,
  saveDailyActivityItemRemarksAction,
} from '@/app/dashboard/activity-hub/actions'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import { SignatureFloatingWidget } from '@/components/signature-floating-widget'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EnterpriseFormGrid } from '@/components/ui/enterprise-table-kit'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type ApprovalStep = {
  id: number
  stepOrder: number
  stepLabel: string
  approverEmployeeId?: number | null
  approverEmail?: string | null
  approverName: string
  approverRole: string
  status: string
  signatureDataUrl: string | null
  remarks: string
  signedAt: Date | string | null
}

type SessionItem = {
  id: number
  label: string
  group: string
  unitNumber: string
  remark: string
  duration: string
  points: number
  sortOrder: number
  startTime?: string
  endTime?: string
  photoUrl?: string | null
}

type ApprovalData = {
  sessionId: number
  sessionCode: string
  workDate: Date | string
  shiftCode: string
  status: string
  summaryRemark?: string | null
  submittedAt: Date | string | null
  approvedAt: Date | string | null
  employee: {
    id?: number
    name: string
    sn: string
    department: string
    section: string
    jobTitle: string
  }
  site: {
    id?: number
    name: string
    customerName: string
  }
  totals: {
    itemCount: number
    totalPoints: number
  }
  sessionItems: SessionItem[]
  approvals: ApprovalStep[]
  permissions: {
    canApprove: boolean
    isCurrentEmployee: boolean
    currentEmployeeId?: number
    currentEmployeeEmail?: string
    currentEmployeeName?: string
    accessRole: string
  }
}

function fmtDt(v: Date | string | null | undefined) {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
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

export function DailyActivityApprovalForm({ data, employees: employeesProp = [], orgNodes = [], masterHeadMap }: { data: ApprovalData; employees?: any[]; orgNodes?: any[]; masterHeadMap?: any }) {
  const router = useRouter()
  let sidebarSetOpen: ((open: boolean) => void) | undefined
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sidebar = useSidebar()
    sidebarSetOpen = sidebar.setOpen
  } catch (e) {
    sidebarSetOpen = undefined
  }

  const hasAutoClosed = useRef(false)

  useEffect(() => {
    if (!hasAutoClosed.current && sidebarSetOpen) {
      sidebarSetOpen(false)
      hasAutoClosed.current = true
    }
  }, [sidebarSetOpen])

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
    return pending ? pending.id : (data?.approvals?.[0]?.id ?? 1)
  })
  const [stepRemarks, setStepRemarks] = useState<Record<number, string>>({})
  const [itemRemarks, setItemRemarks] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    ;(data?.sessionItems || []).forEach((i) => {
      if (i) init[i.id] = i.remark || ''
    })
    return init
  })
  const [profileForm, setProfileForm] = useState({
    employeeId: data.employee.id ? String(data.employee.id) : '',
    employeeName: data.employee.name,
    employeeSn: data.employee.sn,
    jobTitle: data.employee.jobTitle || '',
    department: data.employee.department || '',
    section: data.employee.section || '',
    workDate: formatDateInput(data.workDate) || formatDateInput(new Date()),
    shiftCode: data.shiftCode || 'ALL',
    siteName: data.site.name || '',
    customerName: data.site.customerName || '',
  })
  const initialTeamMatch = (data.summaryRemark || '').match(/\[Team:\s*([^\]]+)\]/i)
  const initialTeamNames = useMemo(
    () => (initialTeamMatch ? initialTeamMatch[1].split(',').map((s) => s.trim()) : []),
    [data.summaryRemark]
  )
  const [isTeamLog, setIsTeamLog] = useState<boolean>(() => initialTeamNames.length > 0)
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<number[]>(() => {
    if (initialTeamNames.length > 0) {
      const ids: number[] = []
      initialTeamNames.forEach((name) => {
        const found = employeesProp.find((e) => e.name.toLowerCase() === name.toLowerCase())
        if (found) ids.push(found.id)
      })
      if (data.employee.id && !ids.includes(data.employee.id)) {
        ids.unshift(data.employee.id)
      }
      return ids
    }
    return data.employee.id ? [data.employee.id] : []
  })
  const [teamMemberPickerOpen, setTeamMemberPickerOpen] = useState(false)
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('')

  const filteredFormEmployees = useMemo(() => {
    if (!teamMemberSearchQuery) return employeesProp
    const q = teamMemberSearchQuery.toLowerCase()
    return employeesProp.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employeeSn && e.employeeSn.toLowerCase().includes(q)) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.jobTitle && e.jobTitle.toLowerCase().includes(q))
    )
  }, [employeesProp, teamMemberSearchQuery])

  const currentTeamMembersSummary = useMemo(() => {
    if (!isTeamLog || selectedTeamMemberIds.length === 0) return null
    return employeesProp
      .filter((e) => selectedTeamMemberIds.includes(e.id))
      .map((e) => e.name)
      .join(', ')
  }, [isTeamLog, selectedTeamMemberIds, employeesProp])

  const [itemsList, setItemsList] = useState<SessionItem[]>(data.sessionItems);
  const [sourceMode, setSourceMode] = useState<'self_input' | 'assigned' | 'custom'>('self_input');
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [expandedPickerGroups, setExpandedPickerGroups] = useState<Set<string>>(new Set());
  
  const initialLeader = data.approvals.find((a) => a.approverRole === 'leader')
  const initialSuperior = data.approvals.find((a) => a.approverRole === 'section_head')
  const initialManager = data.approvals.find((a) => a.approverRole === 'manager')

  const [selectedLeaderId, setSelectedLeaderId] = useState<string>(() => {
    if (initialLeader?.approverEmployeeId) return String(initialLeader.approverEmployeeId)
    const matched = employeesProp.find((e) => e.name === initialLeader?.approverName)
    return matched ? String(matched.id) : ''
  })
  const [selectedSuperiorId, setSelectedSuperiorId] = useState<string>(() => {
    if (initialSuperior?.approverEmployeeId) return String(initialSuperior.approverEmployeeId)
    const matched = employeesProp.find((e) => e.name === initialSuperior?.approverName)
    return matched ? String(matched.id) : ''
  })
  const [selectedManagerId, setSelectedManagerId] = useState<string>(() => {
    if (initialManager?.approverEmployeeId) return String(initialManager.approverEmployeeId)
    const matched = employeesProp.find((e) => e.name === initialManager?.approverName)
    return matched ? String(matched.id) : ''
  })

  const [leaderTitle, setLeaderTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedLeaderId || e.name === initialLeader?.approverName)
    return matched?.rank || matched?.position || matched?.jobTitle || ''
  })
  const [superiorTitle, setSuperiorTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedSuperiorId || e.name === initialSuperior?.approverName)
    return matched?.rank || matched?.position || matched?.jobTitle || ''
  })
  const [managerTitle, setManagerTitle] = useState<string>(() => {
    const matched = employeesProp.find((e) => String(e.id) === selectedManagerId || e.name === initialManager?.approverName)
    return matched?.rank || matched?.position || matched?.jobTitle || ''
  })

  const handleAddItem = () => {
    const newItem: SessionItem = {
      id: -Date.now(),
      label: '',
      group: 'Technical',
      unitNumber: '',
      remark: '',
      duration: '1j 0m',
      points: 5,
      sortOrder: itemsList.length + 1,
    }
    setItemsList((prev) => [...prev, newItem])
  }

  const handleRemoveItem = (index: number) => {
    setItemsList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateItem = (index: number, field: keyof SessionItem, value: any) => {
    setItemsList((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    )
  }

  const handleLeaderChange = (val: string) => {
    setSelectedLeaderId(val)
    const matched = employeesProp.find((e) => String(e.id) === val)
    if (matched) {
      setLeaderTitle(matched.rank || matched.position || matched.jobTitle || '')
    }
  }

  const handleSuperiorChange = (val: string) => {
    setSelectedSuperiorId(val)
    const matched = employeesProp.find((e) => String(e.id) === val)
    if (matched) {
      setSuperiorTitle(matched.rank || matched.position || matched.jobTitle || '')
    }
  }

  const handleManagerChange = (val: string) => {
    setSelectedManagerId(val)
    const matched = employeesProp.find((e) => String(e.id) === val)
    if (matched) {
      setManagerTitle(matched.rank || matched.position || matched.jobTitle || '')
    }
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

  const allApproved = data.approvals.length > 0 && data.approvals.every((a) => a.status === 'approved')

  const handleSaveForm = () => {
    startTransition(async () => {
      const leaderSignatureDataUrl = (activeStepId ? signaturesByStepId[activeStepId] : undefined) || getCanvasSignatureDataUrl() || previewSig
      const selectedLeader = employeesProp.find((e) => String(e.id) === selectedLeaderId)
      const selectedSuperior = employeesProp.find((e) => String(e.id) === selectedSuperiorId)
      const selectedManager = employeesProp.find((e) => String(e.id) === selectedManagerId)
      const res = await saveDailyActivityApprovalForm({
        sessionId: data.sessionId,
        employeeId: profileForm.employeeId ? Number(profileForm.employeeId) : undefined,
        workDate: profileForm.workDate || undefined,
        shiftCode: profileForm.shiftCode || undefined,
        items: itemsList,
        itemRemarks,
        leaderSignatureDataUrl: leaderSignatureDataUrl || undefined,
        leaderEmployeeId: selectedLeader ? selectedLeader.id : undefined,
        leaderName: selectedLeader?.name || undefined,
        leaderEmail: selectedLeader?.email || undefined,
        leaderTitle: leaderTitle || selectedLeader?.rank || selectedLeader?.position || undefined,
        superiorEmployeeId: selectedSuperior ? selectedSuperior.id : undefined,
        superiorName: selectedSuperior?.name || undefined,
        superiorEmail: selectedSuperior?.email || undefined,
        superiorTitle: superiorTitle || selectedSuperior?.rank || selectedSuperior?.position || undefined,
        managerEmployeeId: selectedManager ? selectedManager.id : undefined,
        managerName: selectedManager?.name || undefined,
        managerEmail: selectedManager?.email || undefined,
        managerTitle: managerTitle || selectedManager?.rank || selectedManager?.position || undefined,
        signatures: signaturesByStepId,
        stepRemarks,
        teamMemberEmployeeIds: isTeamLog ? selectedTeamMemberIds : [],
      })
      if (res.success) {
        toast.success('Daily Activity Report berhasil disimpan!')
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

      // Persist any form changes together with the signature approval
      const selectedLeader = employeesProp.find((e) => String(e.id) === selectedLeaderId)
      const selectedSuperior = employeesProp.find((e) => String(e.id) === selectedSuperiorId)
      const selectedManager = employeesProp.find((e) => String(e.id) === selectedManagerId)

      await saveDailyActivityApprovalForm({
        sessionId: data.sessionId,
        employeeId: profileForm.employeeId ? Number(profileForm.employeeId) : undefined,
        workDate: profileForm.workDate || undefined,
        shiftCode: profileForm.shiftCode || undefined,
        items: itemsList,
        itemRemarks,
        leaderEmployeeId: selectedLeader ? selectedLeader.id : undefined,
        leaderName: selectedLeader?.name || undefined,
        leaderEmail: selectedLeader?.email || undefined,
        leaderTitle: leaderTitle || selectedLeader?.rank || selectedLeader?.position || undefined,
        superiorEmployeeId: selectedSuperior ? selectedSuperior.id : undefined,
        superiorName: selectedSuperior?.name || undefined,
        superiorEmail: selectedSuperior?.email || undefined,
        superiorTitle: superiorTitle || selectedSuperior?.rank || selectedSuperior?.position || undefined,
        managerEmployeeId: selectedManager ? selectedManager.id : undefined,
        managerName: selectedManager?.name || undefined,
        managerEmail: selectedManager?.email || undefined,
        managerTitle: managerTitle || selectedManager?.rank || selectedManager?.position || undefined,
        teamMemberEmployeeIds: isTeamLog ? selectedTeamMemberIds : [],
      })

      const fd = new FormData()
      fd.set('sessionId', String(data.sessionId))
      fd.set('approvalId', String(stepId))
      fd.set('action', 'approve')
      fd.set('signatureDataUrl', signatureDataUrl)
      fd.set('remarks', stepRemarks[stepId] || '')

      const res = await submitDailyActivityApprovalStepAction({ status: 'idle', message: '' }, fd)
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
      fd.set('sessionId', String(data.sessionId))
      fd.set('approvalId', String(stepId))
      fd.set('action', 'reject')
      fd.set('remarks', stepRemarks[stepId] || '')

      const res = await submitDailyActivityApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success('Aktivitas ditolak.')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal menolak approval.')
      }
    })
  }

  const executeRevertStep = (stepId: number) => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('sessionId', String(data.sessionId))
      fd.set('approvalId', String(stepId))
      fd.set('action', 'revert')
      fd.set('remarks', stepRemarks[stepId] || 'Dokumen dikembalikan oleh Department Head untuk revisi.')

      const res = await submitDailyActivityApprovalStepAction({ status: 'idle', message: '' }, fd)
      if (res.status === 'success') {
        toast.success(res.message || 'Dokumen berhasil dikembalikan untuk revisi.')
        router.refresh()
      } else {
        toast.error(res.message || 'Gagal mengembalikan dokumen.')
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
    toast.loading('Menyiapkan file PDF...', { id: 'act-form-dl' })
    try {
      const el = document.querySelector('.pdf-wrapper') as HTMLElement
      if (el) {
        await downloadElementAsPdf(el, `DailyActivity_${data.sessionCode.replace(/[\/\\]/g, '_')}.pdf`)
        toast.success('PDF berhasil diunduh!', { id: 'act-form-dl' })
      } else {
        toast.error('Gagal menemukan template PDF', { id: 'act-form-dl' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengunduh PDF', { id: 'act-form-dl' })
    } finally {
      setIsDownloading(false)
    }
  }

  // Display approval history with preview injection (ensuring all 4 sequential steps)
  const approvalHistoryForDisplay = useMemo(() => {
    const defaultSteps = [
      { stepOrder: 1, stepLabel: 'Karyawan Sign', approverRole: 'employee', id: 1, status: 'pending', approverName: profileForm.employeeName || data.employee.name || 'Karyawan', signatureDataUrl: null, remarks: '', signedAt: null },
      { stepOrder: 2, stepLabel: 'Leader / Supervisor', approverRole: 'leader', id: 2, status: 'waiting', approverName: employeesProp.find((e) => String(e.id) === selectedLeaderId)?.name || 'Leader Lapangan', signatureDataUrl: null, remarks: '', signedAt: null },
      { stepOrder: 3, stepLabel: 'Section Head', approverRole: 'section_head', id: 3, status: 'waiting', approverName: employeesProp.find((e) => String(e.id) === selectedSuperiorId)?.name || 'Section Head', signatureDataUrl: null, remarks: '', signedAt: null },
    ]

    const filteredApprovals = (data.approvals || []).filter((a) => (a.stepOrder ?? 0) <= 3 && a.approverRole !== 'manager')

    const merged = defaultSteps.map((def) => {
      const match = filteredApprovals.find((a) => a.stepOrder === def.stepOrder || a.approverRole === def.approverRole)
      if (match) {
        return {
          ...def,
          ...match,
        }
      }
      return def
    })

    return merged
      .filter((step) => step.stepOrder <= 3 && step.approverRole !== 'manager')
      .map((step) => {
        const isApproved = step.status === 'approved'
        const isActivelySigning = activeStepId === step.id && Boolean(previewSig)
        const currentSig = isApproved
          ? (signaturesByStepId[step.id] || step.signatureDataUrl)
          : isActivelySigning
          ? previewSig
          : null
        const currentRemark = stepRemarks[step.id] !== undefined ? stepRemarks[step.id] : step.remarks
        return {
          ...step,
          status: step.status,
          signatureDataUrl: currentSig,
          remarks: currentRemark || step.remarks,
          signedAt: isApproved ? step.signedAt : isActivelySigning ? (previewSignedAt || new Date()) : null,
        }
      })
  }, [data.approvals, activeStepId, previewSig, previewSignedAt, stepRemarks, signaturesByStepId, profileForm.employeeName, data.employee.name, selectedLeaderId, selectedSuperiorId, selectedManagerId, employeesProp])

  const employeeSig = approvalHistoryForDisplay.find((a) => a.approverRole === 'employee')
  const leaderSig = approvalHistoryForDisplay.find((a) => a.approverRole === 'leader' || a.approverRole === 'pjo_or_te_initial')
  const sectionHeadSig = approvalHistoryForDisplay.find((a) => a.approverRole === 'section_head' || a.approverRole === 'section_head_confirmation')
  const managerSig = approvalHistoryForDisplay.find((a) => a.approverRole === 'manager' || a.approverRole === 'central_service_manager' || a.approverRole === 'hr')

  function renderApprovalMeta(step: any) {
    if (!step?.signedAt && !step?.remarks) return null
    return (
      <div className="mt-1 space-y-0.5 text-[7pt] text-slate-500">
        {step?.signedAt && <div>Waktu TTD: {fmtDt(step.signedAt)}</div>}
        {step?.remarks && <div className="italic text-slate-600">Catatan: {step.remarks}</div>}
      </div>
    )
  }

  // ── Document Content for Preview ──
  const pdfDocumentContent = (
    <div
      id="pdf-content"
      className="relative z-10 text-[8.5pt] font-sans leading-tight text-black"
      style={{
        paddingTop: '38mm',
        paddingBottom: '35mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        minHeight: '297mm',
      }}
    >
      <h1 className="text-center font-bold text-[11pt] text-black mb-0.5 uppercase">PT. CHITRA PARATAMA</h1>
      <h2 className="text-center font-bold text-[12pt] text-black mb-3 uppercase">DAILY ACTIVITY APPROVAL REPORT</h2>

      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 text-[8.5pt]">
        <tbody>
          <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Details</td></tr>
          <tr>
            <td className="w-1/2">Tanggal Kerja: <strong>{profileForm.workDate ? fmtDate(profileForm.workDate) : '—'}</strong></td>
            <td className="w-1/2">Shift: <strong>{profileForm.shiftCode || 'ALL'}</strong></td>
          </tr>
          <tr>
            <td>Kode Sesi: <strong>{data.sessionCode}</strong></td>
            <td>Status: <span className="capitalize font-bold text-black">{data.status}</span></td>
          </tr>
          <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Employee Profile</td></tr>
          <tr>
            <td>Nama: <strong>{profileForm.employeeName}</strong></td>
            <td>SN: <strong>{profileForm.employeeSn}</strong></td>
          </tr>
          <tr>
            <td>Job Title: <strong>{profileForm.jobTitle || 'Staff'}</strong></td>
            <td>Dept / Section: <strong>{[profileForm.department, profileForm.section].filter(Boolean).join(' / ') || '—'}</strong></td>
          </tr>
          <tr>
            <td>Site: <strong>{profileForm.siteName || '—'}</strong></td>
            <td>Customer: <strong>{profileForm.customerName || 'Default Customer'}</strong></td>
          </tr>
          {currentTeamMembersSummary ? (
            <tr>
              <td colSpan={2}>
                Anggota Tim: <strong className="text-blue-900">{currentTeamMembersSummary}</strong>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* A. Daily Activity Items */}
      <div className="font-bold mb-1 text-[8.5pt]">
        A. Daily Activity Items (Total: {itemsList.length} item, {itemsList.reduce((s, i) => s + i.points, 0)} poin)
      </div>
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
        <thead>
          <tr className="bg-white font-bold text-center">
            <th className="w-[6%]">#</th>
            <th className="text-left w-[40%]">Aktivitas</th>
            <th className="w-[14%]">Unit</th>
            <th className="w-[12%]">Durasi</th>
            <th className="w-[10%]">Poin</th>
            <th className="text-left w-[18%]">Remark</th>
          </tr>
        </thead>
        <tbody>
          {itemsList.length > 0 ? (
            itemsList.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx + 1}</td>
                <td>{item.label}</td>
                <td className="text-center">{item.unitNumber || '-'}</td>
                <td className="text-center">{item.duration}</td>
                <td className="text-center font-bold">{item.points}</td>
                <td className="text-left text-[7.5pt]">{itemRemarks[item.id] || item.remark || '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-2">Belum ada item aktivitas.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* B. Approval Steps */}
      <div className="font-bold mb-1 text-[8.5pt]">B. Approval Steps</div>
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-white font-bold text-center">
            <th style={{ width: '6%' }}>#</th>
            <th className="text-left" style={{ width: '22%' }}>Tahap</th>
            <th className="text-left" style={{ width: '24%' }}>Approver</th>
            <th style={{ width: '14%' }}>Status</th>
            <th style={{ width: '18%' }}>Waktu</th>
            <th className="text-left" style={{ width: '16%' }}>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {approvalHistoryForDisplay.map((step: any) => (
            <tr key={step.id}>
              <td className="text-center">{step.stepOrder}</td>
              <td className="text-left font-medium">{step.stepLabel}</td>
              <td className="text-left font-medium">{step.approverName || '-'}</td>
              <td className="text-center capitalize font-bold">{step.status}</td>
              <td className="text-center text-[7pt]">{fmtDt(step.signedAt)}</td>
              <td className="text-left text-[7.5pt] text-slate-600 italic break-words whitespace-normal leading-tight">{step.remarks || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signatories (3 Roles: Employee, Leader/PJO, Section Head) */}
      <div className="font-bold mb-3 text-[8.5pt]">Signatories</div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4">
        {/* Karyawan */}
        <div>
          <div className="text-[7pt] text-gray-500 mb-1">Employee Signature</div>
          <div className="h-14 flex items-end">
            {employeeSig?.status === 'approved' && employeeSig?.signatureDataUrl ? (
              <img src={employeeSig.signatureDataUrl} alt="TTD" className="h-10 object-contain" />
            ) : (
              <span className="text-slate-400 italic text-[7.5pt]"></span>
            )}
          </div>
          <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
            {data.employee.name}
          </div>
          <div className="text-[7pt] text-slate-600 font-medium">{data.employee.jobTitle || 'Staff'}</div>
          {employeeSig?.status === 'approved' && employeeSig?.signedAt && (
            <div className="text-[6.5pt] text-slate-500 mt-0.5">Waktu TTD: {fmtDt(employeeSig.signedAt)}</div>
          )}
        </div>

        {/* Leader / PJO */}
        <div>
          <div className="text-[7pt] text-gray-500 mb-1">Leader / PJO Signature</div>
          <div className="h-14 flex items-end">
            {leaderSig?.status === 'approved' && leaderSig?.signatureDataUrl ? (
              <img src={leaderSig.signatureDataUrl} alt="TTD" className="h-10 object-contain" />
            ) : (
              <span className="text-slate-400 italic text-[7.5pt]"></span>
            )}
          </div>
          <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
            {leaderSig?.approverName || data.employee.name}
          </div>
          <div className="text-[7pt] text-slate-600 font-medium">Leader / PJO</div>
          {leaderSig?.status === 'approved' && leaderSig?.signedAt && (
            <div className="text-[6.5pt] text-slate-500 mt-0.5">Waktu TTD: {fmtDt(leaderSig.signedAt)}</div>
          )}
        </div>

        {/* Section Head */}
        <div>
          <div className="text-[7pt] text-gray-500 mb-1">Section Head Signature</div>
          <div className="h-14 flex items-end">
            {sectionHeadSig?.status === 'approved' && sectionHeadSig?.signatureDataUrl ? (
              <img src={sectionHeadSig.signatureDataUrl} alt="TTD" className="h-10 object-contain" />
            ) : (
              <span className="text-slate-400 italic text-[7.5pt]"></span>
            )}
          </div>
          <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
            {sectionHeadSig?.approverName || data.employee.name}
          </div>
          <div className="text-[7pt] text-slate-600 font-medium">Section Head</div>
          {sectionHeadSig?.status === 'approved' && sectionHeadSig?.signedAt && (
            <div className="text-[6.5pt] text-slate-500 mt-0.5">Waktu TTD: {fmtDt(sectionHeadSig.signedAt)}</div>
          )}
        </div>
      </div>

      <div className="text-right text-[7pt] text-gray-400 mt-4">PT Chitra Paratama • HERO Platform</div>
    </div>
  )

  const activeStep = data.approvals.find((a) => a.id === activeStepId) || data.approvals.find((a) => a.status === 'pending') || data.approvals[0]
  const currentEmpId = data.permissions.currentEmployeeId
  const currentEmpEmail = (data.permissions.currentEmployeeEmail || '').toLowerCase().trim()
  const currentEmpName = (data.permissions.currentEmployeeName || '').toLowerCase().trim()

  // STRICT IDENTITY CHECK: Only true if logged in user is the designated approver for the active step
  const isMyTurn = Boolean(
    activeStep &&
      (activeStep.status === 'pending' || activeStep.status === 'preview') &&
      ((activeStep.approverEmployeeId != null && activeStep.approverEmployeeId === currentEmpId) ||
        (Boolean(activeStep.approverEmail) &&
          activeStep.approverEmail?.toLowerCase().trim() === currentEmpEmail) ||
        (Boolean(activeStep.approverName) &&
          activeStep.approverName?.toLowerCase().trim() === currentEmpName))
  )

  const isStepActionable = isMyTurn
  const canUserSignActiveStep = isMyTurn
  const isCurrentStepPending = activeStep && (activeStep.status === 'pending' || activeStep.status === 'preview')
  const activeSignerName = isMyTurn
    ? (currentEmpName ? data.permissions.currentEmployeeName : activeStep?.approverName)
    : (activeStep?.approverName || 'Approver')

  const isReverted = (data.status || '').toLowerCase() === 'reverted' || (data.status || '').toLowerCase() === 'needs_revision'
  const isRejected = (data.status || '').toLowerCase() === 'rejected'

  const [activeView, setActiveView] = useState<'form' | 'preview'>('form')

  return (
    <AdminPageShell
      eyebrow="HC • Form"
      title="Daily Activity Approval & Review"
      description="Evaluasi laporan aktivitas harian teknisi dan tanda tangan verifikasi bertingkat."
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
        {/* ── KIRI: Header + Form + TTD ── */}
        <div className={cn('flex flex-col gap-6 print:hidden', activeView === 'preview' ? 'hidden xl:flex' : 'flex')}>
          {/* Status Alert Banners */}
          {isRejected && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm text-rose-900">Dokumen ini telah ditolak (Rejected)</p>
                <p className="text-xs text-rose-700 mt-0.5">Dokumen yang sudah di-reject tidak dapat diedit atau diajukan ulang. Silakan buat laporan Daily Activity baru.</p>
              </div>
              <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0">
                <Link href="/dashboard/activity-hub/my-day">Buat Baru</Link>
              </Button>
            </div>
          )}

          {isReverted && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 flex items-start gap-3 shadow-xs">
              <RotateCcw className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-900">Dokumen ini dikembalikan untuk revisi (Reverted)</p>
                <p className="text-xs text-amber-700 mt-0.5">Silakan sesuaikan data aktivitas atau catatan pekerjaan, lalu klik <strong>"Kirim Ulang"</strong> untuk meneruskan kembali ke atasan yang meminta revisi.</p>
              </div>
            </div>
          )}

          {/* Top Action Bar (Contract Review Parity) */}
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/activity-hub/approval">
                <ArrowLeft className="mr-2 size-4" /> Kembali
              </Link>
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="gap-2"
            >
              <Download className="size-4" /> {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
            </Button>
            {!isRejected && (
              <Button
                className={cn(
                  'ml-auto font-bold text-white',
                  isReverted ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                )}
                onClick={handleSaveForm}
                disabled={isPending}
              >
                {isReverted ? (
                  <>
                    <SendHorizontal className="mr-2 size-4" /> {isPending ? 'Mengirim Ulang...' : 'Kirim Ulang'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" /> {isPending ? 'Menyimpan...' : 'Simpan Form'}
                  </>
                )}
              </Button>
            )}
          </div>

        {/* Details & Employee Profile */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Details & Employee Profile</CardTitle>
              <Badge variant="outline" className="capitalize">{data.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <EnterpriseFormGrid>
              <div className="space-y-2">
                <Label>Tanggal Kerja</Label>
                <Input
                  type="date"
                  value={profileForm.workDate}
                  onChange={(e) => setProfileForm((p) => ({ ...p, workDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select
                  value={profileForm.shiftCode}
                  onValueChange={(val) => setProfileForm((p) => ({ ...p, shiftCode: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih Shift" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">ALL</SelectItem>
                    <SelectItem value="Shift 1">Shift 1</SelectItem>
                    <SelectItem value="Shift 2">Shift 2</SelectItem>
                    <SelectItem value="Day">Day Shift</SelectItem>
                    <SelectItem value="Night">Night Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Pilih Karyawan</Label>
                <SearchableSelect
                  label="Karyawan"
                  placeholder="Pilih Karyawan..."
                  value={profileForm.employeeId}
                  onValueChange={(val) => {
                    const emp = employeesProp.find((e) => String(e.id) === val || String(e.employeeId) === val || String(e.employeeSn) === val)
                    if (emp) {
                      setProfileForm((p) => ({
                        ...p,
                        employeeId: String(emp.id),
                        employeeName: emp.name,
                        employeeSn: emp.employeeId || emp.employeeSn || p.employeeSn,
                        jobTitle: emp.position || emp.rank || emp.jobTitle || p.jobTitle,
                        department: emp.department || p.department,
                        section: emp.section || p.section,
                        siteName: emp.siteName || p.siteName,
                      }))
                      if (emp.directManagerId) {
                        setSelectedLeaderId(String(emp.directManagerId))
                        const mgr = employeesProp.find((e) => e.id === emp.directManagerId)
                        if (mgr) setLeaderTitle(mgr.rank || mgr.position || mgr.jobTitle || '')
                      }
                      if (emp.sectionId && masterHeadMap?.sections?.[String(emp.sectionId)]?.headEmployeeId) {
                        const sHeadId = masterHeadMap.sections[String(emp.sectionId)].headEmployeeId
                        setSelectedSuperiorId(String(sHeadId))
                        const sHead = employeesProp.find((e) => e.id === sHeadId)
                        if (sHead) setSuperiorTitle(sHead.rank || sHead.position || sHead.jobTitle || '')
                      }
                      if (emp.departmentId && masterHeadMap?.departments?.[String(emp.departmentId)]?.headEmployeeId) {
                        const dHeadId = masterHeadMap.departments[String(emp.departmentId)].headEmployeeId
                        setSelectedManagerId(String(dHeadId))
                        const dHead = employeesProp.find((e) => e.id === dHeadId)
                        if (dHead) setManagerTitle(dHead.rank || dHead.position || dHead.jobTitle || '')
                      }
                    }
                  }}
                  options={employeesProp.map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.name} (${emp.employeeId || emp.employeeSn || emp.sn || '-'})`,
                  }))}
                  widthClassName="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  value={profileForm.jobTitle}
                  onChange={(e) => setProfileForm((p) => ({ ...p, jobTitle: e.target.value }))}
                  placeholder="Job Title"
                />
              </div>
              <div className="space-y-2">
                <Label>Dept / Section</Label>
                <Input
                  value={profileForm.section ? `${profileForm.department} / ${profileForm.section}` : profileForm.department}
                  onChange={(e) => setProfileForm((p) => ({ ...p, department: e.target.value, section: '' }))}
                  placeholder="Dept / Section"
                />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input
                  value={profileForm.siteName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, siteName: e.target.value }))}
                  placeholder="Nama Site"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input
                  value={profileForm.customerName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, customerName: e.target.value }))}
                  placeholder="Nama Customer"
                />
              </div>
            </EnterpriseFormGrid>
          </CardContent>
        </Card>

        {/* Team Logging Card */}
        <Card className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <div>
                <span className="font-bold text-slate-800 text-xs">Team Logging (Input Sekaligus untuk Tim)</span>
                <p className="text-[10px] text-slate-500">Pilih anggota tim yang bekerja bersama pada aktivitas ini</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-100 transition-colors">
              <span>Input untuk Tim</span>
              <input
                type="checkbox"
                checked={isTeamLog}
                onChange={(e) => {
                  const checked = e.target.checked
                  setIsTeamLog(checked)
                  if (!checked && profileForm.employeeId) {
                    setSelectedTeamMemberIds([Number(profileForm.employeeId)])
                  }
                }}
                className="size-4 accent-primary rounded cursor-pointer"
              />
            </label>
          </div>

          {isTeamLog ? (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Popover open={teamMemberPickerOpen} onOpenChange={setTeamMemberPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between rounded-xl bg-white text-xs font-semibold text-slate-800 h-9 border-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="size-3.5 text-primary" />
                      {selectedTeamMemberIds.length > 0
                        ? `${selectedTeamMemberIds.length} Anggota Tim Dipilih`
                        : 'Pilih Anggota Tim...'}
                    </span>
                    <ChevronDown className="size-4 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 space-y-2 bg-white shadow-xl rounded-xl" align="start">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                    <Input
                      placeholder="Cari nama atau NIK..."
                      value={teamMemberSearchQuery}
                      onChange={(e) => setTeamMemberSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-white"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                    {filteredFormEmployees.map((emp) => {
                      const isSelected = selectedTeamMemberIds.includes(emp.id)
                      const isPrimary = String(emp.id) === profileForm.employeeId
                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            if (isPrimary) return
                            setSelectedTeamMemberIds((prev) =>
                              isSelected ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                            )
                          }}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors',
                            isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-slate-100',
                            isPrimary && 'opacity-80'
                          )}
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-800">
                              {emp.name} {isPrimary ? '(Pembuat/Primary)' : ''}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {emp.employeeSn || emp.employeeId || '-'} • {emp.jobTitle || emp.department || 'Staff'}
                            </p>
                          </div>
                          {isSelected ? <Check className="size-4 text-primary" /> : null}
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {selectedTeamMemberIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {employeesProp
                    .filter((e) => selectedTeamMemberIds.includes(e.id))
                    .map((e) => (
                      <Badge
                        key={e.id}
                        variant="secondary"
                        className="text-[11px] font-medium py-1 px-2.5 flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200"
                      >
                        <span>{e.name}</span>
                        {String(e.id) !== profileForm.employeeId ? (
                          <X
                            className="size-3 cursor-pointer hover:text-red-600"
                            onClick={() => setSelectedTeamMemberIds((prev) => prev.filter((id) => id !== e.id))}
                          />
                        ) : null}
                      </Badge>
                    ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* SOURCE MODE SELECTION */}
          <Card className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Source Mode *</Label>
            <select
              value={sourceMode}
              onChange={(e) => setSourceMode(e.target.value as any)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="self_input">Self-input activity</option>
              <option value="assigned">Assigned activity</option>
              <option value="custom">Custom activity</option>
            </select>
          </Card>

          {/* KAMUS AKTIVITAS & LIBRARY INTEGRATION DI DESKTOP (DROPDOWN RAPI) */}
          {sourceMode === 'self_input' && (
            <Card className="rounded-[1.2rem] border border-indigo-100 bg-indigo-50/30 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Kamus Aktivitas & Library Integration</span>
                  <h4 className="text-xs font-semibold text-slate-800">Pilih dari Library Aktivitas Standar</h4>
                </div>
                <Badge variant="secondary" className="rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold border-0">
                  {itemsList.length} Aktivitas Dipilih
                </Badge>
              </div>

              {/* Modal Trigger Button */}
              <Button
                type="button"
                onClick={() => setIsPickerModalOpen(true)}
                className="w-full h-11 rounded-xl bg-[#003461] hover:bg-[#002647] text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2"
              >
                <Search className="size-4" /> PILIH ACTIVITY LIBRARY
              </Button>

              {/* Library Selection Modal */}
              <Dialog open={isPickerModalOpen} onOpenChange={setIsPickerModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
                  <DialogHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50">
                    <DialogTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Search className="size-4 text-indigo-600" /> Kamus Activity Library Standar
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Pilih aktivitas standar untuk ditambahkan ke formulir Laporan Aktivitas Harian.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        placeholder="Cari berdasarkan kode, nama aktivitas, atau keyword..."
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-slate-200 text-xs bg-slate-50/60"
                      />
                      {pickerSearch && (
                        <button
                          type="button"
                          onClick={() => setPickerSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {[
                        {
                          groupName: 'Group: Running Tire Inspection & Pressure Check',
                          subtitle: 'GRP-Tire Inspection • ALL',
                          items: [
                            { code: 'SVC.STB-003', name: 'Inspection & Pressure Check', points: 10, badges: ['EQUIPMENT WAJIB', 'WAKTU WAJIB'] },
                            { code: 'SVC.STB-004', name: 'Running Tire Depth Measurement', points: 10, badges: ['FOTO WAJIB'] },
                          ]
                        },
                        {
                          groupName: 'Group: Rotasi Tire EM',
                          subtitle: 'GRP-Rotasi Tire EM • Earthmover',
                          items: [
                            { code: 'SVC.STB-005', name: 'Rotasi Tire EM Position 1 & 2', points: 15, badges: ['EQUIPMENT WAJIB', 'WAKTU WAJIB'] },
                            { code: 'SVC.STB-006', name: 'Rotasi Tire EM Position 3 & 4', points: 15, badges: ['EQUIPMENT WAJIB'] },
                          ]
                        },
                        {
                          groupName: 'Group: Replace Tire TB',
                          subtitle: 'GRP-Replace Tire TB • Truck & Bus',
                          items: [
                            { code: 'SVC.STB-007', name: 'Mounting Truck & Bus Tyre', points: 15, badges: ['EQUIPMENT WAJIB', 'WAKTU WAJIB'] },
                            { code: 'SVC.STB-008', name: 'Dismounting Truck Tyre', points: 15, badges: ['EQUIPMENT WAJIB'] },
                          ]
                        },
                        {
                          groupName: 'Group: Rotasi Tire TB',
                          subtitle: 'GRP-Rotasi Tire TB • Truck & Bus',
                          items: [
                            { code: 'SVC.STB-009', name: 'Rotasi Tire Truck & Bus', points: 15, badges: ['EQUIPMENT WAJIB'] },
                          ]
                        },
                        {
                          groupName: 'Group: Replace Tire',
                          subtitle: 'GRP-Replace Tire • General',
                          items: [
                            { code: 'SVC.STB-010', name: 'Replacement Tyre OTR HD-785', points: 20, badges: ['EQUIPMENT WAJIB', 'FOTO WAJIB'] },
                          ]
                        },
                        {
                          groupName: 'Group: Safety & Housekeeping',
                          subtitle: 'GRP-General Safety & Housekeeping',
                          items: [
                            { code: 'HSE.P5M-001', name: 'P5M & Briefing Keselamatan', points: 5, badges: ['WAKTU WAJIB'] },
                            { code: 'HSE.P2H-001', name: 'P2H & Inspection Alat Kerja', points: 5, badges: ['EQUIPMENT WAJIB'] },
                          ]
                        },
                      ].map((group, gIdx) => {
                        const isExpanded = expandedPickerGroups.has(group.groupName) || Boolean(pickerSearch)
                        const filteredGroupItems = group.items.filter(item =>
                          !pickerSearch ||
                          `${item.code} ${item.name}`.toLowerCase().includes(pickerSearch.toLowerCase())
                        )
                        if (pickerSearch && filteredGroupItems.length === 0) return null

                        return (
                          <div key={gIdx} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedPickerGroups((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(group.groupName)) next.delete(group.groupName)
                                  else next.add(group.groupName)
                                  return next
                                })
                              }}
                              className="w-full flex items-center justify-between bg-slate-50/80 px-3.5 py-2.5 text-left font-bold text-slate-800 text-xs hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRight className={`size-4 transition-transform text-slate-500 ${isExpanded ? 'rotate-90' : ''}`} />
                                <span>{group.groupName}</span>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {filteredGroupItems.length} Activity
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="p-2 space-y-1.5 bg-white border-t border-slate-100">
                                {filteredGroupItems.map((sub, sIdx) => {
                                  const isSelected = itemsList.some(
                                    (i) => i.label.includes(sub.code) || i.label.includes(sub.name)
                                  )
                                  return (
                                    <div
                                      key={sIdx}
                                      onClick={() => {
                                        if (isSelected) {
                                          setItemsList((prev) =>
                                            prev.filter((i) => !i.label.includes(sub.code) && !i.label.includes(sub.name))
                                          )
                                        } else {
                                          const newItem: SessionItem = {
                                            id: -Date.now() - Math.floor(Math.random() * 1000),
                                            label: `${sub.code} - ${sub.name}`,
                                            group: 'Technical',
                                            unitNumber: '',
                                            remark: '',
                                            duration: '30m',
                                            points: sub.points,
                                            sortOrder: itemsList.length + 1,
                                          }
                                          setItemsList((prev) => [...prev, newItem])
                                        }
                                      }}
                                      className={`flex items-start justify-between rounded-xl p-2.5 cursor-pointer transition-all border ${
                                        isSelected
                                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                          : 'bg-slate-50/50 text-slate-800 border-slate-200 hover:bg-slate-100/60'
                                      }`}
                                    >
                                      <div className="space-y-0.5">
                                        <p className="text-xs font-bold font-mono">{sub.code}</p>
                                        <p className="text-xs font-semibold">{sub.name}</p>
                                        <p className={`text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                          {sub.points} pts
                                        </p>
                                      </div>
                                      <div className={`size-6 flex items-center justify-center rounded-lg text-xs font-bold ${
                                        isSelected ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600'
                                      }`}>
                                        {isSelected ? <Check className="size-3.5 stroke-[3]" /> : '+'}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <Button
                      type="button"
                      onClick={() => setIsPickerModalOpen(false)}
                      className="h-10 w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
                    >
                      PAKAI {itemsList.length} ACTIVITY
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Active Selected Checklist Box */}
              {itemsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-indigo-100">
                  {itemsList.map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-white border border-indigo-200 rounded-md px-2 py-1 text-[11px] text-indigo-900 font-medium shadow-2xs">
                      <b>{item.label}</b> ({item.points} pts)
                      <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:text-rose-700 font-bold ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* A. Daily Activity Items — Inline Editable Table (PDF Matched) */}
          <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">A. Daily Activity Items</CardTitle>
                  <CardDescription className="text-xs">
                    Rincian pekerjaan & aktivitas harian (format sesuai tabel PDF).
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                    {itemsList.length} Item • {itemsList.reduce((s, i) => s + (Number(i.points) || 0), 0)} Poin
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddItem}
                    className="h-8 text-xs font-semibold gap-1.5 bg-white border-slate-300 hover:bg-slate-50 shadow-2xs"
                  >
                    <Plus className="size-3.5" /> Tambah Baris
                  </Button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold mr-1">Preset Cepat:</span>
                {[
                  { name: 'P5M & Safety Briefing Awal Shift', pts: 5 },
                  { name: 'P2H & Pemeriksaan Alat Kerja', pts: 5 },
                  { name: 'Inspeksi Tekanan & Kondisi Tyre Unit HD', pts: 10 },
                  { name: 'Pemasangan & Dismounting Tyre OTR', pts: 15 },
                  { name: 'Housekeeping & 5R Area Workshop', pts: 5 },
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      const newItem: SessionItem = {
                        id: -Date.now(),
                        label: preset.name,
                        group: 'Technical',
                        unitNumber: '',
                        remark: '',
                        duration: '30m',
                        points: preset.pts,
                        sortOrder: itemsList.length + 1,
                      }
                      setItemsList((prev) => [...prev, newItem])
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-900 transition-colors shadow-2xs"
                  >
                    <Plus className="size-3 text-teal-600" /> {preset.name}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              {itemsList.length > 0 ? (
                <div className="space-y-3">
                  {itemsList.map((item, idx) => (
                    <div key={item.id || idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3 relative shadow-2xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold font-mono text-slate-500">
                            #{idx + 1} • {item.label.includes(' - ') ? item.label.split(' - ')[0] : 'SVC'}
                          </p>
                          <h6 className="text-xs font-extrabold text-slate-900 mt-0.5">
                            {item.label.includes(' - ') ? item.label.split(' - ').slice(1).join(' - ') : item.label}
                          </h6>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="size-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition-colors text-xs font-bold"
                          title="Hapus activity"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Equipment / Unit No.</Label>
                          <Input
                            placeholder="Unit / equipment number"
                            value={item.unitNumber || ''}
                            onChange={(e) => handleUpdateItem(idx, 'unitNumber', e.target.value)}
                            className="h-8.5 text-xs bg-white border-slate-200 font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-700">Mulai</Label>
                            <Input
                              type="time"
                              value={(item as any).startTime || '08:00'}
                              onChange={(e) => handleUpdateItem(idx, 'startTime', e.target.value)}
                              className="h-8.5 text-xs bg-white border-slate-200 text-center font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-700">Selesai</Label>
                            <Input
                              type="time"
                              value={(item as any).endTime || '08:30'}
                              onChange={(e) => handleUpdateItem(idx, 'endTime', e.target.value)}
                              className="h-8.5 text-xs bg-white border-slate-200 text-center font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1.5">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Camera className="size-3.5 text-slate-500" /> Photo Evidence
                        </span>
                        <div className="flex items-center gap-2">
                          {(item as any).photoUrl ? (
                            <div className="flex items-center gap-2">
                              <a href={(item as any).photoUrl} target="_blank" rel="noreferrer" className="inline-block">
                                <img src={(item as any).photoUrl} alt="Evidence" className="size-10 object-cover rounded-lg border border-slate-200" />
                              </a>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Ter-upload</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors">
                                <Camera className="size-3.5 text-slate-600" /> Kamera
                                <input type="file" accept="image/*" capture="environment" className="hidden" />
                              </label>
                              <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors">
                                <ImagePlus className="size-3.5 text-slate-600" /> Galeri
                                <input type="file" accept="image/*" className="hidden" />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Catatan Item</Label>
                        <Input
                          placeholder="Hasil kerja, temuan, atau catatan singkat."
                          value={itemRemarks[item.id] !== undefined ? itemRemarks[item.id] : (item.remark || '')}
                          onChange={(e) => {
                            const val = e.target.value
                            handleUpdateItem(idx, 'remark', val)
                            if (item.id) {
                              setItemRemarks((prev) => ({ ...prev, [item.id]: val }))
                            }
                          }}
                          className="h-8.5 text-xs bg-white border-slate-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada item aktivitas. Klik <span className="font-semibold text-slate-700">"Tambah Baris"</span> atau gunakan <span className="font-semibold text-indigo-700">"Pilih Activity Library"</span>.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Approval */}
          <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Status Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {approvalHistoryForDisplay.map((step, idx) => {
                const roleLabels: Record<string, string> = {
                  employee: 'Karyawan',
                  leader: 'PJO/TE',
                  section_head: 'Section Head',
                  manager: 'Department Head',
                  hr: 'HR',
                }
                const displayName =
                  step.approverName ||
                  (step.approverRole === 'leader'
                    ? (employeesProp.find((e) => String(e.id) === selectedLeaderId)?.name || 'PJO/TE')
                    : step.approverRole === 'section_head'
                    ? (employeesProp.find((e) => String(e.id) === selectedSuperiorId)?.name || 'Section Head')
                    : step.approverRole === 'manager'
                    ? (employeesProp.find((e) => String(e.id) === selectedManagerId)?.name || 'Department Head')
                    : step.approverRole === 'employee'
                    ? (profileForm.employeeName || data.employee.name || 'Karyawan')
                    : 'Belum ditentukan')

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

          {/* Signatories */}
          <Card className="rounded-[1.2rem] shadow-sm ring-1 ring-slate-200/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Signatories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Row 1: Leader */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Leader Name</Label>
                  <SearchableSelect
                    label="Leader"
                    placeholder="PILIH LEADER..."
                    value={selectedLeaderId}
                    onValueChange={handleLeaderChange}
                    options={employeesProp.map((emp) => ({
                      value: String(emp.id),
                      label: `${emp.name} - ${emp.rank || emp.position || 'Employee'}`,
                    }))}
                    widthClassName="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Leader Title</Label>
                  <Input
                    value={leaderTitle}
                    onChange={(e) => setLeaderTitle(e.target.value)}
                    placeholder="Leader Title"
                    className="h-10 bg-slate-50/60 border-slate-200 text-xs"
                  />
                </div>

                {/* Row 2: Superior */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Superior Name</Label>
                  <SearchableSelect
                    label="Superior"
                    placeholder="PILIH SUPERIOR..."
                    value={selectedSuperiorId}
                    onValueChange={handleSuperiorChange}
                    options={employeesProp.map((emp) => ({
                      value: String(emp.id),
                      label: `${emp.name} - ${emp.rank || emp.position || 'Employee'}`,
                    }))}
                    widthClassName="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Superior Title</Label>
                  <Input
                    value={superiorTitle}
                    onChange={(e) => setSuperiorTitle(e.target.value)}
                    placeholder="Superior Title"
                    className="h-10 bg-slate-50/60 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TTD Digital / Status Persetujuan */}
          <Card className={cn("rounded-[1.2rem] shadow-sm ring-1", isMyTurn ? "ring-amber-300/80 bg-white" : "ring-slate-200/70 bg-slate-50/40")}>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">
                    {isMyTurn ? `TTD Digital - ${activeSignerName}` : `Status Persetujuan - ${activeStep?.approverName || 'Approver'}`}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tahap: <strong>{activeStep?.stepLabel}</strong> ({activeStep?.approverName || 'Approver'})
                  </p>
                </div>
                {activeStep?.status === 'approved' ? (
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
              {activeStep?.status === 'approved' ? (
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
                      value={activeStepId ? stepRemarks[activeStepId] || '' : ''}
                      onChange={(e) => {
                        if (activeStepId) {
                          setStepRemarks((prev) => ({ ...prev, [activeStepId]: e.target.value }))
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
                        const id = activeStepId || activeStep?.id
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
                        const id = activeStepId || activeStep?.id
                        if (id) handleRevertStep(id)
                      }}
                    >
                      <RotateCcw className="mr-1 size-3.5" /> REVERT
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      className="rounded-full bg-[#115e59] hover:bg-[#0f766e] text-white font-bold text-xs uppercase px-5 py-2.5 shadow-sm ml-auto"
                      onClick={() => {
                        const sig = registeredSignature || (activeStepId ? signaturesByStepId[activeStepId] : '') || previewSig
                        if (!sig) {
                          toast.error('Anda belum mendaftarkan tanda tangan. Silakan daftarkan tanda tangan Anda terlebih dahulu.')
                          setIsRegisterModalOpen(true)
                          return
                        }
                        if (activeStepId) {
                          handleApproveStep(activeStepId)
                        } else {
                          handleSaveForm()
                        }
                      }}
                    >
                      {isPending ? 'MENYIMPAN & MENYETUJUI...' : 'TAMBAHKAN KE PDF & SETUJUI'}
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
              if (activeStepId) {
                setSignaturesByStepId((prev) => ({ ...prev, [activeStepId]: dataUrl }))
              }
            }}
          />
        </div>

        {/* ── KANAN: Preview Surat (Live A4 Preview) ── */}
        <div className={cn("rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:hidden overflow-auto", activeView === 'form' ? 'hidden xl:block' : 'block')}>
          <div
            id="pdf-page-1"
            className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
            style={{
              backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
              backgroundSize: '100% 100%',
            }}
          >
            {pdfDocumentContent}
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
    </div>
  </AdminPageShell>
)
}
