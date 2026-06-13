'use client'

import { useRef, useState, useTransition } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { approveContractReviewStep } from '@/app/actions/contract-review'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'

type PublicApprovalProps = {
  token: string
  approval: any
  review: any
  allApprovals: any[]
  employee: any
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID')
}

const ROLE_LABELS: Record<string, string> = {
  pjo_or_te_initial: 'PJO/TE',
  section_head_initial: 'Section Head',
  employee: 'Karyawan',
  section_head_confirmation: 'Section Head',
  central_service_manager: 'Manager Central Services',
  hr: 'HR',
}

function getApprovedSig(approvals: any[], role: string) {
  return approvals.find((s: any) => s.status === 'approved' && s.signatureDataUrl && s.approverRole === role)
}

export function ContractReviewPublicApproval({ token, approval, review, allApprovals, employee }: PublicApprovalProps) {
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(approval.status === 'approved')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError('')
    const canvas = signatureRef.current
    if (!canvas || canvas.isEmpty()) {
      setError('TTD digital wajib diisi.')
      return
    }
    const signatureDataUrl = canvas.getTrimmedCanvas().toDataURL('image/png')
    startTransition(async () => {
      const result = await approveContractReviewStep(token, { signatureDataUrl, remarks })
      if (result.success) setDone(true)
      else setError(result.error || 'Gagal menyimpan approval.')
    })
  }

  const leaderSig = getApprovedSig(allApprovals, 'pjo_or_te_initial') || getApprovedSig(allApprovals, 'section_head_initial')
  const employeeSig = getApprovedSig(allApprovals, 'employee')
  const sectionHeadSig = getApprovedSig(allApprovals, 'section_head_confirmation')
  const managerSig = getApprovedSig(allApprovals, 'central_service_manager')
  const hrSig = getApprovedSig(allApprovals, 'hr')

  // ── PDF Page 1: Details, Profile, Performance ──
  const pdfPage1 = (
    <div className="relative z-10 text-[9pt] font-sans leading-tight text-black" style={{ paddingTop: '40mm', paddingBottom: '35mm', paddingLeft: '20mm', paddingRight: '20mm' }}>
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
    </div>
  )

  // ── PDF Page 2: Competency, Signatories, Letter Issuance ──
  const pdfPage2 = (
    <div className="relative z-10 text-[9pt] font-sans leading-tight text-black" style={{ paddingTop: '40mm', paddingBottom: '35mm', paddingLeft: '20mm', paddingRight: '20mm' }}>
      <div className="font-bold ml-4 mb-1">B. Related Competency ( Knowledge & Behavior )</div>
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1">
        <thead>
          <tr className="bg-slate-50">
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

      <div className="font-bold mb-4">Signatories</div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 mb-8">
        {review.leaderName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Leader Signature</div>
            <div className="h-20 flex items-end">
              {leaderSig && <img src={leaderSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
            </div>
            <div className="border-b border-black w-full mb-1">{review.leaderName}</div>
            <div className="text-xs">{review.leaderTitle || 'Leader'}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Employee Signature</div>
          <div className="h-20 flex items-end">
            {employeeSig && <img src={employeeSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
          </div>
          <div className="border-b border-black w-full mb-1">{employee?.name || review.employeeNameStr || '\u00A0'}</div>
          <div className="text-xs">{employee?.position || 'Employee'}</div>
        </div>
        {review.superiorName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Superior Signature</div>
            <div className="h-20 flex items-end">
              {sectionHeadSig && <img src={sectionHeadSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
            </div>
            <div className="border-b border-black w-full mb-1">{review.superiorName}</div>
            <div className="text-xs">{review.superiorTitle || 'Superior'}</div>
          </div>
        )}
        {review.hrName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">HR Signature</div>
            <div className="h-20 flex items-end">
              {hrSig && <img src={hrSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
            </div>
            <div className="border-b border-black w-full mb-1">{review.hrName}</div>
            <div className="text-xs">{review.hrTitle || 'HR'}</div>
          </div>
        )}
        {review.nextSuperiorName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Next Superior Signature</div>
            <div className="h-20 flex items-end">
              {managerSig && <img src={managerSig.signatureDataUrl} alt="TTD" className="h-16 object-contain" />}
            </div>
            <div className="border-b border-black w-full mb-1">{review.nextSuperiorName}</div>
            <div className="text-xs">{review.nextSuperiorTitle || 'Manager'}</div>
          </div>
        )}
        <div>
          <div className="font-bold mb-4">Letter Issuance by HR</div>
          <div className="space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={review.letterIssuance === 'permanent_confirmation'} readOnly /> Permanent Confirmation</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={review.letterIssuance === 'contract_extension'} readOnly /> Contract extension</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={review.letterIssuance === 'unsuccessful_probation'} readOnly /> Unsuccessful probation notification</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={review.letterIssuance === 'end_of_contract'} readOnly /> End of contract notification</label>
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
              {allApprovals.map((step: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{step.approverName}</p>
                    <p className="text-[10px] text-slate-500">{ROLE_LABELS[step.approverRole] || step.approverRole}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {step.status === 'approved' ? (
                      <>
                        <Badge className="bg-emerald-50 text-emerald-700 rounded-full border-0 px-2 text-[10px]">Disetujui</Badge>
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
                {allApprovals.every((s: any) => s.status === 'approved') && (
                  <Button type="button" size="sm" className="w-full" onClick={() => {
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
                        .page { width: 210mm; min-height: 297mm; position: relative; page-break-after: always; overflow: hidden; background-size: 100% 100%; background-repeat: no-repeat; background-position: top center; }
                        .content { position: relative; z-index: 10; padding: 40mm 20mm 35mm 20mm; font-size: 9pt; line-height: 1.3; color: black; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 0.75rem; }
                        td, th { border: 1px solid black; padding: 4px 6px; font-size: 9pt; }
                        th { font-weight: bold; background: #f8fafc; }
                        .font-bold { font-weight: bold; }
                        .text-center { text-align: center; }
                        .text-left { text-align: left; }
                        .capitalize { text-transform: capitalize; }
                        .grid { display: grid; }
                        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                        .gap-x-8 { column-gap: 2rem; }
                        .gap-y-10 { row-gap: 2.5rem; }
                        .mb-1 { margin-bottom: 0.25rem; }
                        .mb-3 { margin-bottom: 0.75rem; }
                        .mb-4 { margin-bottom: 1rem; }
                        .mb-8 { margin-bottom: 2rem; }
                        .ml-4 { margin-left: 1rem; }
                        .mt-2 { margin-top: 0.5rem; }
                        input[type="checkbox"] { margin-right: 4px; }
                        img { max-height: 64px; object-fit: contain; }
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
                  <SignatureCanvas ref={signatureRef} canvasProps={{ className: 'h-40 w-full rounded-lg bg-white' }} />
                </div>
                <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Catatan opsional..." rows={2} />
                {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => signatureRef.current?.clear()}>Bersihkan</Button>
                  <Button type="button" size="sm" className="flex-1" onClick={handleSubmit} disabled={isPending}>{isPending ? 'Menyimpan...' : 'Setuju & Tanda Tangani'}</Button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── KANAN: 2 PDF A4 Pages ── */}
        <div className="flex-1 space-y-6 print:hidden overflow-auto">
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
        </div>
      </div>
    </main>
  )
}
