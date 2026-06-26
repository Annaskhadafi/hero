'use client'

import { useRef, useState, useTransition } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { approveContractReviewStep } from '@/app/actions/contract-review'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download } from 'lucide-react'

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
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [remarks, setRemarks] = useState(approval.remarks || '')
  const [error, setError] = useState('')
  const [done, setDone] = useState(approval.status === 'approved')
  const [approvalHistory, setApprovalHistory] = useState(allApprovals)
  const [previewSignatureDataUrl, setPreviewSignatureDataUrl] = useState(approval.signatureDataUrl || '')
  const [previewSignedAt, setPreviewSignedAt] = useState<string | Date | null>(approval.signedAt || null)
  const [isPending, startTransition] = useTransition()

  const [recommendation, setRecommendation] = useState<string>(review.recommendation || '')
  const [contractExtendedMonths, setContractExtendedMonths] = useState<number | undefined>(review.contractExtendedMonths || undefined)
  const [letterIssuance, setLetterIssuance] = useState<string>(review.letterIssuance || '')

  const isSectionHead = approval.approverRole === 'section_head_confirmation' || approval.approverRole === 'section_head_initial'
  const isDeptHead = approval.approverRole === 'central_service_manager'
  const isHr = approval.approverRole === 'hr'

  const canEditRecommendation = !done && (isSectionHead || isDeptHead || isHr)
  const canEditLetterIssuance = !done && isHr

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

  // Calculate achievement score
  const aVals = (review.performanceActivities ?? []).map((a: any) => a.achievement).filter(Boolean)
  const bVals = [review.compDisciplineAch, review.compSkillAch, review.compResultAch, review.compQualityAch, review.compCustomerAch, review.compTeamworkAch].filter(Boolean)
  const allVals = [...aVals, ...bVals]
  const achievementScore = allVals.length > 0 ? allVals.reduce((sum: number, val: string) => sum + (val === 'exceed' ? 115 : val === 'meet' ? 100 : 80), 0) / allVals.length : 0

  // PDF Page 1: Details, Profile, Performance, Competency
  const pdfPage1 = (
    <div className="relative z-10 text-[9pt] font-sans leading-tight text-black" style={{ paddingTop: '40mm', paddingBottom: '35mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <h1 className="text-center font-bold text-[11pt] mb-3">EMPLOYEE PROBATION/CONTRACT REVIEW</h1>

      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1">
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

      <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
      <div className="font-bold ml-4 mb-1">A. Performance</div>
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center">
        <thead>
          <tr className="bg-slate-50">
            <th className="w-[45%]">Activities</th>
            <th className="w-[30%]">Achievement<br/>( Below/ Meet/ Exceed<br/>Requirement )</th>
            <th className="w-[25%]">Remark</th>
          </tr>
        </thead>
        <tbody>
          {(review.performanceActivities ?? []).length > 0 ? (
            review.performanceActivities.map((item: any, i: number) => (
              <tr key={i}>
                <td className="text-left">{item.activity || '\u00A0'}</td>
                <td className="capitalize">{item.achievement || '\u00A0'}</td>
                <td>{item.remark || '\u00A0'}</td>
              </tr>
            ))
          ) : (
            <>
              <tr><td>{'\u00A0'}</td><td>{'\u00A0'}</td><td>{'\u00A0'}</td></tr>
              <tr><td>{'\u00A0'}</td><td>{'\u00A0'}</td><td>{'\u00A0'}</td></tr>
              <tr><td>{'\u00A0'}</td><td>{'\u00A0'}</td><td>{'\u00A0'}</td></tr>
            </>
          )}
        </tbody>
      </table>

      <div className="font-bold ml-4 mb-1 mt-1">B. Related Competency ( Knowledge & Behavior )</div>
      <table className="w-full border-collapse border border-black mb-2 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1">
        <thead>
          <tr className="bg-slate-50 text-center">
            <th className="w-[45%]">Activities</th>
            <th className="w-[30%]">Achievement<br/>( Below/ Meet/ Exceed<br/>Requirement )</th>
            <th className="w-[25%]">Remark</th>
          </tr>
        </thead>
        <tbody>
          {[
            { label: 'Discipline', ach: review.compDisciplineAch, rem: review.compDisciplineRemark },
            { label: 'Professional Skill and Knowledge', ach: review.compSkillAch, rem: review.compSkillRemark },
            { label: 'Achieving Result', ach: review.compResultAch, rem: review.compResultRemark },
            { label: 'Concern for Order, Quality and Accuracy', ach: review.compQualityAch, rem: review.compQualityRemark },
            { label: 'Customer Orientation ( internal / external )', ach: review.compCustomerAch, rem: review.compCustomerRemark },
            { label: 'Teamwork', ach: review.compTeamworkAch, rem: review.compTeamworkRemark },
          ].map((c, i) => (
            <tr key={i}>
              <td className="font-bold">{c.label}</td>
              <td className="text-center capitalize">{c.ach || '\u00A0'}</td>
              <td>{c.rem || '\u00A0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // PDF Page 2: Achievement, Signatories, Letter Issuance
  const pdfPage2 = (
    <div className="relative z-10 text-[9pt] font-sans leading-tight text-black" style={{ paddingTop: '40mm', paddingBottom: '35mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <div className="font-bold ml-4 mb-1">Achievement Definition</div>
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1">
        <tbody>
          <tr>
            <td className="w-[25%] text-center"><input type="checkbox" checked={achievementScore >= 106} readOnly /> Exceed Requirement (106% - 125%)</td>
            <td className="text-[7pt]">Performance of the employee is exceeding target and He/She consistently <strong>demonstrates right attitude and behavior</strong> which are aligned with the competence.</td>
          </tr>
          <tr>
            <td className="w-[25%] text-center"><input type="checkbox" checked={achievementScore >= 95 && achievementScore < 106} readOnly /> Meet Requirement (95% - 105%)</td>
            <td className="text-[7pt]">Performance of the employee is meeting target and in overall He/She <strong>demonstrates attitude and behavior</strong> which are aligned with the competence.</td>
          </tr>
          <tr>
            <td className="w-[25%] text-center"><input type="checkbox" checked={achievementScore > 0 && achievementScore < 95} readOnly /> Below Requirement (&lt; 95%)</td>
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

      <div className="font-bold mb-4">Signatories</div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 mb-8">
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
      <div>PT Chitra Paratama</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex gap-4 items-start">
        {/* ── KIRI: Header + Status + TTD ── */}
        <div className="w-[380px] shrink-0 space-y-4 sticky top-6">
          {/* Header */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contract Review Approval</p>
                <h1 className="mt-1 text-xl font-semibold text-slate-950">{review.employeeNameStr || 'Employee Contract Review'}</h1>
                <p className="mt-1 text-xs text-slate-500">Approver: {approval.approverName} ({ROLE_LABELS[approval.approverRole] || approval.approverRole})</p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">{done ? 'approved' : approval.status}</Badge>
            </div>
          </section>

          {/* Status Approval */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <h2 className="text-sm font-semibold text-slate-950 mb-3">Status Approval</h2>
            <div className="space-y-2">
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

          {/* TTD Digital */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <h2 className="text-sm font-semibold text-slate-950 mb-3">TTD Digital</h2>
            {done ? (
              <div className="space-y-3">
                <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">Approval sudah ditandatangani.</p>
                {approvalHistoryForDisplay.every((s: any) => s.status === 'approved') && (
                  <Button type="button" size="sm" className="w-full" onClick={() => {
                    // Sync values to attributes for print
                    document.querySelectorAll('#pdf-page-2 input[type="checkbox"]').forEach((el: any) => {
                      if (el.checked) el.setAttribute('checked', 'checked')
                      else el.removeAttribute('checked')
                    })
                    document.querySelectorAll('#pdf-page-2 input[type="number"]').forEach((el: any) => {
                      el.setAttribute('value', el.value)
                    })
                    const page1 = document.querySelector('#pdf-page-1')?.innerHTML || ''
                    const page2 = document.querySelector('#pdf-page-2')?.innerHTML || ''
                    const letterheadUrl = new URL('/ChitraParatama_Stationery_Letterhead_jkt.jpg', window.location.origin).toString()
                    const printWindow = window.open('', '_blank', 'width=900,height=1200')
                    if (!printWindow) return
                    printWindow.document.write(`<!doctype html><html><head><title>Contract Review - ${review.employeeNameStr || ''}</title>
                      <style>
                        @page { size: A4 portrait; margin: 0; }
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Manrope', 'Inter', Arial, sans-serif; }
                        .page { width: 210mm; height: 297mm; position: relative; page-break-after: always; overflow: hidden; background-size: 100% 100%; background-repeat: no-repeat; background-position: top center; }
                        .content { position: relative; z-index: 10; padding: 18mm 12mm 15mm 12mm; font-size: 7pt; line-height: 1.2; color: black; height: 100%; overflow: hidden; }
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
                      <div class="page" style="background-image: url('${letterheadUrl}')"><div class="content">${page1}</div></div>
                      <div class="page" style="background-image: url('${letterheadUrl}')"><div class="content">${page2}</div></div>
                      <script>setTimeout(() => { window.print(); }, 300);</script>
                    </body></html>`)
                    printWindow.document.close()
                  }}>
                    <Download className="mr-2 size-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  <SignatureCanvas ref={signatureRef} onEnd={updateSignaturePreview} canvasProps={{ className: 'h-40 w-full rounded-lg bg-white' }} />
                </div>
                <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Catatan opsional..." rows={2} />
                {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    signatureRef.current?.clear()
                    setPreviewSignatureDataUrl('')
                    setPreviewSignedAt(null)
                  }}>Bersihkan</Button>
                  <Button type="button" size="sm" className="flex-1" onClick={handleSubmit} disabled={isPending}>{isPending ? 'Menyimpan...' : 'Setuju & Tanda Tangani'}</Button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── KANAN: Preview Surat + Produktivitas ── */}
        <div className="flex-1 rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:hidden overflow-auto">
          <Tabs defaultValue="letter" className="flex flex-col gap-4">
            <TabsList className="grid w-full grid-cols-2 bg-white">
              <TabsTrigger value="letter">Preview Surat</TabsTrigger>
              <TabsTrigger value="productivity">Produktivitas</TabsTrigger>
            </TabsList>
            <TabsContent value="letter" className="m-0 flex flex-col gap-6">
              <div
                id="pdf-page-1"
                className="relative mx-auto shrink-0 min-h-[297mm] w-[210mm] overflow-hidden bg-white shadow-sm"
                style={{ backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)', backgroundSize: '100% 100%' }}
              >
                {pdfPage1}
              </div>
              <div
                id="pdf-page-2"
                className="relative mx-auto shrink-0 min-h-[297mm] w-[210mm] overflow-hidden bg-white shadow-sm"
                style={{ backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)', backgroundSize: '100% 100%' }}
              >
                {pdfPage2}
              </div>
            </TabsContent>
            <TabsContent value="productivity" className="m-0">
              {review.employeeId ? (
                <iframe
                  title="Profil Produktivitas Karyawan"
                  src={`/embedded/hc/employee/${review.employeeId}?view=tabs&contractReviewToken=${encodeURIComponent(token)}`}
                  className="h-[86vh] w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
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
    </main>
  )
}
