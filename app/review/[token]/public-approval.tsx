'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import {
  addContractReviewAttachment,
  approveContractReviewStep,
  deleteContractReviewAttachment,
  revertContractReviewStep,
} from '@/app/actions/contract-review'
import { uploadFile } from '@/app/actions/upload'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, RotateCcw, Upload, Paperclip, FileText, Image as ImageIcon, ExternalLink, Loader2, Trash2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type PublicApprovalProps = {
  token: string
  approval: any
  review: any
  allApprovals: any[]
  employee: any
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

const ROLE_LABELS: Record<string, string> = {
  pjo_or_te_initial: 'PJO/TE',
  section_head_initial: 'Section Head',
  employee: 'Karyawan',
  section_head_confirmation: 'Section Head',
  central_service_manager: 'Department Head',
  hr: 'HR',
}

function getSignatureStep(approvals: any[], role: string) {
  return approvals.find((s: any) => ['approved', 'preview'].includes(s.status) && s.signatureDataUrl && s.approverRole === role)
}

function hasVisibleCanvasInk(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return false
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > 0) return true
  }
  return false
}

export function ContractReviewPublicApproval({ token, approval, review, allApprovals, employee }: PublicApprovalProps) {
  const pathname = usePathname()
  const isMobileRoute = pathname.startsWith('/mobile/review/')
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [remarks, setRemarks] = useState(approval.remarks || '')
  const [error, setError] = useState('')
  const [done, setDone] = useState(approval.status === 'approved')
  const [approvalHistory, setApprovalHistory] = useState(allApprovals)
  const [previewSignatureDataUrl, setPreviewSignatureDataUrl] = useState(approval.signatureDataUrl || '')
  const [previewSignedAt, setPreviewSignedAt] = useState<Date | null>(approval.signedAt ? new Date(approval.signedAt) : null)
  const [isPending, startTransition] = useTransition()
  const [attachments, setAttachments] = useState<any[]>(review.attachments || [])
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [previewModalAttachment, setPreviewModalAttachment] = useState<any | null>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) {
      alert('File harus berupa PDF atau gambar (JPG/PNG).')
      e.target.value = ''
      return
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 5MB.')
      e.target.value = ''
      return
    }
    if (isPdf && file.size > 10 * 1024 * 1024) {
      alert('Ukuran PDF maksimal 10MB.')
      e.target.value = ''
      return
    }

    setIsUploadingAttachment(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadTarget', 'contract-review-attachment')
      formData.append('approvalToken', token)

      const res = await uploadFile(formData)
      if (!res.success || !res.url) {
        alert(res.error || 'Gagal mengunggah file.')
        return
      }

      const fileInfo = {
        fileName: file.name,
        fileUrl: res.url,
        fileType: isPdf ? 'pdf' : 'image',
        fileSize: file.size,
        uploadedBy: approval.approverName,
        uploadedByRole: ROLE_LABELS[approval.approverRole] || approval.approverRole,
      }

      const attachRes = await addContractReviewAttachment({
        token,
        file: fileInfo,
      })

      if (attachRes.success && attachRes.attachments) {
        setAttachments(attachRes.attachments)
      } else {
        alert(attachRes.error || 'Gagal menyimpan lampiran.')
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat upload file.')
    } finally {
      setIsUploadingAttachment(false)
      e.target.value = ''
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!confirm('Hapus lampiran ini?')) return
    try {
      const res = await deleteContractReviewAttachment({
        token,
        attachmentId,
      })
      if (res.success && res.attachments) {
        setAttachments(res.attachments)
      } else {
        alert(res.error || 'Gagal menghapus lampiran.')
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus lampiran.')
    }
  }

  const [recommendation, setRecommendation] = useState<string>(review.recommendation || '')
  const [contractExtendedMonths, setContractExtendedMonths] = useState<number | undefined>(review.contractExtendedMonths || undefined)
  const [letterIssuance, setLetterIssuance] = useState<string>(review.letterIssuance || '')
  const isWaitingForPreviousStep = approval.status === 'waiting'

  const isSectionHead = approval.approverRole === 'section_head_confirmation' || approval.approverRole === 'section_head_initial'
  const isDeptHead = approval.approverRole === 'central_service_manager'
  const isHr = approval.approverRole === 'hr'

  const canEditRecommendation = approval.status === 'pending' && !done && (isSectionHead || isDeptHead || isHr)
  const canEditLetterIssuance = approval.status === 'pending' && !done && isHr

  function getSignatureDataUrl() {
    const signature = signatureRef.current
    if (!signature) return ''
    const canvas = signature.getCanvas()
    if (!hasVisibleCanvasInk(canvas) && signature.isEmpty()) return ''
    try {
      return signature.getTrimmedCanvas().toDataURL('image/png')
    } catch {
      return signature.toDataURL('image/png')
    }
  }

  function updateSignaturePreview() {
    const signatureDataUrl = getSignatureDataUrl()
    if (!signatureDataUrl) return
    setPreviewSignatureDataUrl(signatureDataUrl)
    setPreviewSignedAt((current) => current || new Date())
  }

  function handleSubmit() {
    if (isWaitingForPreviousStep) {
      setError('Step sebelumnya belum selesai.')
      return
    }
    setError('')
    const signatureDataUrl = getSignatureDataUrl()
    if (!signatureDataUrl) {
      setError('TTD digital wajib diisi.')
      return
    }
    const signedAt = new Date()
    setPreviewSignatureDataUrl(signatureDataUrl)
    setPreviewSignedAt(signedAt)
    startTransition(async () => {
      const result = await approveContractReviewStep(token, {
        signatureDataUrl,
        remarks,
        recommendation: canEditRecommendation ? recommendation : undefined,
        contractExtendedMonths: canEditRecommendation ? contractExtendedMonths : undefined,
        letterIssuance: canEditLetterIssuance ? letterIssuance : undefined,
      })
      if (result.success) {
        setDone(true)
        setApprovalHistory((current) =>
          current.map((step: any) =>
            step.id === approval.id
              ? { ...step, status: 'approved', signatureDataUrl, remarks, signedAt }
              : step
          )
        )
      } else setError(result.error || 'Gagal menyimpan approval.')
    })
  }

  const previousApprovedSteps = approvalHistory.filter(
    (step: any) => step.stepOrder < approval.stepOrder && step.status === 'approved'
  )
  const [isRevertOpen, setIsRevertOpen] = useState(false)
  const [revertTargetStep, setRevertTargetStep] = useState<number | undefined>(
    previousApprovedSteps.length > 0 ? previousApprovedSteps[previousApprovedSteps.length - 1].stepOrder : undefined
  )
  const [revertRemarks, setRevertRemarks] = useState('')
  const [revertError, setRevertError] = useState('')
  const [isReverting, setIsReverting] = useState(false)
  const [revertedMessage, setRevertedMessage] = useState('')

  async function handleRevert() {
    if (!revertTargetStep) {
      setRevertError('Pilih pihak yang akan menerima pengembalian dokumen.')
      return
    }
    if (!revertRemarks.trim()) {
      setRevertError('Catatan / alasan revert wajib diisi.')
      return
    }
    setRevertError('')
    setIsReverting(true)
    try {
      const res = await revertContractReviewStep(token, {
        targetStepOrder: Number(revertTargetStep),
        remarks: revertRemarks.trim(),
      })
      if (res.success) {
        setIsRevertOpen(false)
        setRevertedMessage(`Dokumen telah berhasil dikembalikan ke Step ${res.targetStep} (${res.targetName}) untuk revisi.`)
        setApprovalHistory((prev: any[]) =>
          prev.map((step: any) => {
            if (step.stepOrder === res.targetStep) {
              return { ...step, status: 'pending', signatureDataUrl: null, signedAt: null }
            }
            if (step.stepOrder > (res.targetStep || 0)) {
              return {
                ...step,
                status: 'waiting',
                signatureDataUrl: null,
                signedAt: null,
                remarks: step.id === approval.id ? revertRemarks.trim() : step.remarks,
              }
            }
            return step
          })
        )
      } else {
        setRevertError(res.error || 'Gagal mengembalikan approval.')
      }
    } catch (err: any) {
      setRevertError(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsReverting(false)
    }
  }

  const shouldShowCurrentPreview = done || Boolean(previewSignatureDataUrl || remarks.trim())
  const approvalHistoryForDisplay = shouldShowCurrentPreview
    ? approvalHistory.map((step: any) =>
        step.id === approval.id
          ? {
              ...step,
              status: done ? 'approved' : 'preview',
              signatureDataUrl: previewSignatureDataUrl || step.signatureDataUrl,
              remarks,
              signedAt: previewSignedAt || step.signedAt,
            }
          : step
      )
    : approvalHistory

  const leaderSig = getSignatureStep(approvalHistoryForDisplay, 'pjo_or_te_initial') || getSignatureStep(approvalHistoryForDisplay, 'section_head_initial')
  const employeeSig = getSignatureStep(approvalHistoryForDisplay, 'employee')
  const sectionHeadSig = getSignatureStep(approvalHistoryForDisplay, 'section_head_confirmation')
  const managerSig = getSignatureStep(approvalHistoryForDisplay, 'central_service_manager')
  const hrSig = getSignatureStep(approvalHistoryForDisplay, 'hr')

  function renderApprovalMeta(step: any) {
    return (
      <>
        <div style={{ marginTop: '2px', fontSize: '7pt', color: '#6b7280' }}>Waktu TTD: {formatDateTime(step?.signedAt)}</div>
        {step?.remarks ? <div style={{ marginTop: '2px', fontSize: '7pt', color: '#4b5563' }}>Catatan: {step.remarks}</div> : null}
      </>
    )
  }

  // Helper to format achievement percentage
  const formatAchievementDisplay = (val: any) => {
    if (val === null || val === undefined || val === '') return '-'
    const num = Number(val)
    if (isNaN(num)) {
      if (val === 'meet') return '100%'
      if (val === 'exceed') return '115%'
      if (val === 'below') return '80%'
      return String(val)
    }
    return `${num}%`
  }

  // Calculate achievement score from percentage numbers
  const parsePercent = (v: any) => {
    if (v === null || v === undefined || v === '') return null
    const num = Number(v)
    if (!isNaN(num)) return num
    if (v === 'exceed') return 115
    if (v === 'meet') return 100
    if (v === 'below') return 80
    return null
  }

  const aVals = (review.performanceActivities ?? []).map((a: any) => parsePercent(a.achievement)).filter((v: any): v is number => v !== null)
  const bVals = [
    parsePercent(review.compDisciplineAch),
    parsePercent(review.compSkillAch),
    parsePercent(review.compResultAch),
    parsePercent(review.compQualityAch),
    parsePercent(review.compCustomerAch),
    parsePercent(review.compTeamworkAch),
  ].filter((v: any): v is number => v !== null)
  const allVals = [...aVals, ...bVals]
  const achievementScore = allVals.length > 0 ? Math.round(allVals.reduce((sum: number, val: number) => sum + val, 0) / allVals.length) : 0
  const achCategory = achievementScore >= 106 ? 'exceed' : achievementScore >= 95 ? 'meet' : achievementScore > 0 ? 'below' : ''

  const estimateRowHeightMm = (item: any) => {
    const act = String(item?.activity || '').trim()
    const rem = String(item?.remark || '').trim()
    const actLines = Math.max(1, Math.ceil(act.length / 50))
    const remLines = Math.max(1, Math.ceil(rem.length / 28))
    const maxLines = Math.max(actLines, remLines)
    return 4 + maxLines * 4.2
  }

  const { firstPageActivities, performanceOverflowChunks } = (() => {
    const all = review.performanceActivities ?? []
    const PAGE_1_ROWS_MAX_MM = 120
    const CONTINUATION_ROWS_MAX_MM = 180

    const first: any[] = []
    let usedMm = 0
    let i = 0

    for (; i < all.length; i++) {
      const h = estimateRowHeightMm(all[i])
      if (first.length > 0 && usedMm + h > PAGE_1_ROWS_MAX_MM) break
      if (first.length === 0 && h > PAGE_1_ROWS_MAX_MM) {
        first.push(all[i])
        i++
        break
      }
      first.push(all[i])
      usedMm += h
    }

    const overflow = all.slice(i)
    const chunks: any[][] = []
    let currentChunk: any[] = []
    let currentChunkMm = 0

    for (const item of overflow) {
      const h = estimateRowHeightMm(item)
      if (currentChunk.length > 0 && currentChunkMm + h > CONTINUATION_ROWS_MAX_MM) {
        chunks.push(currentChunk)
        currentChunk = [item]
        currentChunkMm = h
      } else {
        currentChunk.push(item)
        currentChunkMm += h
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    return { firstPageActivities: first, performanceOverflowChunks: chunks }
  })()
  const competencyRows = [
    ['Discipline', review.compDisciplineAch, review.compDisciplineRemark],
    ['Professional Skill and Knowledge', review.compSkillAch, review.compSkillRemark],
    ['Achieving Result', review.compResultAch, review.compResultRemark],
    ['Concern for Order, Quality and Accuracy', review.compQualityAch, review.compQualityRemark],
    ['Customer Orientation ( internal / external )', review.compCustomerAch, review.compCustomerRemark],
    ['Teamwork', review.compTeamworkAch, review.compTeamworkRemark],
  ]

  const estimateCompetencyRowHeightMm = (label: string, remark: string) => {
    const actLines = Math.max(1, Math.ceil(String(label || '').length / 38))
    const remLines = Math.max(1, Math.ceil(String(remark || '').length / 55))
    const maxLines = Math.max(actLines, remLines)
    return 4 + maxLines * 3.8
  }

  const totalCompetencyHeight = competencyRows.reduce(
    (sum, [label, _, remark]) => sum + estimateCompetencyRowHeightMm(label, remark || ''),
    0
  )
  const achievementBlockOnPage2 = totalCompetencyHeight + 18 + 72 <= 200

  const renderPerformanceTable = (items: any[], keyPrefix: string) => (
    <table className="w-full border-collapse border border-black mb-2 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5 text-center">
      <thead>
        <tr className="bg-slate-50">
          <th className="w-[35%]">Activities</th>
          <th className="w-[15%]">Achievement</th>
          <th className="w-[50%]">Remark</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any, i: number) => (
          <tr key={`${keyPrefix}-${i}`}>
            <td className="text-left">{item.activity || '\u00A0'}</td>
            <td className="text-center font-medium">{formatAchievementDisplay(item.achievement)}</td>
            <td className="text-left">{item.remark || '\u00A0'}</td>
          </tr>
        ))}
        {items.length === 0 && Array(5).fill(0).map((_, i) => (
          <tr key={`${keyPrefix}-empty-${i}`}><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        ))}
      </tbody>
    </table>
  )

  const renderAchievementAndRecommendation = () => (
    <>
      <div className="font-bold ml-4 mb-1 flex items-center justify-between">
        <span>Achievement Definition</span>
        {achievementScore > 0 ? (
          <span className="text-[7pt] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
            Rata-rata: {achievementScore}% ({achCategory === 'exceed' ? 'Exceed Requirement' : achCategory === 'meet' ? 'Meet Requirement' : 'Below Requirement'})
          </span>
        ) : null}
      </div>
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5">
        <tbody>
          <tr>
            <td className="w-[25%] text-center"><input type="checkbox" checked={achCategory === 'exceed'} readOnly /> Exceed Requirement (106% - 125%)</td>
            <td className="text-[7pt]">Performance of the employee is exceeding target and He/She consistently <strong>demonstrates right attitude and behavior</strong> which are aligned with the competence.</td>
          </tr>
          <tr>
            <td className="w-[25%] text-center"><input type="checkbox" checked={achCategory === 'meet'} readOnly /> Meet Requirement (95% - 105%)</td>
            <td className="text-[7pt]">Performance of the employee is meeting target and in overall He/She <strong>demonstrates attitude and behavior</strong> which are aligned with the competence.</td>
          </tr>
          <tr>
            <td className="w-[25%] text-center"><input type="checkbox" checked={achCategory === 'below'} readOnly /> Below Requirement (&lt; 95%)</td>
            <td className="text-[7pt]">Performance of the employee is not meeting target and He/She still <strong>demonstrating some attitudes and/ or behaviors</strong> which are not aligned with the competence.</td>
          </tr>
        </tbody>
      </table>

      <div className="font-bold ml-4 mb-1">Recommendation</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-[7pt]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={recommendation === 'confirm_permanent'}
            onChange={() => {
              if (canEditRecommendation) {
                setRecommendation(recommendation === 'confirm_permanent' ? '' : 'confirm_permanent')
              }
            }}
            disabled={!canEditRecommendation}
          />{' '}
          Confirm to Permanent
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={recommendation === 'terminate_probation'}
            onChange={() => {
              if (canEditRecommendation) {
                setRecommendation(recommendation === 'terminate_probation' ? '' : 'terminate_probation')
              }
            }}
            disabled={!canEditRecommendation}
          />{' '}
          Unsuccessful Probationary (termination)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={recommendation === 'contract_extended'}
            onChange={() => {
              if (canEditRecommendation) {
                setRecommendation(recommendation === 'contract_extended' ? '' : 'contract_extended')
              }
            }}
            disabled={!canEditRecommendation}
          />{' '}
          Contract Extended{' '}
          {canEditRecommendation && recommendation === 'contract_extended' ? (
            <input
              type="number"
              value={contractExtendedMonths ?? ''}
              onChange={(e) => setContractExtendedMonths(e.target.value ? Number(e.target.value) : undefined)}
              className="w-12 border-b border-black text-center focus:outline-none"
              placeholder="months"
            />
          ) : (
            contractExtendedMonths ? `${contractExtendedMonths} months` : ''
          )}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={recommendation === 'contract_ended'}
            onChange={() => {
              if (canEditRecommendation) {
                setRecommendation(recommendation === 'contract_ended' ? '' : 'contract_ended')
              }
            }}
            disabled={!canEditRecommendation}
          />{' '}
          Contract ended
        </label>
      </div>
    </>
  )

  // PDF Page 1: Details, Profile, Full Performance Section A
  const pdfPage1 = (
    <div className="relative z-10 text-[8pt] font-sans leading-tight text-black" style={{ paddingTop: '42mm', paddingBottom: '45mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <h1 className="text-center font-bold text-[11pt] mb-3">EMPLOYEE PROBATION/CONTRACT REVIEW</h1>

      <table className="w-full border-collapse border border-black mb-2 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5">
        <tbody>
          <tr><td colSpan={2} className="font-bold bg-slate-50">Details</td></tr>
          <tr>
            <td className="w-1/2">Today's Date: {review.todayDate ? new Date(review.todayDate).toLocaleDateString('id-ID') : '-'}</td>
            <td className="w-1/2">Hire Date: {review.hireDate ? new Date(review.hireDate).toLocaleDateString('id-ID') : '-'}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <div className="font-bold mb-1">Purpose of this form (check one):</div>
              <div className="flex gap-8">
                <label className="flex items-center gap-2"><input type="checkbox" checked={review.reviewType === 'probation'} readOnly /> Probationary Review</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={review.reviewType === 'contract'} readOnly /> Contract Review (length of contract {review.contractLength || '______'})</label>
              </div>
            </td>
          </tr>
          <tr><td colSpan={2} className="font-bold bg-slate-50">Employee Profile</td></tr>
          <tr>
            <td>Name:<br/>{employee?.name || review.employeeNameStr || '-'}</td>
            <td>SN:<br/>{employee?.employeeSn || '-'}</td>
          </tr>
          <tr>
            <td>Job Title:<br/>{employee?.position || '-'}</td>
            <td>Department/Section:<br/>{employee?.department ? [employee.department, employee.section].filter(Boolean).join(' / ') : '-'}</td>
          </tr>
          <tr>
            <td>Superior Name:<br/>{review.leaderName || review.superiorName || review.nextSuperiorName || '-'}</td>
            <td>Superior Title:<br/>{review.leaderTitle || review.superiorTitle || review.nextSuperiorTitle || '-'}</td>
          </tr>
        </tbody>
      </table>

      {firstPageActivities.length > 0 ? (
        <>
          <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
          <div className="font-bold ml-4 mb-1">A. Performance</div>
          {renderPerformanceTable(firstPageActivities, 'first')}
        </>
      ) : null}
    </div>
  )

  const pdfPerformancePages = performanceOverflowChunks.map((chunk, index) => (
    <div key={`performance-page-${index}`} className="relative z-10 text-[8pt] font-sans leading-tight text-black" style={{ paddingTop: '42mm', paddingBottom: '45mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
      <div className="font-bold ml-4 mb-1">A. Performance (lanjutan)</div>
      {renderPerformanceTable(chunk, `overflow-${index}`)}
    </div>
  ))

  // PDF Page 2: Full Competency Section B, Achievement Definition, Recommendation
  const pdfPage2 = (
    <div className="relative z-10 text-[8pt] font-sans leading-tight text-black" style={{ paddingTop: '42mm', paddingBottom: '45mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
      <div className="font-bold ml-4 mb-1">B. Related Competency ( Knowledge & Behavior )</div>
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5">
        <thead><tr className="bg-slate-50 text-center"><th className="w-[35%]">Activities</th><th className="w-[15%]">Achievement</th><th className="w-[50%]">Remark</th></tr></thead>
        <tbody>{competencyRows.map(([label, achievement, remark]) => <tr key={label}><td className="font-bold">{label}</td><td className="text-center font-medium">{formatAchievementDisplay(achievement)}</td><td>{remark || '\u00A0'}</td></tr>)}</tbody>
      </table>

      {achievementBlockOnPage2 ? (
        <>
          {/* Achievement Definition */}
          {/* Recommendation */}
          {renderAchievementAndRecommendation()}
        </>
      ) : null}
    </div>
  )

  // PDF Page 3: Signatories and HR letter issuance
  const pdfPage3 = (
    <div className="relative z-10 text-[8pt] font-sans leading-tight text-black" style={{ paddingTop: '42mm', paddingBottom: '45mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      {!achievementBlockOnPage2 ? renderAchievementAndRecommendation() : null}
      <div className="font-bold mb-4">Signatories</div>
      <div className={`grid grid-cols-2 gap-x-8 ${!achievementBlockOnPage2 ? 'gap-y-4 mb-4' : 'gap-y-8 mb-6'}`}>
        {review.leaderName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Leader Signature</div>
            <div className="h-20 flex items-end">
              {leaderSig && <img src={leaderSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
            </div>
            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{review.leaderName}</div>
            <div className="text-xs">{review.leaderTitle || 'Leader'}</div>
            {renderApprovalMeta(leaderSig)}
          </div>
        )}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Employee Signature</div>
          <div className="h-20 flex items-end">
            {employeeSig && <img src={employeeSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
          </div>
          <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{employee?.name || review.employeeNameStr || '\u00A0'}</div>
          <div className="text-xs">{employee?.position || 'Employee'}</div>
          {renderApprovalMeta(employeeSig)}
        </div>
        {review.superiorName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Superior Signature</div>
            <div className="h-20 flex items-end">
              {sectionHeadSig && <img src={sectionHeadSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
            </div>
            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{review.superiorName}</div>
            <div className="text-xs">{review.superiorTitle || 'Superior'}</div>
            {renderApprovalMeta(sectionHeadSig)}
          </div>
        )}
        {review.hrName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">HR Signature</div>
            <div className="h-20 flex items-end">
              {hrSig && <img src={hrSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
            </div>
            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{review.hrName}</div>
            <div className="text-xs">{review.hrTitle || 'HR'}</div>
            {renderApprovalMeta(hrSig)}
          </div>
        )}
        {review.nextSuperiorName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Next Superior Signature</div>
            <div className="h-20 flex items-end">
              {managerSig && <img src={managerSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
            </div>
            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{review.nextSuperiorName}</div>
            <div className="text-xs">{review.nextSuperiorTitle || 'Manager'}</div>
            {renderApprovalMeta(managerSig)}
          </div>
        )}
        <div>
          <div className="font-bold mb-2">Letter Issuance by HR</div>
          <div className="text-[7pt]" style={{ display: 'grid', gap: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={letterIssuance === 'permanent_confirmation'}
                onChange={() => {
                  if (canEditLetterIssuance) {
                    setLetterIssuance(letterIssuance === 'permanent_confirmation' ? '' : 'permanent_confirmation')
                  }
                }}
                disabled={!canEditLetterIssuance}
              />{' '}
              <span>Permanent Confirmation</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={letterIssuance === 'contract_extension'}
                onChange={() => {
                  if (canEditLetterIssuance) {
                    setLetterIssuance(letterIssuance === 'contract_extension' ? '' : 'contract_extension')
                  }
                }}
                disabled={!canEditLetterIssuance}
              />{' '}
              <span>Contract extension</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={letterIssuance === 'unsuccessful_probation'}
                onChange={() => {
                  if (canEditLetterIssuance) {
                    setLetterIssuance(letterIssuance === 'unsuccessful_probation' ? '' : 'unsuccessful_probation')
                  }
                }}
                disabled={!canEditLetterIssuance}
              />{' '}
              <span>Unsuccessful probation notification</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={letterIssuance === 'end_of_contract'}
                onChange={() => {
                  if (canEditLetterIssuance) {
                    setLetterIssuance(letterIssuance === 'end_of_contract' ? '' : 'end_of_contract')
                  }
                }}
                disabled={!canEditLetterIssuance}
              />{' '}
              <span>End of contract notification</span>
            </label>
          </div>
        </div>
      </div>
      <div className="text-right mt-6 text-gray-500 text-[7pt]">
        F.HR.STD.012.00
      </div>
    </div>
  )

  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const [pdfScale, setPdfScale] = useState(1)
  const PDF_WIDTH_PX = 794

  useEffect(() => {
    if (!isMobileRoute) return
    const update = () => {
      const container = pdfContainerRef.current
      if (!container) return
      const available = container.clientWidth
      setPdfScale(Math.min(1, available / PDF_WIDTH_PX))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [isMobileRoute])

  return (
    <main className={isMobileRoute ? 'min-h-dvh bg-slate-50 px-2 py-3' : 'min-h-screen bg-slate-50 px-3 py-4 sm:px-4 sm:py-6'}>
      <div className="mx-auto flex w-full max-w-[1800px] flex-col items-stretch gap-4 xl:flex-row xl:items-start">
        {/* ── KIRI: Header + Status + TTD ── */}
        <div className={isMobileRoute ? 'w-full shrink-0 space-y-3' : 'w-full shrink-0 space-y-4 xl:sticky xl:top-6 xl:w-[380px]'}>
          {/* Header */}
          <section className={isMobileRoute ? 'rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70' : 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70'}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contract Review Approval</p>
                <h1 className="mt-1 text-lg font-semibold text-slate-950 sm:text-xl">{review.employeeNameStr || 'Employee Contract Review'}</h1>
                <p className="mt-1 text-xs text-slate-500">Approver: {approval.approverName} ({ROLE_LABELS[approval.approverRole] || approval.approverRole})</p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">{done ? 'approved' : approval.status}</Badge>
            </div>
          </section>

          {/* Status Approval */}
          <section className={isMobileRoute ? 'rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70' : 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5'}>
            <h2 className="text-sm font-semibold text-slate-950 mb-3">Status Approval</h2>
            <div className="max-h-[44vh] space-y-2 overflow-y-auto pr-1 xl:max-h-none xl:overflow-visible xl:pr-0">
              {approvalHistoryForDisplay.map((step: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{step.approverName}</p>
                    <p className="text-[10px] text-slate-500">{ROLE_LABELS[step.approverRole] || step.approverRole}</p>
                    {['approved', 'preview'].includes(step.status) ? (
                      <div className="mt-1 space-y-0.5 text-[10px] text-slate-500">
                        <p>Waktu TTD: {formatDateTime(step.signedAt)}</p>
                        {step.remarks ? <p className="line-clamp-2">Catatan: {step.remarks}</p> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {step.status === 'approved' ? (
                      <>
                        <Badge className="bg-emerald-50 text-emerald-700 rounded-full border-0 px-2 text-[10px]">Disetujui</Badge>
                        {step.signatureDataUrl && <img src={step.signatureDataUrl} alt="TTD" className="h-6 object-contain" />}
                      </>
                    ) : step.status === 'preview' ? (
                      <>
                        <Badge className="bg-sky-50 text-sky-700 rounded-full border-0 px-2 text-[10px]">Preview Anda</Badge>
                        {step.signatureDataUrl && <img src={step.signatureDataUrl} alt="TTD" className="h-6 object-contain" />}
                      </>
                    ) : step.status === 'rejected' ? (
                      <Badge className="bg-red-50 text-red-700 rounded-full border-0 px-2 text-[10px]">Ditolak</Badge>
                    ) : approval.status === 'pending' && step.id === approval.id ? (
                      <Badge className="bg-amber-50 text-amber-600 rounded-full border-0 px-2 text-[10px]">Menunggu Anda</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full px-2 text-[10px] text-slate-400">Menunggu</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Lampiran Dokumen Pendukung */}
          <section className={isMobileRoute ? 'rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70' : 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5'}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="size-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-950">Lampiran Dokumen</h2>
              </div>
              <Badge variant="outline" className="text-xs">
                {attachments.length} berkas
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Unggah PDF atau gambar pendukung (bukti evaluasi, catatan performa, dsb). Dokumen dapat dilihat oleh seluruh penandatangan.
            </p>

            {/* Upload Button */}
            <div className="mb-3">
              <input
                id="public-attachment-upload"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploadingAttachment}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700"
                disabled={isUploadingAttachment}
                onClick={() => document.getElementById('public-attachment-upload')?.click()}
              >
                {isUploadingAttachment ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin text-indigo-600" />
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 size-4 text-indigo-600" />
                    Upload Dokumen Pendukung
                  </>
                )}
              </Button>
            </div>

            {/* List of attachments */}
            {attachments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                Belum ada lampiran pendukung.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {attachments.map((att: any, idx: number) => (
                  <div key={att.id || idx} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {att.fileType === 'pdf' ? (
                        <FileText className="size-4 text-rose-500 shrink-0" />
                      ) : (
                        <ImageIcon className="size-4 text-sky-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setPreviewModalAttachment(att)}
                          className="font-medium text-slate-800 hover:text-indigo-600 truncate block text-left hover:underline"
                          title="Klik untuk preview"
                        >
                          {att.fileName}
                        </button>
                        <p className="text-[10px] text-slate-400 truncate">
                          {att.uploadedBy} · {att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString('id-ID') : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewModalAttachment(att)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                        title="Preview Dokumen"
                      >
                        <Eye className="size-3" /> Preview
                      </button>
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                        title="Buka File di Tab Baru"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus Lampiran"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* TTD Digital */}
          <section className={isMobileRoute ? 'rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70' : 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70'}>
            <h2 className="text-sm font-semibold text-slate-950 mb-3">TTD Digital</h2>
            {revertedMessage ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                  <p className="font-semibold flex items-center gap-1.5">
                    <RotateCcw className="size-4" /> Dokumen Berhasil Dikembalikan
                  </p>
                  <p className="mt-1 text-xs text-amber-700">{revertedMessage}</p>
                </div>
              </div>
            ) : done ? (
              <div className="space-y-3">
                <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">Approval sudah ditandatangani.</p>
                {approvalHistoryForDisplay.every((s: any) => s.status === 'approved') && (
                  <Button type="button" size="sm" className="w-full" onClick={() => {
                    // Sync values to attributes for print
                    const pageElements = Array.from(document.querySelectorAll<HTMLElement>('[data-contract-review-page]'))
                    pageElements.forEach((page) => {
                      page.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((el) => {
                        if (el.checked) el.setAttribute('checked', 'checked')
                        else el.removeAttribute('checked')
                      })
                      page.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach((el) => {
                        el.setAttribute('value', el.value)
                      })
                    })
                    const pageHtml = pageElements.map((page) => {
                      const copy = page.cloneNode(true) as HTMLElement
                      copy.querySelectorAll('img[alt="Chitra Paratama letterhead"]').forEach((image) => image.remove())
                      return copy.innerHTML
                    })
                    const letterheadUrl = new URL('/ChitraParatama_Stationery_Letterhead_jkt.jpg', window.location.origin).toString()
                    const printWindow = window.open('', '_blank', 'width=900,height=1200')
                    if (!printWindow) return
                    printWindow.document.write(`<!doctype html><html><head><title>Contract Review - ${review.employeeNameStr || ''}</title>
                      <style>
                        @page { size: A4 portrait; margin: 0; }
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Manrope', 'Inter', Arial, sans-serif; }
                        .page { width: 210mm; height: 297mm; position: relative; page-break-after: always; overflow: hidden; background-size: 100% 100%; background-repeat: no-repeat; background-position: top center; }
                        .content { position: relative; z-index: 10; width: 210mm; height: 297mm; overflow: hidden; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; }
                        td, th { border: 1px solid black; padding: 2px 4px; font-size: 7pt; }
                        th { font-weight: bold; background: #f8fafc; }
                        .font-bold { font-weight: bold; }
                        .text-center { text-align: center; }
                        .text-left { text-align: left; }
                        .capitalize { text-transform: capitalize; }
                        .grid { display: grid; }
                        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                        .gap-x-8 { column-gap: 1.5rem; }
                        .gap-y-10 { row-gap: 2rem; }
                        .mb-1 { margin-bottom: 0.2rem; }
                        .mb-3 { margin-bottom: 0.5rem; }
                        .mb-4 { margin-bottom: 0.75rem; }
                        .mb-8 { margin-bottom: 1.5rem; }
                        .ml-4 { margin-left: 0.75rem; }
                        .mt-2 { margin-top: 0.4rem; }
                        input[type="checkbox"] { margin-right: 3px; }
                        img { max-height: 50px; object-fit: contain; }
                        .border-b { border-bottom: 1px solid black; }
                        .w-full { width: 100%; }
                      </style>
                    </head><body>
                      ${pageHtml.map((html) => `<div class="page" style="background-image: url('${letterheadUrl}')"><div class="content">${html}</div></div>`).join('')}
                      <script>setTimeout(() => { window.print(); }, 300);</script>
                    </body></html>`)
                    printWindow.document.close()
                  }}>
                    <Download className="mr-2 size-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            ) : isWaitingForPreviousStep ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">
                TTD belum aktif. Menunggu step sebelumnya selesai.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  <SignatureCanvas ref={signatureRef} onEnd={updateSignaturePreview} canvasProps={{ className: isMobileRoute ? 'h-36 w-full touch-none rounded-lg bg-white' : 'h-44 w-full touch-none rounded-lg bg-white sm:h-40' }} />
                </div>
                <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Catatan opsional..." rows={2} />
                {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    signatureRef.current?.clear()
                    setPreviewSignatureDataUrl('')
                    setPreviewSignedAt(null)
                  }}>Bersihkan</Button>
                  <Button type="button" size="sm" className="flex-1" onClick={handleSubmit} disabled={isPending}>{isPending ? 'Menyimpan...' : 'Setuju & Tanda Tangani'}</Button>
                </div>
                {previousApprovedSteps.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                    onClick={() => {
                      setRevertError('')
                      setIsRevertOpen(true)
                    }}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Kembalikan Dokumen (Revert)
                  </Button>
                )}
              </div>
            )}
          </section>

          <Dialog open={isRevertOpen} onOpenChange={setIsRevertOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-800">
                  <RotateCcw className="size-4" />
                  Kembalikan Dokumen (Revert)
                </DialogTitle>
                <DialogDescription>
                  Kembalikan dokumen ke penandatangan sebelumnya untuk dilakukan koreksi atau kelengkapan data.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Pilih Pihak Tujuan Revert:
                  </label>
                  <div className="space-y-2">
                    {previousApprovedSteps.map((step: any) => (
                      <label
                        key={step.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          revertTargetStep === step.stepOrder
                            ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="revertTargetStep"
                          className="mt-0.5"
                          checked={revertTargetStep === step.stepOrder}
                          onChange={() => setRevertTargetStep(step.stepOrder)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900">{step.approverName}</p>
                          <p className="text-[11px] text-slate-500">
                            Step {step.stepOrder} • {ROLE_LABELS[step.approverRole] || step.approverRole}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Catatan / Alasan Revert <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={revertRemarks}
                    onChange={(e) => setRevertRemarks(e.target.value)}
                    placeholder="Contoh: Dokumen atau lampiran kurang lengkap, mohon perbaiki penilaian aktivitas..."
                    rows={3}
                  />
                </div>

                {revertError && <p className="text-xs font-medium text-red-600">{revertError}</p>}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRevertOpen(false)}
                  disabled={isReverting}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleRevert}
                  disabled={isReverting || !revertTargetStep || !revertRemarks.trim()}
                >
                  {isReverting ? 'Mengembalikan...' : 'Konfirmasi Revert'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── KANAN: Preview Surat + Produktivitas ── */}
        <div className={isMobileRoute ? 'min-w-0 flex-1 rounded-xl bg-slate-100 p-1.5 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:hidden' : 'min-w-0 flex-1 rounded-[1.1rem] bg-slate-100 p-2 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(66,71,80,0.06)] print:hidden sm:p-4'}>
          <Tabs defaultValue="letter" className="flex flex-col gap-4">
            <TabsList className="grid h-auto w-full grid-cols-2 bg-white">
              <TabsTrigger value="letter">Preview Surat</TabsTrigger>
              <TabsTrigger value="productivity">Produktivitas</TabsTrigger>
            </TabsList>
            <TabsContent value="letter" className="m-0 pb-2">
              <div ref={pdfContainerRef} className={isMobileRoute ? 'w-full overflow-hidden' : 'overflow-x-auto'}>
                <div
                  className="flex flex-col gap-6"
                  style={isMobileRoute ? {
                    width: `${PDF_WIDTH_PX}px`,
                    transform: `scale(${pdfScale})`,
                    transformOrigin: 'top left',
                  } : { minWidth: 'max-content' }}
                >
                <div
                  id="pdf-page-1"
                  data-contract-review-page="true"
                  className="relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
                >
                  <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
                  {pdfPage1}
                </div>
                {pdfPerformancePages.map((page, index) => (
                  <div key={`performance-page-${index}`} id={`pdf-page-performance-${index}`} data-contract-review-page="true" className="relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm">
                    <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
                    {page}
                  </div>
                ))}
                <div
                  id="pdf-page-2"
                  data-contract-review-page="true"
                  className="relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
                >
                  <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
                  {pdfPage2}
                </div>
                <div id="pdf-page-3" data-contract-review-page="true" className="relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm">
                  <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
                  {pdfPage3}
                </div>

                {/* ── LAMPIRAN DOKUMEN PENDUKUNG PREVIEW ── */}
                {attachments && attachments.length > 0 && (
                  <div className="relative mx-auto w-[210mm] shrink-0 rounded-xl bg-white p-6 shadow-sm border border-slate-200 text-slate-800">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Paperclip className="size-5 text-indigo-600" />
                        <h3 className="font-bold text-base text-slate-900">Lampiran Dokumen Pendukung ({attachments.length})</h3>
                      </div>
                      <span className="text-xs text-slate-500">Dapat dilihat oleh seluruh penandatangan</span>
                    </div>
                    <div className="flex flex-col gap-6">
                      {attachments.map((att: any, idx: number) => (
                        <div key={att.id || idx} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {att.fileType === 'pdf' ? (
                                <FileText className="size-5 text-rose-500 shrink-0" />
                              ) : (
                                <ImageIcon className="size-5 text-sky-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-slate-800 truncate">{att.fileName}</p>
                                <p className="text-xs text-slate-500">
                                  Diunggah oleh: <span className="font-medium text-slate-700">{att.uploadedBy}</span>
                                  {att.uploadedByRole ? ` (${att.uploadedByRole})` : ''} · {att.uploadedAt ? new Date(att.uploadedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 px-2.5 text-xs text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100/70"
                                onClick={() => setPreviewModalAttachment(att)}
                              >
                                <Eye className="size-3.5" /> Preview
                              </Button>
                              <a
                                href={att.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shrink-0"
                              >
                                <ExternalLink className="size-3.5" /> Buka Tab Baru
                              </a>
                            </div>
                          </div>
                          {att.fileType === 'pdf' ? (
                            <div className="rounded-lg border border-slate-300 bg-white overflow-hidden shadow-inner relative">
                              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-xs text-slate-600">
                                <span className="font-medium truncate">Viewer Dokumen PDF</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewModalAttachment(att)}
                                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                                  >
                                    <Eye className="size-3" /> Layar Penuh
                                  </button>
                                  <a
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-slate-600 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="size-3" /> Tab Baru
                                  </a>
                                </div>
                              </div>
                              <iframe
                                src={`${att.fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                                title={att.fileName}
                                className="w-full h-[650px] border-0 bg-white"
                              />
                            </div>
                          ) : (
                            <div
                              className="flex flex-col items-center justify-center rounded-lg border border-slate-300 bg-slate-50 p-2 relative group cursor-pointer"
                              onClick={() => setPreviewModalAttachment(att)}
                            >
                              <img
                                src={att.fileUrl}
                                alt={att.fileName}
                                className="max-h-[700px] max-w-full object-contain rounded shadow-sm hover:opacity-95 transition"
                              />
                              <span className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                <Eye className="size-3 text-indigo-600" /> Klik gambar untuk memperbesar / layar penuh
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </TabsContent>
            <TabsContent value="productivity" className="m-0">
              {review.employeeId ? (
                <iframe
                  title="Profil Produktivitas Karyawan"
                  src={`/embedded/hc/employee/${review.employeeId}?view=tabs&contractReviewToken=${encodeURIComponent(token)}`}
                  className="h-[72vh] w-full rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-[86vh]"
                />
              ) : (
                <div className="rounded-2xl bg-white py-10 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">
                  Data karyawan belum tersedia untuk melihat profil produktivitas.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal Wide Dialog Preview Dokumen */}
      <Dialog open={Boolean(previewModalAttachment)} onOpenChange={(open) => !open && setPreviewModalAttachment(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[88vh] flex flex-col p-0 overflow-hidden bg-slate-900 border-slate-800 text-white">
          <DialogHeader className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
              {previewModalAttachment?.fileType === 'pdf' ? (
                <FileText className="size-5 text-rose-400 shrink-0" />
              ) : (
                <ImageIcon className="size-5 text-sky-400 shrink-0" />
              )}
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold truncate text-white">
                  {previewModalAttachment?.fileName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 truncate">
                  Diunggah oleh {previewModalAttachment?.uploadedBy} {previewModalAttachment?.uploadedByRole ? `(${previewModalAttachment.uploadedByRole})` : ''} · {previewModalAttachment?.uploadedAt ? new Date(previewModalAttachment.uploadedAt).toLocaleString('id-ID') : ''}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={previewModalAttachment?.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition"
              >
                <ExternalLink className="size-3.5" /> Buka Tab Baru
              </a>
              <a
                href={previewModalAttachment?.fileUrl}
                download={previewModalAttachment?.fileName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                <Download className="size-3.5" /> Unduh
              </a>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-2 sm:p-4">
            {previewModalAttachment?.fileType === 'pdf' ? (
              <iframe
                src={`${previewModalAttachment.fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                title={previewModalAttachment.fileName}
                className="w-full h-full min-h-[60vh] rounded border border-slate-800 bg-white"
              />
            ) : (
              <img
                src={previewModalAttachment?.fileUrl}
                alt={previewModalAttachment?.fileName}
                className="max-h-full max-w-full object-contain rounded shadow-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
