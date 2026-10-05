'use client'

import React from 'react'

export interface ContractReviewDocProps {
  form: any
  selectedEmp?: {
    name?: string | null
    employeeId?: string | null
    position?: string | null
    department?: string | null
    section?: string | null
  } | null
  approvalsList?: any[]
  previewLeaderSig?: string
  adminMode?: boolean
}

export function ContractReviewPrintableDoc({
  form,
  selectedEmp,
  approvalsList = [],
  previewLeaderSig = '',
  adminMode = false,
}: ContractReviewDocProps) {
  const countLines = (text: string, charsPerLine: number) => {
    if (!text) return 1
    const lines = text.split('\n')
    let total = 0
    for (const line of lines) {
      total += Math.max(1, Math.ceil(line.length / charsPerLine))
    }
    return Math.max(1, total)
  }

  const estimateRowHeightMm = (item: any) => {
    const act = String(item?.activity || '').trim()
    const rem = String(item?.remark || '').trim()
    const actLines = countLines(act, 40)
    const remLines = countLines(rem, 54)
    const maxLines = Math.max(actLines, remLines)
    return 2.5 + maxLines * 3.3
  }

  const competencyRows = [
    ['Discipline', form.compDisciplineAch, form.compDisciplineRemark],
    ['Professional Skill and Knowledge', form.compSkillAch, form.compSkillRemark],
    ['Achieving Result', form.compResultAch, form.compResultRemark],
    ['Concern for Order, Quality and Accuracy', form.compQualityAch, form.compQualityRemark],
    ['Customer Orientation ( internal / external )', form.compCustomerAch, form.compCustomerRemark],
    ['Teamwork', form.compTeamworkAch, form.compTeamworkRemark],
  ]

  const estimateCompetencyRowHeightMm = (label: string, remark: string) => {
    const actLines = Math.max(1, Math.ceil(String(label || '').length / 38))
    const remLines = Math.max(1, Math.ceil(String(remark || '').length / 55))
    const maxLines = Math.max(actLines, remLines)
    return 3.2 + maxLines * 3.3
  }

  const totalCompetencyRowsHeightMm = competencyRows.reduce(
    (sum, [label, _, remark]) => sum + estimateCompetencyRowHeightMm(label, remark || ''),
    0
  )
  const totalCompetencyHeightMm = totalCompetencyRowsHeightMm + 14

  const achievementScore = (() => {
    const aVals = (form.performanceActivities || []).map((a: any) => a.achievement).filter(Boolean)
    const bVals = [
      form.compDisciplineAch,
      form.compSkillAch,
      form.compResultAch,
      form.compQualityAch,
      form.compCustomerAch,
      form.compTeamworkAch,
    ].filter(Boolean)
    const allVals = [...aVals, ...bVals]
    if (allVals.length === 0) return 0
    const parseVal = (val: any): number | null => {
      if (typeof val === 'number') return val
      const str = String(val).trim().toLowerCase()
      if (!str) return null
      if (str === 'exceed') return 115
      if (str === 'meet') return 100
      if (str === 'below') return 80
      const num = parseFloat(str.replace('%', ''))
      return isNaN(num) ? null : num
    }
    const validNums = allVals.map(parseVal).filter((v): v is number => v !== null)
    if (validNums.length === 0) return 0
    const total = validNums.reduce((sum, val) => sum + val, 0)
    return Math.round((total / validNums.length) * 10) / 10
  })()

  const achCategory =
    achievementScore >= 106
      ? 'exceed'
      : achievementScore >= 95
        ? 'meet'
        : achievementScore > 0
          ? 'below'
          : ''

  const formatAchievementDisplay = (val: any) => {
    if (val === null || val === undefined || val === '') return '\u00A0'
    const str = String(val).trim()
    const num = parseFloat(str.replace('%', ''))
    if (!isNaN(num)) return `${num}%`
    return str
  }

  const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const { firstPageActivities, performanceOverflowChunks, isCompetencyOnPage1 } = (() => {
    const all = form.performanceActivities || []
    const DETAILS_PROFILE_MM = 58
    const USABLE_PAGE_1_MM = 205 - DETAILS_PROFILE_MM

    if (all.length === 0) {
      return {
        firstPageActivities: [],
        performanceOverflowChunks: [],
        isCompetencyOnPage1: true,
      }
    }

    const allActRowsMm = all.reduce((sum: number, item: any) => sum + estimateRowHeightMm(item), 0)
    const allActTotalMm = 14 + allActRowsMm

    if (allActTotalMm + totalCompetencyHeightMm <= USABLE_PAGE_1_MM) {
      return {
        firstPageActivities: all,
        performanceOverflowChunks: [],
        isCompetencyOnPage1: true,
      }
    }

    const PAGE_1_ROWS_MAX_MM = 135
    const CONTINUATION_ROWS_MAX_MM = 185
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

    return {
      firstPageActivities: first,
      performanceOverflowChunks: chunks,
      isCompetencyOnPage1: false,
    }
  })()

  const getStepSignature = (stepOrder: number, roleNames: string[], name?: string | null, fallbackSig?: string | null) => {
    const byOrder = approvalsList?.find(
      (s: any) => s.stepOrder === stepOrder && (s.status === 'approved' || Boolean(s.signatureDataUrl)) && s.signatureDataUrl
    )
    if (byOrder?.signatureDataUrl) return byOrder.signatureDataUrl

    const byRole = approvalsList?.find(
      (s: any) => roleNames.includes(s.approverRole) && (s.status === 'approved' || Boolean(s.signatureDataUrl)) && s.signatureDataUrl
    )
    if (byRole?.signatureDataUrl) return byRole.signatureDataUrl

    if (name) {
      const trimmed = name.trim().toLowerCase()
      const byName = approvalsList?.find(
        (s: any) => (s.status === 'approved' || Boolean(s.signatureDataUrl)) && s.signatureDataUrl && s.approverName?.trim().toLowerCase() === trimmed
      )
      if (byName?.signatureDataUrl) return byName.signatureDataUrl
    }

    return fallbackSig || ''
  }

  const getStepMeta = (stepOrder: number, roleNames: string[], name?: string | null, fallbackMeta?: any) => {
    const byOrder = approvalsList?.find((s: any) => s.stepOrder === stepOrder && (s.status === 'approved' || Boolean(s.signatureDataUrl)))
    if (byOrder) return byOrder

    const byRole = approvalsList?.find((s: any) => roleNames.includes(s.approverRole) && (s.status === 'approved' || Boolean(s.signatureDataUrl)))
    if (byRole) return byRole

    if (name) {
      const trimmed = name.trim().toLowerCase()
      const byName = approvalsList?.find((s: any) => (s.status === 'approved' || Boolean(s.signatureDataUrl)) && s.approverName?.trim().toLowerCase() === trimmed)
      if (byName) return byName
    }

    return fallbackMeta
  }

  const leaderApprover = approvalsList?.find((s: any) => s.stepOrder === 1)
  const employeeApprover = approvalsList?.find((s: any) => s.stepOrder === 2 || s.approverRole === 'employee')
  const superiorApprover = approvalsList?.find((s: any) => s.stepOrder === 3 || s.approverRole === 'section_head_confirmation')
  const nextSuperiorApprover = approvalsList?.find((s: any) => s.stepOrder === 4 || s.approverRole === 'central_service_manager')
  const hrApprover = approvalsList?.find((s: any) => s.stepOrder === 5 || s.approverRole === 'hr')

  const leaderName = form.leaderName || leaderApprover?.approverName || ''
  const employeeDisplayName = selectedEmp?.name || form.employeeNameStr || employeeApprover?.approverName || ''
  const superiorName = form.superiorName || superiorApprover?.approverName || ''
  const nextSuperiorName = form.nextSuperiorName || nextSuperiorApprover?.approverName || ''
  const hrName = form.hrName || hrApprover?.approverName || 'Kesuma Bagaskara'

  const leaderSig = previewLeaderSig || getStepSignature(1, ['pjo_or_te_initial', 'section_head_initial', 'leader'], leaderName, form.leaderSignatureDataUrl)
  const employeeSig = getStepSignature(2, ['employee'], employeeDisplayName)
  const superiorSig = getStepSignature(3, ['section_head_confirmation', 'section_head', 'superior'], superiorName)
  const nextSuperiorSig = getStepSignature(4, ['central_service_manager', 'dept_head', 'department_head'], nextSuperiorName)
  const hrSig = getStepSignature(5, ['hr', 'hr_ga'], hrName)

  const leaderMeta = getStepMeta(1, ['pjo_or_te_initial', 'section_head_initial', 'leader'], leaderName, leaderApprover)
  const employeeMeta = getStepMeta(2, ['employee'], employeeDisplayName, employeeApprover)
  const superiorMeta = getStepMeta(3, ['section_head_confirmation', 'section_head', 'superior'], superiorName, superiorApprover)
  const nextSuperiorMeta = getStepMeta(4, ['central_service_manager', 'dept_head', 'department_head'], nextSuperiorName, nextSuperiorApprover)
  const hrMeta = getStepMeta(5, ['hr', 'hr_ga'], hrName, hrApprover)

  const displaySignatories: Array<{
    key: string
    label: string
    name: string
    title: string
    signatureUrl: string | null
    signedAt?: string | Date | null
    remarks?: string | null
  }> = []

  const seenSignerKeys = new Set<string>()
  const signatoryCandidates = [
    {
      key: 'leader',
      label: 'Leader Signature',
      name: leaderName,
      title: form.leaderTitle || 'Leader',
      signatureUrl: leaderSig,
      meta: leaderMeta,
    },
    {
      key: 'employee',
      label: 'Employee Signature',
      name: employeeDisplayName,
      title: selectedEmp?.position || 'Employee',
      signatureUrl: employeeSig,
      meta: employeeMeta,
    },
    {
      key: 'superior',
      label: 'Superior Signature',
      name: superiorName,
      title: form.superiorTitle || 'Superior',
      signatureUrl: superiorSig,
      meta: superiorMeta,
    },
    {
      key: 'next_superior',
      label: 'Next Superior Signature',
      name: nextSuperiorName,
      title: form.nextSuperiorTitle || 'Department Head',
      signatureUrl: nextSuperiorSig,
      meta: nextSuperiorMeta,
    },
    {
      key: 'hr',
      label: 'HR Signature',
      name: hrName,
      title: form.hrTitle || 'HR-GA',
      signatureUrl: hrSig,
      meta: hrMeta,
    },
  ]

  for (const cand of signatoryCandidates) {
    const normalized = (cand.name || '').trim().toLowerCase()
    if (!normalized && !cand.signatureUrl) continue
    const signerKey = normalized || cand.key
    if (seenSignerKeys.has(signerKey)) continue
    seenSignerKeys.add(signerKey)
    displaySignatories.push({
      key: cand.key,
      label: cand.label,
      name: cand.name || 'Penandatangan',
      title: cand.title,
      signatureUrl: cand.signatureUrl,
      signedAt: cand.meta?.signedAt,
      remarks: cand.meta?.remarks,
    })
  }

  // Any dynamic steps beyond step 5
  for (const step of approvalsList) {
    const role = step.approverRole || ''
    const isStandardRole = ['pjo_or_te_initial', 'section_head_initial', 'employee', 'section_head_confirmation', 'central_service_manager', 'hr'].includes(role)
    if (!isStandardRole || step.stepOrder > 5) {
      const normalized = (step.approverName || '').trim().toLowerCase()
      if (normalized && !seenSignerKeys.has(normalized)) {
        seenSignerKeys.add(normalized)
        displaySignatories.push({
          key: `step-${step.id}`,
          label: `${step.approverRole || 'Approver'} Signature`,
          name: step.approverName,
          title: step.approverRole || 'Approver',
          signatureUrl: step.signatureDataUrl,
          signedAt: step.signedAt,
          remarks: step.remarks,
        })
      }
    }
  }

  const renderPerformanceTable = (items: any[], prefix = 'perf') => (
    <table className="w-full border-collapse border border-black mb-2.5 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5">
      <thead>
        <tr className="bg-slate-50 text-center font-bold">
          <th className="w-2/3">Activities</th>
          <th className="w-12">Achievement</th>
          <th>Remark</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any, idx: number) => (
          <tr key={`${prefix}-${item.id || idx}`}>
            <td className="whitespace-pre-line">{item.activity || '\u00A0'}</td>
            <td className="text-center font-mono">{formatAchievementDisplay(item.achievement)}</td>
            <td className="whitespace-pre-line">{item.remark || '\u00A0'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderCompetencyTable = () => (
    <table className="w-full border-collapse border border-black mb-2 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5">
      <thead>
        <tr className="bg-slate-50 text-center font-bold">
          <th className="w-[45%]">Activities</th>
          <th className="w-12">Achievement</th>
          <th className="w-[45%]">Remark</th>
        </tr>
      </thead>
      <tbody>
        {competencyRows.map(([label, ach, remark]) => (
          <tr key={label}>
            <td className="font-semibold">{label}</td>
            <td className="text-center font-mono">{formatAchievementDisplay(ach)}</td>
            <td className="whitespace-pre-line">{remark || '\u00A0'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderAchievementBlock = () => (
    <>
      <div className="font-bold mb-1.5 flex items-center justify-between">
        <span>Achievement Definition</span>
        {achievementScore > 0 ? (
          <span className="text-[7.5pt] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
            Rata-rata: {achievementScore}% ({achCategory === 'exceed' ? 'Exceed Requirement' : achCategory === 'meet' ? 'Meet Requirement' : 'Below Requirement'})
          </span>
        ) : null}
      </div>
      <table className="w-full border-collapse border border-black mb-2.5 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5">
        <tbody>
          <tr>
            <td className="w-1/3"><label className="flex items-center gap-2"><input type="checkbox" readOnly checked={achCategory === "exceed"} />Exceed Requirement (106% - 125%)</label></td>
            <td className="w-2/3">Performance of the employee is exceeding target and He/She consistently <b>demonstrates right attitude and behavior</b> which are aligned with the competency</td>
          </tr>
          <tr>
            <td><label className="flex items-center gap-2"><input type="checkbox" readOnly checked={achCategory === "meet"} />Meet Requirement (95% - 105%)</label></td>
            <td>Performance of the employee is meeting target and in overall He/She <b>demonstrates attitude and behavior</b> which are aligned with the competency</td>
          </tr>
          <tr>
            <td><label className="flex items-center gap-2"><input type="checkbox" readOnly checked={achCategory === "below"} />Below Requirement (&lt; 95%)</label></td>
            <td>Performance of the employee is not meeting target and He/She still <b>demonstrating some attitudes and/ or behaviors which are not aligned</b> with the competency</td>
          </tr>
        </tbody>
      </table>
      <div className="font-bold mb-1.5">Recommendation</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-[7.5pt]">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.recommendation === 'confirm_permanent'} readOnly />Confirm to Permanent</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.recommendation === 'terminate_probation'} readOnly />Unsuccessful Probationary (termination)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.recommendation === 'contract_extended'} readOnly />Contract Extended <span className="border-b border-black w-12 inline-block text-center">{form.contractExtendedMonths || '\u00A0'}</span> months</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.recommendation === 'contract_ended'} readOnly />Contract ended</label>
      </div>

      {form.testRequired && (
        <div className="mb-3">
          <div className="font-bold mb-1 flex items-center justify-between">
            <span>Hasil Evaluasi Ujian Online (Training Center)</span>
          </div>
          <table className="w-full border-collapse border border-black mb-2 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5 text-center text-[7.5pt]">
            <thead>
              <tr className="bg-slate-50 font-bold">
                <th className="w-[6%]">No</th>
                <th className="w-[38%] text-left">Materi Ujian</th>
                <th className="w-[18%]">Tgl Pengerjaan</th>
                <th className="w-[12%]">Percobaan</th>
                <th className="w-[12%]">Passing Grade</th>
                <th className="w-[12%]">Nilai Akhir</th>
                <th className="w-[14%]">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td className="text-left font-medium">{form.testConfig?.title || 'Ujian Kompetensi Contract Review'}</td>
                <td>{form.testCompletedAt ? new Date(form.testCompletedAt).toLocaleDateString('id-ID') : '-'}</td>
                <td>Ke-{form.testAttemptCount || 1}</td>
                <td>{form.testConfig?.hasPassingGrade ? `${form.testConfig?.passingGrade}%` : '-'}</td>
                <td className="font-bold font-mono">{form.testFinalScore !== null && form.testFinalScore !== undefined ? `${form.testFinalScore}%` : '-'}</td>
                <td className="font-bold">
                  {form.testStatus === 'passed' ? (
                    <span className="text-emerald-700">LULUS</span>
                  ) : form.testStatus === 'failed' ? (
                    <span className="text-rose-700">TIDAK LULUS</span>
                  ) : form.testStatus === 'in_progress' ? (
                    <span className="text-sky-700">SEDANG MENGERJAKAN</span>
                  ) : (
                    <span className="text-amber-700">MENUNGGU UJIAN</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  )

  const renderSignatoriesBlock = () => (
    <div className="break-inside-avoid">
      <div className="font-bold mb-2 break-before-auto">Signatories</div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-3">
        {displaySignatories.map((sig) => (
          <div key={sig.key}>
            <div className="text-[7.5pt] text-slate-500 mb-0.5">{sig.label}</div>
            <div className="h-14 flex items-end">
              {sig.signatureUrl ? (
                <img
                  src={sig.signatureUrl}
                  alt={`${sig.label} TTD`}
                  className="h-12 object-contain"
                  style={{ maxWidth: '40mm', maxHeight: '14mm' }}
                />
              ) : null}
            </div>
            <div className="mb-0.5 border-b" style={{ width: '55%', borderColor: '#9ca3af' }}>{sig.name}</div>
            <div className="text-[7.5pt]">{sig.title}</div>
            <div className="mt-0.5 text-[6.5pt] text-gray-500">Waktu TTD: {formatDateTime(sig.signedAt)}</div>
            {sig.remarks ? <div className="mt-0.5 text-[6.5pt] text-left text-gray-600">Catatan: {sig.remarks}</div> : null}
          </div>
        ))}
        <div>
          <div className="font-bold mb-1 text-[7.5pt]">Letter Issuance by HR</div>
          <div className="text-[7pt]" style={{ display: 'grid', gap: '3px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={form.letterIssuance === 'permanent_confirmation'} readOnly />
              <span>Permanent Confirmation</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={form.letterIssuance === 'contract_extension'} readOnly />
              <span>Contract extension</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={form.letterIssuance === 'unsuccessful_probation'} readOnly />
              <span>Unsuccessful probation notification</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={form.letterIssuance === 'end_of_contract'} readOnly />
              <span>End of contract notification</span>
            </label>
          </div>
        </div>
      </div>

      <div className="text-right mt-3 text-gray-500 text-[7pt]">
        F.HR.STD.012.00
      </div>
    </div>
  )

  const pdfPreviewPage1 = (
    <div
      className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight"
      style={{
        color: 'black',
        paddingTop: '42mm',
        paddingBottom: '45mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        height: '297mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <h1 className="text-center font-bold text-[11pt] mb-2">EMPLOYEE PROBATION/CONTRACT REVIEW</h1>

      <table className="w-full border-collapse border border-black mb-2.5 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5">
        <tbody>
          <tr>
            <td colSpan={2} className="font-bold bg-slate-50">Details</td>
          </tr>
          <tr>
            <td className="w-1/2">Today's Date: {new Date(form.todayDate).toLocaleDateString('id-ID')}</td>
            <td className="w-1/2">Hire Date: {form.hireDate ? new Date(form.hireDate).toLocaleDateString('id-ID') : '-'}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <div className="font-bold mb-1">Purpose of this form (check one):</div>
              <div className="flex gap-8">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.reviewType === 'probation'} readOnly />
                  Probationary Review
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.reviewType === 'contract'} readOnly />
                  Contract Review (length of contract {form.contractLength || "______"})
                </label>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="font-bold bg-slate-50">Employee Profile</td>
          </tr>
          <tr>
            <td>Name:<br/>{selectedEmp?.name || form.employeeNameStr || '-'}</td>
            <td>SN:<br/>{selectedEmp?.employeeId || '-'}</td>
          </tr>
          <tr>
            <td>Job Title:<br/>{selectedEmp?.position || '-'}</td>
            <td>Department/Section:<br/>{[selectedEmp?.department, selectedEmp?.section].filter(Boolean).join(' / ') || '-'}</td>
          </tr>
          <tr>
            <td>Superior Name:<br/>{form.leaderName || form.superiorName || form.nextSuperiorName || '-'}</td>
            <td>Superior Title:<br/>{form.leaderTitle || form.superiorTitle || form.nextSuperiorTitle || '-'}</td>
          </tr>
        </tbody>
      </table>

      {(firstPageActivities.length > 0 || isCompetencyOnPage1) && (
        <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
      )}

      {firstPageActivities.length > 0 ? (
        <>
          <div className="font-bold ml-4 mb-1">A. Performance</div>
          {renderPerformanceTable(firstPageActivities, 'first')}
        </>
      ) : null}

      {isCompetencyOnPage1 ? (
        <>
          <div className="font-bold ml-4 mb-1">{['B.', 'Related Competency', '(', 'Knowledge', '&', 'Behavior', ')'].join(' ')}</div>
          {renderCompetencyTable()}
        </>
      ) : null}
    </div>
  )

  const pdfPreviewPerformancePages = performanceOverflowChunks.map((chunk, index) => (
    <div
      key={`performance-page-${index}`}
      className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight"
      style={{
        color: 'black',
        paddingTop: '42mm',
        paddingBottom: '45mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        height: '297mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
      <div className="font-bold ml-4 mb-1">A. Performance (lanjutan)</div>
      {renderPerformanceTable(chunk, `overflow-${index}`)}
    </div>
  ))

  const canFitAllOnPage2WhenCompetencyOnPage2 = totalCompetencyHeightMm + (form.testRequired ? 64 : 42) + 75 <= 200

  const pdfPreviewPage2 = isCompetencyOnPage1 ? (
    <div
      className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight"
      style={{
        color: 'black',
        paddingTop: '42mm',
        paddingBottom: '45mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        height: '297mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {renderAchievementBlock()}
      {renderSignatoriesBlock()}
    </div>
  ) : (
    <div
      className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight"
      style={{
        color: 'black',
        paddingTop: '42mm',
        paddingBottom: '45mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        height: '297mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
      <div className="font-bold ml-4 mb-1">B. Related Competency ( Knowledge & Behavior )</div>
      {renderCompetencyTable()}
      {renderAchievementBlock()}
      {canFitAllOnPage2WhenCompetencyOnPage2 ? renderSignatoriesBlock() : null}
    </div>
  )

  const pdfPreviewPage3 = (
    <div
      className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight"
      style={{
        color: 'black',
        paddingTop: '42mm',
        paddingBottom: '45mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        height: '297mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {renderSignatoriesBlock()}
    </div>
  )

  const formPdfPages = (() => {
    if (isCompetencyOnPage1) {
      return [
        { id: 'pdf-page-1', content: pdfPreviewPage1 },
        { id: 'pdf-page-2', content: pdfPreviewPage2 },
      ]
    }
    const pages = [
      { id: 'pdf-page-1', content: pdfPreviewPage1 },
      ...pdfPreviewPerformancePages.map((page, idx) => ({ id: `pdf-page-perf-${idx}`, content: page })),
      { id: 'pdf-page-2', content: pdfPreviewPage2 },
    ]
    if (!canFitAllOnPage2WhenCompetencyOnPage2) {
      pages.push({ id: 'pdf-page-3', content: pdfPreviewPage3 })
    }
    return pages
  })()

  return (
    <div className="contract-review-print-container flex flex-col gap-8">
      {formPdfPages.map((page) => (
        <div
          key={page.id}
          id={page.id}
          className="contract-review-page pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
          style={{
            backgroundImage: "url('/ChitraParatama_Stationery_Letterhead_jkt.jpg')",
            backgroundSize: '210mm 297mm',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top center',
          }}
        >
          {page.content}
        </div>
      ))}
    </div>
  )
}
