'use client'

import { approveApprovalGroupAction, reviewApprovalAction } from '@/app/dashboard/admin-actions'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { ApdApprovalDialog } from '@/components/admin/apd-approval-dialog'
import { FiveRApprovalDialog } from '@/components/admin/five-r-approval-dialog'
import { MobileFiveRApprovalCard } from '@/components/admin/mobile-five-r-approval-card'
import { RfrApprovalDialog } from '@/components/admin/rfr-approval-dialog'
import { MobileRfrApprovalCard } from '@/components/admin/mobile-rfr-approval-card'
import { ApprovalRequestDetails } from '@/components/approval-request-details'
import { ApprovalReviewDrawerForm } from '@/components/approval-review-drawer-form'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpeechTextarea as Textarea } from '@/components/ui/speech-textarea'
import type { getApprovalCenterData } from '@/lib/approval-workspace'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type ApprovalCenterData = Awaited<ReturnType<typeof getApprovalCenterData>>

function MobileInbox({
  groups,
  contractReviewItems,
  rfrItems,
}: {
  groups: ApprovalCenterData['inboxGroups']
  contractReviewItems: ApprovalCenterData['contractReviewInboxItems']
  rfrItems: ApprovalCenterData['rfrInboxItems']
}) {
  const router = useRouter()
  const [submittingKey, setSubmittingKey] = useState('')

  async function submitReview(formData: FormData, key: string, bulk = false) {
    if (submittingKey) return
    setSubmittingKey(key)
    try {
      await (bulk ? approveApprovalGroupAction(formData) : reviewApprovalAction(formData))
      toast.success('Keputusan approval berhasil disimpan.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Keputusan approval gagal disimpan.')
    } finally {
      setSubmittingKey('')
    }
  }

  if (groups.length === 0 && contractReviewItems.length === 0 && rfrItems.length === 0) {
    return (
      <div className="rounded-[1.3rem] bg-white p-5 text-sm font-semibold text-[#486275] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        Tidak ada pengajuan yang menunggu approval Anda.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rfrItems.map((item) => (
        <MobileRfrApprovalCard key={`rfr-${item.id}`} item={item} />
      ))}

      {contractReviewItems.map((item) => (
        <div
          key={item.id}
          className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_16px_36px_rgba(8,32,51,0.08)]"
        >
          <div className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.18em] text-[#486275] uppercase">
                  Contract Review
                </p>
                <p className="mt-1 text-base font-black tracking-tight text-[#082033]">
                  {item.employeeName}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  {item.stepLabel} • {item.approverRole.replace(/_/g, ' ')}
                </p>
              </div>
              <AdminStatusBadge value={item.dueState} />
            </div>
            <div className="mt-3 rounded-[1.05rem] bg-[#f6fbff] px-4 py-3">
              <p className="text-xs font-black tracking-[0.16em] text-[#486275] uppercase">
                Ringkasan
              </p>
              <p className="mt-2 text-sm text-[#082033]">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-[#486275]">
                Due {item.dueAt.toLocaleDateString('id-ID')} • {item.reviewType}
              </p>
            </div>
            <Link
              prefetch={false}
              href={item.url}
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#003f78] px-4 text-sm font-black text-white transition-transform active:scale-95"
            >
              Buka TTD Contract Review
            </Link>
          </div>
        </div>
      ))}

      {groups.map((group) => (
        <details
          key={group.id}
          open
          className="group overflow-hidden rounded-[1.35rem] bg-white shadow-[0_16px_36px_rgba(8,32,51,0.08)]"
        >
          <summary className="cursor-pointer list-none border-b border-[#e6f0f7] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black tracking-tight text-[#082033]">
                  {group.requesterName}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  {group.requesterJobTitle || '-'} • {group.siteName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AdminStatusBadge value={`${group.activityCount} item`} />
                <span
                  aria-hidden="true"
                  className="inline-block text-lg text-[#486275] transition-transform group-open:rotate-180"
                >
                  ⌄
                </span>
              </div>
            </div>
            {group.items.length > 1 && !group.items.some((item: any) => (item.activityType.startsWith('Request ') && (item.activityType.toUpperCase().includes('APD') || item.activityType.toUpperCase().includes('MATERIAL') || item.activityType.toUpperCase().includes('TOOLS'))) || item.activityType === 'Summary APD') ? (
              <form
                action={(formData) => submitReview(formData, `group-${group.id}`, true)}
                className="mt-3"
              >
                {group.items.map((item) => (
                  <input
                    key={item.approvalId}
                    type="hidden"
                    name="approvalIds"
                    value={item.approvalId}
                  />
                ))}
                <Button
                  type="submit"
                  variant="outline"
                  className="h-10 rounded-xl px-4"
                  disabled={Boolean(submittingKey)}
                >
                  {submittingKey === `group-${group.id}`
                    ? 'Menyimpan...'
                    : `Setujui semua (${group.activityCount})`}
                </Button>
              </form>
            ) : null}
          </summary>

          <div className="divide-y divide-[#e6f0f7]">
            {group.items.map((item) => {
              const isFormWo = Boolean(
                item.repairFormWo ||
                  item.activityType === 'Work Order' ||
                  item.activityType === 'Form WO' ||
                  item.activityType === 'Repair / Retread' ||
                  item.activityType === 'Service WO' ||
                  item.requestKindLabel?.toLowerCase().includes('work order') ||
                  item.requestKindLabel?.toLowerCase().includes('wo') ||
                  item.requestKindLabel?.toLowerCase().includes('repair') ||
                  item.requestKindLabel?.toLowerCase().includes('retread') ||
                  item.title?.toLowerCase().includes('wo') ||
                  item.title?.toLowerCase().includes('frmwo')
              )

              return (
                <article key={item.approvalId} className="space-y-4 px-4 py-5">
                  {item.activityType === '5R Audit Report' || item.fiveRReport || item.title?.toLowerCase().includes('5r') ? (
                    <MobileFiveRApprovalCard item={item} group={group} />
                  ) : (item.activityType.startsWith('Request ') && (item.activityType.toUpperCase().includes('APD') || item.activityType.toUpperCase().includes('MATERIAL') || item.activityType.toUpperCase().includes('TOOLS'))) || item.activityType === 'Summary APD' ? (
                    <ApdApprovalDialog item={item} group={group} />
                  ) : isFormWo ? (
                    <ApprovalReviewDrawerForm item={item} group={group} />
                  ) : (
                    <>
                      <ApprovalRequestDetails item={item} />
                    <section className="rounded-2xl bg-[#f7fbfe] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#486275]">
                        <span>{item.currentStepLabel}</span>
                        <span>Due {item.dueAt.toLocaleString('id-ID')}</span>
                      </div>
                      <form
                        action={(formData) =>
                          submitReview(formData, `approval-${item.approvalId}`)
                        }
                        className="mt-3 space-y-3"
                      >
                        <input type="hidden" name="approvalId" value={item.approvalId} />
                        <Textarea
                          name="note"
                          rows={3}
                          required
                          minLength={3}
                          placeholder="Alasan revisi atau tolak, minimal 3 karakter."
                          className="bg-white"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            type="submit"
                            name="decision"
                            value="approved"
                            formNoValidate
                            className="h-11 rounded-xl px-2"
                            disabled={Boolean(submittingKey)}
                          >
                            Setujui
                          </Button>
                          <Button
                            type="submit"
                            name="decision"
                            value="needs_correction"
                            variant="outline"
                            className="h-11 rounded-xl px-2"
                            disabled={Boolean(submittingKey)}
                          >
                            Revisi
                          </Button>
                          <Button
                            type="submit"
                            name="decision"
                            value="rejected"
                            variant="secondary"
                            className="h-11 rounded-xl px-2"
                            disabled={Boolean(submittingKey)}
                          >
                            Tolak
                          </Button>
      {rfrItems.map((item) => (
        <MobileRfrApprovalCard key={`rfr-${item.id}`} item={item} />
      ))}
    </div>
  )
}

function MobileHistory({ groups }: { groups: ApprovalCenterData['historyGroups'] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-[1.3rem] bg-white p-5 text-sm font-semibold text-[#486275] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        Belum ada riwayat approval dari pengajuan Anda.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group, groupIndex) => (
        <details
          key={group.id}
          open={groupIndex === 0}
          className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_16px_36px_rgba(8,32,51,0.08)]"
        >
          <summary className="cursor-pointer list-none px-4 py-4">
            <p className="text-base font-black tracking-tight text-[#082033]">
              {group.workDateLabel}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#486275]">
              {group.activityCount} pengajuan diajukan
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.pendingCount > 0 ? <AdminStatusBadge value="in_review" /> : null}
              {group.approvedCount > 0 ? <AdminStatusBadge value="approved" /> : null}
              {group.rejectedCount > 0 ? <AdminStatusBadge value="rejected" /> : null}
              {group.revisionCount > 0 ? <AdminStatusBadge value="needs_revision" /> : null}
            </div>
          </summary>

          <div className="space-y-3 border-t border-[#e6f0f7] bg-[#f6fbff] px-4 py-4">
            {group.items.map((item, itemIndex) => (
              <details
                key={item.activityId}
                open={groupIndex === 0 && itemIndex === 0}
                className="overflow-hidden rounded-[1.05rem] bg-white"
              >
                <summary className="cursor-pointer list-none px-4 py-4">
                  <p className="text-sm font-black text-[#082033]">
                    {item.title} • {item.unitNumber}{(item as any).tireCount ? ` • ${(item as any).tireCount} Tire` : ''}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#486275]">
                    {item.activityType} • {item.siteName} • {item.timeRange}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminStatusBadge value={item.status} />
                    <AdminStatusBadge value={item.priority} />
                  </div>
                </summary>

                <div className="space-y-3 border-t border-[#eef4f8] px-4 py-4">
                  <div className="rounded-[0.95rem] bg-[#f6fbff] px-4 py-4">
                    <p className="text-xs font-black tracking-[0.16em] text-[#486275] uppercase">
                      Result
                    </p>
                    <p className="mt-2 text-sm text-[#082033]">{item.lastDecision}</p>
                    <p className="mt-2 text-xs font-semibold text-[#486275]">
                      Menunggu {item.pendingWith} • {item.currentStepLabel}
                    </p>
                  </div>

                  {item.notes.map((note) => (
                    <div key={note.id} className="rounded-[0.95rem] bg-[#f6fbff] px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-[#082033]">{note.actor}</p>
                        <AdminStatusBadge value={note.kind} />
                      </div>
                      <p className="mt-2 text-sm text-[#082033]">{note.message}</p>
                      <p className="mt-2 text-xs text-[#486275]">
                        {note.at.toLocaleString('id-ID')}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

function MobileRfrInbox({ items }: { items: ApprovalCenterData['rfrInboxItems'] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.3rem] bg-white p-5 text-sm font-semibold text-[#486275] shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        Tidak ada RFR yang menunggu persetujuan Anda.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_16px_36px_rgba(8,32,51,0.08)]"
        >
          <div className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.18em] text-[#486275] uppercase">
                  Request for Recruitment
                </p>
                <p className="mt-1 text-base font-black tracking-tight text-[#082033]">
                  {item.rfrNumber}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  {item.roleLabel} • Step {item.stepOrder}/{item.totalSteps}
                </p>
              </div>
              <AdminStatusBadge value={item.dueState} />
            </div>
            <div className="mt-3 rounded-[1.05rem] bg-[#f6fbff] px-4 py-3">
              <p className="text-xs font-black tracking-[0.16em] text-[#486275] uppercase">
                Ringkasan
              </p>
              <p className="mt-2 text-sm font-semibold text-[#082033]">{item.positionTitle}</p>
              <p className="mt-1 text-xs text-[#486275]">
                Pemohon: {item.requestorName} • {item.sectionDepartment}
              </p>
              <p className="mt-1 text-xs text-[#486275]">
                {item.numberOfPersons} orang • Due {item.dueAt.toLocaleDateString('id-ID')}
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={item.url} target="_blank" className="flex-1">
                <Button type="button" variant="outline" size="dense" className="w-full">
                  Review & Tanda Tangan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MobileApprovalCenter({ data }: { data: ApprovalCenterData }) {
  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <p className="text-[10px] font-black tracking-[0.28em] text-[#486275] uppercase">
          Approval Inbox
        </p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">Approval</h1>
        <p className="text-sm font-semibold text-[#486275]">
          Inbox per requester dan riwayat hasil approval pengajuan Anda.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
            Inbox Group
          </p>
          <p className="mt-3 text-2xl font-black text-[#082033]">
            {data.inboxMetrics.pendingGroups}
          </p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
            Pending Item
          </p>
          <p className="mt-3 text-2xl font-black text-[#082033]">
            {data.inboxMetrics.pendingActivities}
          </p>
        </div>
      </section>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-[1rem] bg-[#dcebf6] p-1">
          <TabsTrigger value="inbox" className="rounded-[0.8rem] font-bold">
            Inbox {(data.inboxMetrics.pendingActivities ?? 0) > 0 ? `(${data.inboxMetrics.pendingActivities})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-[0.8rem] font-bold">
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3">
          <MobileInbox
            groups={data.inboxGroups}
            contractReviewItems={data.contractReviewInboxItems}
            rfrItems={data.rfrInboxItems ?? []}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <MobileHistory groups={data.historyGroups} />
        </TabsContent>
      </Tabs>
    </div>
=======
        </TabsContent>

        {/* ═══════════ HISTORY TAB (SUDAH DIAPPROVE) ═══════════ */}
        <TabsContent value="history" className="space-y-3 focus-visible:outline-none">
          {historyItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-xs text-slate-500 shadow-sm leading-relaxed">
              Belum ada riwayat pengajuan yang tercatat.
            </div>
          ) : (
            historyItems.map((item: any) => (
              <article
                key={item.activityId || item.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{item.title || item.name}</span>
                  <AdminStatusBadge value={item.status || item.approvalStatus} />
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>{item.activityType || item.category} • {item.unitNumber || '-'} • {item.siteName || '-'}</p>
                  <p className="text-[11px] text-slate-400">Diputuskan: {item.lastDecision || '-'}</p>
                </div>
              </article>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ── FULLSCREEN MOBILE BATCH REVIEW & SIGN MODAL ── */}
      <Dialog
        open={isBatchReviewOpen && Boolean(currentBatchDoc)}
        onOpenChange={(open) => !open && setIsBatchReviewOpen(false)}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[430px] w-full sm:max-w-[430px] mx-auto h-[92dvh] sm:h-[86dvh] max-h-[92dvh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-t-2xl sm:rounded-2xl z-50"
        >
          {/* Mobile Header Bar */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-200 text-slate-900 shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="size-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-900 truncate">
                  Review & Approval Dokumen • <span className="text-[#003461]">{currentBatchDoc?.documentNumber}</span>
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {currentBatchDoc?.employeeName} • {formatDate(currentBatchDoc?.workDate || currentBatchDoc?.submittedAt)} • Shift {currentBatchDoc?.shiftCode || 'ALL'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Stepper */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={batchReviewIndex === 0 || isBatchActionRunning}
                  onClick={() => setBatchReviewIndex((prev) => Math.max(0, prev - 1))}
                  className="h-6 w-6 p-0 text-slate-600 disabled:opacity-30"
                >
                  ‹
                </Button>
                <span className="text-[10px] font-mono font-bold text-slate-700 px-1">
                  {batchReviewIndex + 1}/{selectedItems.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={batchReviewIndex >= selectedItems.length - 1 || isBatchActionRunning}
                  onClick={() => setBatchReviewIndex((prev) => Math.min(selectedItems.length - 1, prev + 1))}
                  className="h-6 w-6 p-0 text-slate-600 disabled:opacity-30"
                >
                  ›
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px] font-semibold gap-1 rounded-lg bg-[#e2e8f0] border-slate-200 text-slate-800"
                disabled={isDownloadingPdf}
                onClick={() => currentBatchDoc && handleDownloadCurrentPdf(currentBatchDoc)}
              >
                <Download className="size-3" /> UNDUH PDF
              </Button>

              <button
                type="button"
                onClick={() => setIsBatchReviewOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Mobile Body Content - PDF Preview + Form & TTD Stacked Vertically */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 bg-slate-100 space-y-3">
            {/* Zoom Action Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200 shadow-2xs max-w-lg mx-auto">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="size-3.5 text-[#003461]" /> Preview Dokumen Surat / PDF
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                  className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100"
                  title="Zoom Out"
                >
                  -
                </Button>
                <span className="text-[11px] font-mono font-bold text-slate-600 px-1 min-w-10 text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                  className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100"
                  title="Zoom In"
                >
                  +
                </Button>
                {previewZoom !== 1.0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewZoom(1.0)}
                    className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-900 rounded-lg"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* 1. PDF Letterhead Document Preview Container (No Side Scrollbars) */}
            <div className="flex justify-center items-start overflow-hidden p-1 w-full max-w-full">
              {currentBatchDoc && (
                <div
                  id="mobile-batch-preview-sheet"
                  className={cn(
                    "relative mx-auto shrink-0 bg-white shadow-md border border-slate-200 rounded-sm origin-top transition-transform duration-200",
                    currentBatchDoc.category === 'PTW' ? "w-[280mm] min-h-[195mm]" : "w-[210mm] min-h-[297mm]"
                  )}
                  style={{
                    backgroundImage: currentBatchDoc.category === 'PTW' ? 'none' : 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                    backgroundSize: '100% 100%',
                    transform: `scale(${ (currentBatchDoc.category === 'PTW' ? 0.35 : 0.44) * previewZoom })`,
                    marginBottom: currentBatchDoc.category === 'PTW' 
                      ? `${-120 + (previewZoom - 1.0) * 90}mm`
                      : `${-160 + (previewZoom - 1.0) * 125}mm`,
                  }}
                >
                  <div
                    className="relative z-10 outline-none text-[8.5pt] font-sans leading-tight"
                    style={{
                      color: 'black',
                      paddingTop: currentBatchDoc.category === 'PTW' ? '12mm' : '38mm',
                      paddingBottom: currentBatchDoc.category === 'PTW' ? '12mm' : '35mm',
                      paddingLeft: currentBatchDoc.category === 'PTW' ? '12mm' : '20mm',
                      paddingRight: currentBatchDoc.category === 'PTW' ? '12mm' : '20mm',
                      minHeight: currentBatchDoc.category === 'PTW' ? '195mm' : '297mm',
                    }}
                  >
                    {/* Document Contents - 100% Parity with Desktop Preview & Form PDF */}
                    {currentBatchDoc.category === 'DAILY_ACTIVITY' && currentBatchDoc.rawDaily && (
                      <div>
                        <h1 className="text-center font-bold text-[11pt] text-black mb-0.5 uppercase">PT. CHITRA PARATAMA</h1>
                        <h2 className="text-center font-bold text-[12pt] text-black mb-3 uppercase">DAILY ACTIVITY APPROVAL REPORT</h2>

                        <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 text-[8.5pt]">
                          <tbody>
                            <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Details</td></tr>
                            <tr>
                              <td className="w-1/2">Tanggal Kerja: <strong>{formatDate(currentBatchDoc.workDate)}</strong></td>
                              <td className="w-1/2">Shift: <strong>{currentBatchDoc.shiftCode || 'ALL'}</strong></td>
                            </tr>
                            <tr>
                              <td>Kode Sesi: <strong>{currentBatchDoc.documentNumber}</strong></td>
                              <td>Status: <span className="capitalize font-bold text-black">Submitted</span></td>
                            </tr>
                            <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Employee Profile</td></tr>
                            <tr>
                              <td>Nama: <strong>{currentBatchDoc.employeeName}</strong></td>
                              <td>SN: <strong>{(currentBatchDoc.rawDaily as any).employeeSn || '-'}</strong></td>
                            </tr>
                            <tr>
                              <td>Job Title: <strong>{(currentBatchDoc.rawDaily as any).jobTitle || (currentBatchDoc as any).position || 'Staff'}</strong></td>
                              <td>Dept / Section: <strong>{[currentBatchDoc.department, currentBatchDoc.section].filter(Boolean).join(' / ') || '—'}</strong></td>
                            </tr>
                            <tr>
                              <td>Site: <strong>{currentBatchDoc.siteName || '—'}</strong></td>
                              <td>Customer: <strong>{(currentBatchDoc.rawDaily as any).customerName || 'Default Customer'}</strong></td>
                            </tr>
                          </tbody>
                        </table>

                        {/* A. Daily Activity Items */}
                        {(() => {
                          const items = (currentBatchDoc.rawDaily as any)?.items || (currentBatchDoc.rawDaily as any)?.sessionItems || (currentBatchDoc as any)?.items || []
                          const totalPoints = items.reduce((sum: number, it: any) => sum + (it.points ?? it.actualPoints ?? 0), 0)
                          return (
                            <>
                              <div className="font-bold mb-1 text-[8.5pt]">
                                A. Daily Activity Items (Total: {items.length} item, {totalPoints} poin)
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
                                  {items.length > 0 ? (
                                    items.map((it: any, idx: number) => (
                                      <tr key={it.id || idx}>
                                        <td className="text-center">{idx + 1}</td>
                                        <td>{it.label || it.snapshotLabel || 'Aktivitas'}</td>
                                        <td className="text-center">{it.unitNumber || '-'}</td>
                                        <td className="text-center">{it.duration || '-'}</td>
                                        <td className="text-center font-bold">{it.points ?? it.actualPoints ?? 0}</td>
                                        <td className="text-left text-[7.5pt]">{it.remark || '-'}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={6} className="text-center text-slate-400 py-2">Belum ada item aktivitas.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </>
                          )
                        })()}

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
                            {((currentBatchDoc.rawDaily as any).approvals || []).map((step: any) => {
                              const isPending = step.status === 'pending'
                              const liveRemark = isPending && approvalRemarks[currentBatchDoc.id] ? approvalRemarks[currentBatchDoc.id] : step.remarks || '—'
                              const isStepSigned = step.status === 'approved' || step.status === 'signed' || step.status === 'completed'
                              const isStepReverted = step.status === 'reverted'
                              const timeLabel = step.signedAt
                                ? formatTimestamp(step.signedAt)
                                : isPending && approvalRemarks[currentBatchDoc.id]
                                ? 'Live Preview'
                                : '—'
                              return (
                                <tr key={step.stepOrder}>
                                  <td className="text-center">{step.stepOrder}</td>
                                  <td className="text-left font-medium">{step.stepLabel}</td>
                                  <td className="text-left font-medium">{step.approverName || '-'}</td>
                                  <td className={cn("text-center capitalize font-bold", isStepReverted ? "text-amber-700" : isStepSigned ? "text-emerald-700" : "")}>
                                    {step.status}
                                  </td>
                                  <td className="text-center text-[7pt]">{timeLabel}</td>
                                  <td className="italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight">{liveRemark}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>

                        {/* Signatories (3 Roles: Employee, Leader/PJO, Section Head) */}
                        {(() => {
                          const approvals = (currentBatchDoc.rawDaily as any).approvals || []
                          const step1 = approvals.find((s: any) => s.stepOrder === 1)
                          const step2 = approvals.find((s: any) => s.stepOrder === 2)
                          const step3 = approvals.find((s: any) => s.stepOrder === 3)
                          const isSigned1 = step1?.status === 'approved' || step1?.status === 'signed' || step1?.status === 'completed' || Boolean(step1?.signatureDataUrl || step1?.signatureUrl)
                          const isApproved2 = step2?.status === 'approved'
                          const isApproved3 = step3?.status === 'approved'
                          const isReverted2 = step2?.status === 'reverted'
                          const isReverted3 = step3?.status === 'reverted'
                          const currentSig = step1?.signatureDataUrl || step1?.signatureUrl || (currentBatchDoc.rawDaily as any).employee?.signatureDataUrl || null
                          const sig2 = step2?.signatureDataUrl || step2?.signatureUrl || null
                          const sig3 = step3?.signatureDataUrl || step3?.signatureUrl || null

                          return (
                            <>
                              <div className="font-bold mb-3 text-[8.5pt]">Signatories</div>
                              <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4">
                                {/* Karyawan */}
                                <div>
                                  <div className="text-[7pt] text-slate-500 mb-1">Employee Signature</div>
                                  <div className="h-14 flex items-end">
                                    {currentSig ? (
                                      <img src={currentSig} alt="TTD" className="h-10 object-contain" />
                                    ) : isSigned1 ? (
                                      <span className="text-emerald-700 font-serif italic font-bold text-[9pt]">{currentBatchDoc.employeeName}</span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[7.5pt]"></span>
                                    )}
                                  </div>
                                  <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                    {currentBatchDoc.employeeName}
                                  </div>
                                  <div className="text-[7pt] text-slate-600 font-medium">{(currentBatchDoc.rawDaily as any).jobTitle || (currentBatchDoc as any).position || 'Staff'}</div>
                                  {step1?.signedAt && (
                                    <div className="text-[6.5pt] text-slate-500 mt-0.5">
                                      {step1?.status === 'reverted' ? 'Waktu Revert: ' : 'Waktu TTD: '}
                                      {formatTimestamp(step1.signedAt)}
                                    </div>
                                  )}
                                </div>

                                {/* Leader / PJO */}
                                <div>
                                  <div className="text-[7pt] text-slate-500 mb-1">Leader / PJO Signature</div>
                                  <div className="h-14 flex items-end">
                                    {sig2 ? (
                                      <img src={sig2} alt="TTD" className="h-10 object-contain" />
                                    ) : isApproved2 ? (
                                      <div className="flex flex-col items-center justify-center text-center">
                                        <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({formatTimestamp(step2?.signedAt)})</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[7.5pt]"></span>
                                    )}
                                  </div>
                                  <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                    {step2?.approverName || currentBatchDoc.employeeName}
                                  </div>
                                  <div className="text-[7pt] text-slate-600 font-medium">Leader / PJO</div>
                                  {step2?.signedAt && (
                                    <div className="text-[6.5pt] text-slate-500 mt-0.5">
                                      {isReverted2 ? 'Waktu Revert: ' : 'Waktu TTD: '}
                                      {formatTimestamp(step2.signedAt)}
                                    </div>
                                  )}
                                </div>

                                {/* Section Head */}
                                <div>
                                  <div className="text-[7pt] text-slate-500 mb-1">Section Head Signature</div>
                                  <div className="h-14 flex items-end">
                                    {sig3 ? (
                                      <img src={sig3} alt="TTD" className="h-10 object-contain" />
                                    ) : isApproved3 ? (
                                      <div className="flex flex-col items-center justify-center text-center">
                                        <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({formatTimestamp(step3?.signedAt)})</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[7.5pt]"></span>
                                    )}
                                  </div>
                                  <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                    {step3?.approverName || currentBatchDoc.employeeName}
                                  </div>
                                  <div className="text-[7pt] text-slate-600 font-medium">Section Head</div>
                                  {step3?.signedAt && (
                                    <div className="text-[6.5pt] text-slate-500 mt-0.5">
                                      {isReverted3 ? 'Waktu Revert: ' : 'Waktu TTD: '}
                                      {formatTimestamp(step3.signedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-right text-[7pt] text-slate-400 mt-4">PT Chitra Paratama • HERO Platform</div>
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {/* Overtime SPL */}
                    {currentBatchDoc.category === 'OVERTIME' && currentBatchDoc.rawOvertime && (
                      <div>
                        <h1 className="text-center font-bold text-[11pt] mb-1 uppercase">SURAT PERINTAH LEMBUR (SPL)</h1>
                        <p className="text-center font-semibold text-[8pt] text-slate-700 mb-3">PT CHITRA PARATAMA • HUMAN CAPITAL</p>

                        <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 text-[8.5pt]">
                          <tbody>
                            <tr>
                              <td colSpan={4} className="font-bold bg-slate-50">Details & Request Profile</td>
                            </tr>
                            <tr>
                              <td className="w-1/4 font-bold bg-slate-50">SPL Number</td>
                              <td className="w-1/4 font-mono font-semibold">{currentBatchDoc.documentNumber}</td>
                              <td className="w-1/4 font-bold bg-slate-50">Work Date</td>
                              <td className="w-1/4 font-semibold">{formatDate(currentBatchDoc.workDate)}</td>
                            </tr>
                            <tr>
                              <td className="font-bold bg-slate-50">Title / Keperluan</td>
                              <td colSpan={3} className="font-semibold">{currentBatchDoc.rawOvertime.title || '—'}</td>
                            </tr>
                            <tr>
                              <td className="font-bold bg-slate-50">Requester Name</td>
                              <td>{currentBatchDoc.employeeName}</td>
                              <td className="font-bold bg-slate-50">Department</td>
                              <td>{currentBatchDoc.department || 'Central Services'}</td>
                            </tr>
                            <tr>
                              <td className="font-bold bg-slate-50">Planned Schedule</td>
                              <td colSpan={3}>
                                {currentBatchDoc.rawOvertime.plannedStartAt ? formatTimestamp(currentBatchDoc.rawOvertime.plannedStartAt) : '-'} s.d. {currentBatchDoc.rawOvertime.plannedEndAt ? formatTimestamp(currentBatchDoc.rawOvertime.plannedEndAt) : '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Section 2: Workers */}
                        {(() => {
                          const participants = (currentBatchDoc.rawOvertime as any).participants || []
                          return (
                            <>
                              <div className="font-bold mb-1">A. Workers ({participants.length} Orang)</div>
                              <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 text-center text-[8pt]">
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
                                    participants.map((p: any, idx: number) => (
                                      <tr key={idx}>
                                        <td className="text-center">{idx + 1}</td>
                                        <td className="text-left font-semibold">{p.employeeName}</td>
                                        <td>{p.shiftCode || '-'}</td>
                                        <td>{p.rosterType || p.roster || '-'}</td>
                                        <td className="capitalize text-[7.5pt]">{(p.category || '-').replace(/_/g, ' ')}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </>
                          )
                        })()}

                        {/* Section 3: Line Items */}
                        {(() => {
                          const lineItems = (currentBatchDoc.rawOvertime as any).lineItems || []
                          if (lineItems.length === 0) return null
                          return (
                            <>
                              <div className="font-bold mb-1">B. Line Items (Aktivitas Pekerjaan)</div>
                              <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 text-[8pt]">
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
                                  {lineItems.map((item: any, idx: number) => (
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
                            </>
                          )
                        })()}

                        {/* Section 4: Approval Steps */}
                        <div className="font-bold mb-1">C. Approval Steps</div>
                        <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 text-center text-[8pt]">
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
                            {(() => {
                              const approvals = (currentBatchDoc.rawOvertime as any).approvals || []
                              const activeReviewStep = approvals.find((a: any) => (a.status === 'pending' || a.status === 'waiting') && a.stepOrder > 1) || approvals.find((a: any) => a.status === 'pending') || approvals[0]

                              return approvals.map((step: any) => {
                                const isThisActiveStep = activeReviewStep && (step.id === activeReviewStep.id || step.stepOrder === activeReviewStep.stepOrder)
                                const liveRemark = isThisActiveStep && approvalRemarks[currentBatchDoc.id] ? approvalRemarks[currentBatchDoc.id] : step.remarks || '—'
                                return (
                                  <tr key={step.stepOrder}>
                                    <td>{step.stepOrder}</td>
                                    <td className="text-left">{step.stepLabel}</td>
                                    <td className="text-left">{step.approverName || '-'}</td>
                                    <td className="capitalize font-semibold">{step.status}</td>
                                    <td className="text-[7pt]">{formatTimestamp(step.signedAt)}</td>
                                    <td className="text-left text-[7pt] text-slate-600">{liveRemark}</td>
                                  </tr>
                                )
                              })
                            })()}
                          </tbody>
                        </table>

                        {/* Section 5: Signatories */}
                        <div className="font-bold mb-3">Signatories</div>
                        <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4">
                          {/* 1. Serviceman / Karyawan */}
                          {(() => {
                            const approvals = (currentBatchDoc.rawOvertime as any).approvals || []
                            const activeReviewStep = approvals.find((a: any) => (a.status === 'pending' || a.status === 'waiting') && a.stepOrder > 1) || approvals.find((a: any) => a.status === 'pending') || approvals[0]
                            const step1 = approvals.find((s: any) => s.stepOrder === 1)
                            const isStep1Active = step1 && (step1.id === activeReviewStep?.id || step1.stepOrder === activeReviewStep?.stepOrder)
                            const remark1 = isStep1Active && approvalRemarks[currentBatchDoc.id]
                              ? approvalRemarks[currentBatchDoc.id]
                              : step1?.remarks
                            const isSigned1 = step1?.status === 'approved' || step1?.status === 'signed' || step1?.status === 'completed'
                            const sigUrl1 = step1?.signatureDataUrl

                            return (
                              <div>
                                <div className="text-[7pt] text-slate-500 mb-1">Employee Signature</div>
                                <div className="h-16 flex items-end">
                                  {sigUrl1 ? (
                                    <img src={sigUrl1} alt="TTD" className="h-14 object-contain" />
                                  ) : isSigned1 ? (
                                    <div className="text-emerald-700 font-bold text-[8pt] flex flex-col items-center">
                                      <span className="text-[10pt] font-serif italic text-blue-900 font-extrabold">{step1?.approverName || currentBatchDoc.employeeName}</span>
                                      <span className="text-[6.5pt] text-emerald-600">✓ Digitally Signed ({formatTimestamp(step1?.signedAt || new Date())})</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[7.5pt]"></span>
                                  )}
                                </div>
                                <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>
                                  {step1?.approverName || currentBatchDoc.employeeName}
                                </div>
                                <div className="text-[7pt] text-slate-600">{(currentBatchDoc.rawOvertime as any).jobTitle || (currentBatchDoc as any).position || 'Staff'}</div>
                                {(step1?.signedAt || sigUrl1) && (
                                  <div className="text-[6.5pt] text-slate-500 mt-0.5">Waktu TTD: {formatTimestamp(step1?.signedAt || new Date())}</div>
                                )}
                              </div>
                            )
                          })()}

                          {/* 2. Leader / Pengawas */}
                          {(() => {
                            const approvals = (currentBatchDoc.rawOvertime as any).approvals || []
                            const activeReviewStep = approvals.find((a: any) => (a.status === 'pending' || a.status === 'waiting') && a.stepOrder > 1) || approvals.find((a: any) => a.status === 'pending') || approvals[0]
                            const step2 = approvals.find((s: any) => s.stepOrder === 2)
                            const isStep2Active = step2 && (step2.id === activeReviewStep?.id || step2.stepOrder === activeReviewStep?.stepOrder)
                            const remark2 = isStep2Active && approvalRemarks[currentBatchDoc.id]
                              ? approvalRemarks[currentBatchDoc.id]
                              : step2?.remarks
                            const isApproved2 = step2?.status === 'approved'

                            return (
                              <div>
                                <div className="text-[7pt] text-slate-500 mb-1">Leader / Supervisor Signature</div>
                                <div className="h-16 flex items-end">
                                  {step2?.signatureDataUrl ? (
                                    <img src={step2.signatureDataUrl} alt="TTD" className="h-14 object-contain" />
                                  ) : isApproved2 ? (
                                    <div className="text-emerald-700 font-bold text-[8pt] flex flex-col items-center">
                                      <span className="text-[10pt] font-serif italic text-blue-900 font-extrabold">{step2?.approverName || 'Leader'}</span>
                                      <span className="text-[6.5pt] text-emerald-600">✓ Approved ({formatTimestamp(step2?.signedAt)})</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[7.5pt]"></span>
                                  )}
                                </div>
                                <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>
                                  {step2?.approverName || 'Leader / Supervisor'}
                                </div>
                                <div className="text-[7pt] text-slate-600">{step2?.stepLabel || 'Leader / Supervisor'}</div>
                                {step2?.signedAt && (
                                  <div className="text-[6.5pt] text-slate-500 mt-0.5">Waktu TTD: {formatTimestamp(step2.signedAt)}</div>
                                )}
                              </div>
                            )
                          })()}

                          {/* 3. Section Head */}
                          {(() => {
                            const approvals = (currentBatchDoc.rawOvertime as any).approvals || []
                            const activeReviewStep = approvals.find((a: any) => (a.status === 'pending' || a.status === 'waiting') && a.stepOrder > 1) || approvals.find((a: any) => a.status === 'pending') || approvals[0]
                            const step3 = approvals.find((s: any) => s.stepOrder === 3)
                            const isStep3Active = step3 && (step3.id === activeReviewStep?.id || step3.stepOrder === activeReviewStep?.stepOrder)
                            const remark3 = isStep3Active && approvalRemarks[currentBatchDoc.id]
                              ? approvalRemarks[currentBatchDoc.id]
                              : step3?.remarks
                            const isApproved3 = step3?.status === 'approved'

                            return (
                              <div>
                                <div className="text-[7pt] text-slate-500 mb-1">Section Head Signature</div>
                                <div className="h-16 flex items-end">
                                  {step3?.signatureDataUrl ? (
                                    <img src={step3.signatureDataUrl} alt="TTD" className="h-14 object-contain" />
                                  ) : isApproved3 ? (
                                    <div className="text-emerald-700 font-bold text-[8pt] flex flex-col items-center">
                                      <span className="text-[10pt] font-serif italic text-blue-900 font-extrabold">{step3?.approverName || 'Section Head'}</span>
                                      <span className="text-[6.5pt] text-emerald-600">✓ Approved ({formatTimestamp(step3?.signedAt)})</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[7.5pt]"></span>
                                  )}
                                </div>
                                <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>
                                  {step3?.approverName || 'Section Head'}
                                </div>
                                <div className="text-[7pt] text-slate-600">{step3?.stepLabel || 'Section Head'}</div>
                                {step3?.signedAt && (
                                  <div className="text-[6.5pt] text-slate-500 mt-0.5">Waktu TTD: {formatTimestamp(step3.signedAt)}</div>
                                )}
                              </div>
                            )
                          })()}
                        </div>

                        <div className="text-right text-[7pt] text-slate-400 mt-4">PT Chitra Paratama • HERO Platform</div>
                      </div>
                    )}

                    {/* PTW */}
                    {currentBatchDoc.category === 'PTW' && currentBatchDoc.rawPtw && (() => {
                      const doc: any = currentBatchDoc.rawPtw
                      const ptwApprovals = (doc as any).approvals || []
                      const step1 = ptwApprovals.find((a: any) => a.stepOrder === 1 || a.approverRole === 'applicant')
                      const step2 = ptwApprovals.find((a: any) => a.stepOrder === 2 || a.approverRole === 'safety_officer')
                      const step3 = ptwApprovals.find((a: any) => a.stepOrder === 3 || a.approverRole === 'field_pic' || a.approverRole === 'authorized')

                      const remark1 = (step1 && step1.status === 'pending' && approvalRemarks[currentBatchDoc.id]) || step1?.remarks
                      const remark2 = (step2 && step2.status === 'pending' && approvalRemarks[currentBatchDoc.id]) || step2?.remarks
                      const remark3 = (step3 && step3.status === 'pending' && approvalRemarks[currentBatchDoc.id]) || step3?.remarks

                      const permitTypeNorm = (doc.permitType || '').toUpperCase()
                      const activeTypes: string[] = []
                      if (permitTypeNorm.includes('HOT')) activeTypes.push('HOT')
                      if (permitTypeNorm.includes('CONFINED')) activeTypes.push('CONFINED')
                      if (permitTypeNorm.includes('DIGGING')) activeTypes.push('DIGGING')
                      if (permitTypeNorm.includes('COLD')) activeTypes.push('COLD')
                      if (permitTypeNorm.includes('ELECTRICAL') || permitTypeNorm.includes('MECHANICAL')) activeTypes.push('ELECTRICAL')

                      const columnsToShow = activeTypes.length > 0 ? activeTypes : ['HOT', 'CONFINED', 'DIGGING', 'COLD', 'ELECTRICAL']
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
                        <div className="-mx-5 -my-9 text-slate-900">
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
                              <span className="font-bold">No. Ijin Kerja Berbahaya :</span> <span className="font-mono font-semibold">{doc?.permitNumber || currentBatchDoc?.documentNumber || '—'}</span>
                            </div>
                            <div className="col-span-8 p-1.5 bg-slate-50">
                              <span className="font-bold">No. Work Order :</span> <span className="font-mono font-semibold">{(doc?.permitNumber || currentBatchDoc?.documentNumber || '').replace('PTW', 'WO')}</span>
                            </div>

                            <div className="col-span-4 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                              <span className="font-bold block text-[7.5pt] text-slate-500">Nama Pekerja :</span>
                              <span className="font-semibold text-slate-900">{doc.applicantName || '—'}</span>
                            </div>
                            <div className="col-span-3 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                              <span className="font-bold block text-[7.5pt] text-slate-500">Lokasi :</span>
                              <span className="font-semibold text-slate-900">{doc.location} {doc.area ? `(${doc.area})` : ''}</span>
                            </div>
                            <div className="col-span-5 border-t border-slate-900 p-1.5 min-h-[44px]">
                              <span className="font-bold block text-[7.5pt] text-slate-500">Uraian Pekerjaan :</span>
                              <span className="font-semibold text-slate-900">{doc.projectName || doc.description || '—'}</span>
                            </div>

                            <div className="col-span-6 border-r border-slate-900 border-t border-slate-900 p-1.5 bg-blue-50/50">
                              <span className="font-bold text-slate-800">Referensi HIRADC :</span>{' '}
                              <span className="font-semibold text-blue-900">
                                {doc.hiradcReference || (doc.description?.match(/\[Referensi HIRADC:\s*(.*?)\]/)?.[1]) || 'JSA-HSE-PTW-2026-001'}
                              </span>
                            </div>
                            <div className="col-span-6 border-t border-slate-900 p-1.5 bg-blue-50/50">
                              <span className="font-bold text-slate-800">Tipe Izin Kerja Terpilih :</span>{' '}
                              <span className="font-semibold uppercase text-slate-900">{doc.permitType || 'Cold Permit'}</span>
                            </div>
                          </div>

                          {/* ── TABLE TITLE: JENIS PEKERJAAN ── */}
                          <div className="bg-[#e2e8f0] text-center font-bold uppercase text-[8.5pt] py-1 border-b-2 border-slate-900">
                            JENIS PEKERJAAN
                          </div>

                          {/* ── DYNAMIC COLUMNS FOR PERMIT TYPES ── */}
                          {(() => {
                            const checkedEquipment: string[] = doc.controlSteps
                              ? doc.controlSteps.split('\n').map((l: string) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
                              : (Array.isArray(doc.ppe) ? doc.ppe : [])

                            return (
                              <div className={`grid ${gridColsClass} border-b-2 border-slate-900 divide-x-2 divide-slate-900 text-[7.5pt]`}>
                                {columnsToShow.includes('HOT') && (
                                  <div className="flex flex-col justify-between">
                                    <div>
                                      <div className="bg-[#ef4444] text-white text-center font-bold py-1 uppercase border-b border-slate-900">
                                        Hot Work Permit
                                      </div>
                                      <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Hot Work Permit'].subTypes?.map((st) => (
                                          <div key={st}>- {st}</div>
                                        ))}
                                      </div>
                                      <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Hot Work Permit'].subHeader}
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
                                          {EQUIPMENT_CHECKLIST_PER_TYPE['Hot Work Permit'].items.map((item, idx) => {
                                            const isChecked = isItemChecked(item.label, checkedEquipment)
                                            return (
                                              <tr key={item.id}>
                                                <td>{idx + 1}. {item.label}</td>
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

                                {columnsToShow.includes('CONFINED') && (
                                  <div className="flex flex-col justify-between">
                                    <div>
                                      <div className="bg-[#eab308] text-slate-900 text-center font-bold py-1 uppercase border-b border-slate-900">
                                        Confined Space Permit
                                      </div>
                                      <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Confined Space Permit'].subTypes?.map((st) => (
                                          <div key={st}>- {st}</div>
                                        ))}
                                      </div>
                                      <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Confined Space Permit'].subHeader}
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
                                          {EQUIPMENT_CHECKLIST_PER_TYPE['Confined Space Permit'].items.map((item, idx) => {
                                            const isChecked = isItemChecked(item.label, checkedEquipment)
                                            return (
                                              <tr key={item.id}>
                                                <td>{idx + 1}. {item.label}</td>
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

                                {columnsToShow.includes('DIGGING') && (
                                  <div className="flex flex-col justify-between">
                                    <div>
                                      <div className="bg-[#84cc16] text-slate-900 text-center font-bold py-1 uppercase border-b border-slate-900">
                                        Digging Permit
                                      </div>
                                      <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Digging Permit'].subTypes?.map((st) => (
                                          <div key={st}>- {st}</div>
                                        ))}
                                      </div>
                                      <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Digging Permit'].subHeader}
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
                                          {EQUIPMENT_CHECKLIST_PER_TYPE['Digging Permit'].items.map((item, idx) => {
                                            const isChecked = isItemChecked(item.label, checkedEquipment)
                                            return (
                                              <tr key={item.id}>
                                                <td>{idx + 1}. {item.label}</td>
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

                                {columnsToShow.includes('COLD') && (
                                  <div className="flex flex-col justify-between">
                                    <div>
                                      <div className="bg-[#06b6d4] text-white text-center font-bold py-1 uppercase border-b border-slate-900">
                                        Cold Work Permit
                                      </div>
                                      <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Cold Permit'].subTypes?.map((st) => (
                                          <div key={st}>- {st}</div>
                                        ))}
                                      </div>
                                      <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Cold Permit'].subHeader}
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
                                          {EQUIPMENT_CHECKLIST_PER_TYPE['Cold Permit'].items.map((item, idx) => {
                                            const isChecked = isItemChecked(item.label, checkedEquipment)
                                            return (
                                              <tr key={item.id}>
                                                <td>{idx + 1}. {item.label}</td>
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

                                {columnsToShow.includes('ELECTRICAL') && (
                                  <div className="flex flex-col justify-between">
                                    <div>
                                      <div className="bg-[#3b82f6] text-white text-center font-bold py-1 uppercase border-b border-slate-900">
                                        Electrical / Mechanical Permit
                                      </div>
                                      <div className="p-1.5 space-y-0.5 border-b border-slate-900 min-h-[56px] text-[7.5pt]">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Electrical/Mechanical'].subTypes?.map((st) => (
                                          <div key={st}>- {st}</div>
                                        ))}
                                      </div>
                                      <div className="p-1 bg-slate-50 font-semibold italic text-[6.5pt] text-slate-600 border-b border-slate-900 leading-tight">
                                        {EQUIPMENT_CHECKLIST_PER_TYPE['Electrical/Mechanical'].subHeader}
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
                                          {EQUIPMENT_CHECKLIST_PER_TYPE['Electrical/Mechanical'].items.map((item, idx) => {
                                            const isChecked = isItemChecked(item.label, checkedEquipment)
                                            return (
                                              <tr key={item.id}>
                                                <td>{idx + 1}. {item.label}</td>
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
                          <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-slate-50/80 flex items-center justify-between">
                            <div>
                              <span className="font-bold block text-[7.5pt] text-slate-900">ALAT PELINDUNG DIRI (APD) WAJIB :</span>
                              <div className="flex flex-wrap gap-1.5 mt-1 font-semibold text-slate-800">
                                {(doc.ppe && doc.ppe.length > 0 ? doc.ppe : ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness']).map((apd: string) => (
                                  <span key={apd} className="inline-block bg-white border border-slate-400 rounded px-2 py-0.5 text-[7.5pt] shadow-2xs">
                                    ☑ {apd}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 font-bold text-[7.5pt] text-slate-800 shrink-0">
                              <span>Gas Test: <strong className="text-emerald-700">{doc.gasTestRequired ? 'WAJIB' : 'TIDAK'}</strong></span>
                              <span>LOTO / Isolasi: <strong className="text-emerald-700">{doc.isolationRequired ? 'WAJIB' : 'TIDAK'}</strong></span>
                              <span>Risk Level: <strong className="text-rose-700 uppercase">{doc.riskLevel || 'MEDIUM'}</strong></span>
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
                                  {remark1 || <span className="text-slate-400 italic text-[6.5pt]">Wajib ikuti SOP K3 lokasi kerja.</span>}
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
                                  {remark2 || <span className="text-slate-400 italic text-[6.5pt]">Area kerja aman & barikade terpasang.</span>}
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
                                  {remark3 || <span className="text-slate-400 italic text-[6.5pt]">Peralatan & APAR standby di lokasi.</span>}
                                </div>
                              </div>
                            </div>

                            {/* 4. QR Code */}
                            <div className="col-span-3 flex flex-col items-center justify-center p-1.5 border-slate-900 bg-white">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                  `http://localhost:3000/review/ptw/${doc.permitNumber}`
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
                                  <span className="font-semibold">{formatDate(doc.startAt)}</span>
                                </div>
                                <div className="p-1 text-center">
                                  <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU MULAI</span>
                                  <span className="font-semibold">{formatPtwTime(doc.startAt)}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 divide-x divide-slate-900">
                                <div className="p-1 text-center">
                                  <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL BERAKHIR</span>
                                  <span className="font-semibold">{formatDate(doc.endAt)}</span>
                                </div>
                                <div className="p-1 text-center">
                                  <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU BERAKHIR</span>
                                  <span className="font-semibold">{formatPtwTime(doc.endAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ── VERIFIKASI & TANDA TANGAN (3 COLUMNS) ── */}
                          <div className="grid grid-cols-3 divide-x-2 divide-slate-900 border-b-2 border-slate-900 text-[8pt]">
                            <div className="p-1.5 text-center flex flex-col justify-between">
                              <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PELAKSANA PEKERJAAN</div>
                              <div className="h-14 flex flex-col items-center justify-center my-1">
                                {step1?.signatureDataUrl ? (
                                  <img src={step1.signatureDataUrl} alt="TTD" className="max-h-10 object-contain" />
                                ) : null}
                                {step1?.status === 'rejected' ? (
                                  <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak ({formatTimestamp(step1?.signedAt)})</span>
                                ) : step1?.status === 'reverted' ? (
                                  <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan ({formatTimestamp(step1?.signedAt)})</span>
                                ) : step1?.status === 'approved' && !step1?.signatureDataUrl ? (
                                  <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui ({formatTimestamp(step1?.signedAt)})</span>
                                ) : !step1?.signatureDataUrl ? (
                                  <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
                                ) : null}
                              </div>
                              <div className="border-t border-slate-900 pt-1 font-bold">
                                {step1?.approverName || doc.applicantName || 'NAMA & TANDA TANGAN'}
                              </div>
                            </div>

                            <div className="p-1.5 text-center flex flex-col justify-between">
                              <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">PEMBERI KERJA</div>
                              <div className="h-14 flex flex-col items-center justify-center my-1">
                                {step2?.status === 'rejected' ? (
                                  <>
                                    {step2?.signatureDataUrl && <img src={step2.signatureDataUrl} alt="TTD" className="max-h-8 object-contain" />}
                                    <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak ({formatTimestamp(step2?.signedAt)})</span>
                                  </>
                                ) : step2?.status === 'reverted' ? (
                                  <>
                                    {step2?.signatureDataUrl && <img src={step2.signatureDataUrl} alt="TTD" className="max-h-8 object-contain" />}
                                    <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan ({formatTimestamp(step2?.signedAt)})</span>
                                  </>
                                ) : step2?.signatureDataUrl ? (
                                  <img src={step2.signatureDataUrl} alt="TTD" className="max-h-12 object-contain" />
                                ) : step2?.status === 'approved' ? (
                                  <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui ({formatTimestamp(step2?.signedAt)})</span>
                                ) : (
                                  <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
                                )}
                              </div>
                              <div className="border-t border-slate-900 pt-1 font-bold">
                                {step2?.approverName || doc.fieldPicName || 'NAMA & TANDA TANGAN'}
                              </div>
                            </div>

                            <div className="p-1.5 text-center flex flex-col justify-between">
                              <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">VERIFIKASI (SAFETY DEPT)</div>
                              <div className="h-14 flex flex-col items-center justify-center my-1">
                                {step3?.status === 'rejected' ? (
                                  <>
                                    {step3?.signatureDataUrl && <img src={step3.signatureDataUrl} alt="TTD" className="max-h-8 object-contain" />}
                                    <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak ({formatTimestamp(step3?.signedAt)})</span>
                                  </>
                                ) : step3?.status === 'reverted' ? (
                                  <>
                                    {step3?.signatureDataUrl && <img src={step3.signatureDataUrl} alt="TTD" className="max-h-8 object-contain" />}
                                    <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan ({formatTimestamp(step3?.signedAt)})</span>
                                  </>
                                ) : step3?.signatureDataUrl ? (
                                  <img src={step3.signatureDataUrl} alt="TTD" className="max-h-12 object-contain" />
                                ) : step3?.status === 'approved' ? (
                                  <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui ({formatTimestamp(step3?.signedAt)})</span>
                                ) : (
                                  <span className="text-[7pt] text-slate-400 italic">(Belum Disetujui)</span>
                                )}
                              </div>
                              <div className="border-t border-slate-900 pt-1 font-bold">
                                {step3?.approverName || doc.authorizedByName || 'NAMA & TANDA TANGAN'}
                              </div>
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
                      )
                    })()}

                    {/* General Fallback */}
                    {(currentBatchDoc.category === 'CONTRACT_REVIEW' || currentBatchDoc.category === 'GENERAL') && (
                      <div>
                        <h1 className="text-center font-bold text-[11pt] mb-1">PT. CHITRA PARATAMA</h1>
                        <h2 className="text-center font-bold text-[12pt] mb-3">{currentBatchDoc.categoryLabel}</h2>
                        <div className="border border-black p-3 text-[8.5pt] space-y-1">
                          <p><strong>Nomor:</strong> {currentBatchDoc.documentNumber}</p>
                          <p><strong>Karyawan:</strong> {currentBatchDoc.employeeName}</p>
                          <p><strong>Tahap:</strong> {currentBatchDoc.stepLabel}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Mobile Action Form & Signature - Positioned directly UNDER PDF Preview */}
            <div className="space-y-4 max-w-lg mx-auto bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              {/* Informasi Dokumen Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-xs">Informasi Dokumen</span>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-md">Submitted</Badge>
                </div>
                <p><span className="text-slate-400">Karyawan:</span> <span className="font-bold text-slate-900">{currentBatchDoc?.employeeName}</span></p>
                <p><span className="text-slate-400">Kode Sesi:</span> <span className="font-bold text-indigo-700">{currentBatchDoc?.documentNumber}</span></p>
                <p><span className="text-slate-400">Tanggal:</span> <span className="font-semibold text-slate-800">{formatDate(currentBatchDoc?.workDate || currentBatchDoc?.submittedAt)}</span></p>
                <p><span className="text-slate-400">Shift:</span> <span className="font-semibold text-slate-800">{currentBatchDoc?.shiftCode || 'ALL'}</span></p>
              </div>

              {/* TTD Approver Status & Quick Register / Edit */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <PenTool className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800">Tanda Tangan Approver</p>
                    <p className="text-[10px] text-slate-400">
                      {signatureDataUrl ? 'TTD Digital Aktif' : 'Belum Terdaftar'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSigPadOpen(true)}
                  className={cn(
                    "h-7 text-[10px] font-bold rounded-lg px-2 gap-1 active:scale-95",
                    signatureDataUrl
                      ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                      : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  )}
                >
                  {signatureDataUrl ? 'Ubah TTD' : '+ Buat TTD'}
                </Button>
              </div>

              {/* Catatan Approval Input */}
              <div className={cn(
                "rounded-xl border p-3.5 bg-white space-y-1.5 transition-all duration-200",
                remarkFieldError ? "border-rose-400 bg-rose-50/40 ring-2 ring-rose-200" : "border-slate-200"
              )}>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 text-xs">Catatan Approval</p>
                  {remarkFieldError && (
                    <span className="text-[10px] font-bold text-rose-600 animate-pulse">Wajib Diisi</span>
                  )}
                </div>
                <Textarea
                  placeholder="Mohon cantumkan rincian revisi atau catatan approval di sini..."
                  value={currentBatchDoc ? approvalRemarks[currentBatchDoc.id] || '' : ''}
                  onChange={(e) => {
                    if (currentBatchDoc) {
                      setApprovalRemarks((prev) => ({
                        ...prev,
                        [currentBatchDoc.id]: e.target.value,
                      }))
                      if (e.target.value.trim()) setRemarkFieldError(false)
                    }
                  }}
                  className={cn(
                    "text-xs min-h-[85px] resize-none rounded-xl bg-slate-50/50",
                    remarkFieldError ? "border-rose-400 focus-visible:ring-rose-400" : "border-slate-200"
                  )}
                />
              </div>

              {/* Decision Buttons or Rejected/Reverted Lockdown Banner */}
              {currentBatchDoc?.isRejected ? (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-rose-900 shadow-xs space-y-2">
                    <p className="font-black text-xs flex items-center gap-1.5 text-rose-900">
                      <AlertTriangle className="size-4 text-rose-600 shrink-0" />
                      ⛔ Dokumen Ditolak (Rejected)
                    </p>
                    <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                      Dokumen ini telah ditolak dan tidak dapat diedit atau diajukan ulang. Silakan buat pengajuan baru.
                    </p>
                    <Button
                      asChild
                      className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl mt-1 shadow-xs"
                    >
                      <Link href={currentBatchDoc.category === 'OVERTIME' ? `/mobile/overtime?tab=apply&extend=${(currentBatchDoc as any).splId || currentBatchDoc.rawOvertime?.splId || String(currentBatchDoc.id).replace(/[^0-9]/g, '')}` : currentBatchDoc.category === 'PTW' ? `/mobile/hse/ptw?extend=${currentBatchDoc.rawPtw?.ptwId || currentBatchDoc.id}` : `/mobile/activity?edit=${currentBatchDoc.rawDaily?.sessionId || (currentBatchDoc as any).sessionId || String(currentBatchDoc.id).replace(/[^0-9]/g, '') || currentBatchDoc.id}`}>
                        Buat Pengajuan Baru ↗
                      </Link>
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setIsBatchReviewOpen(false)}
                    className="w-full h-10 bg-[#e5f0ec] text-[#003461] hover:bg-[#d6e7e1] font-bold text-xs rounded-xl"
                  >
                    TUTUP REVIEWER
                  </Button>
                </div>
              ) : currentBatchDoc?.isReverted ? (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-amber-900 shadow-xs space-y-2">
                    <p className="font-black text-xs flex items-center gap-1.5 text-amber-900">
                      <RotateCcw className="size-4 text-amber-600 shrink-0" />
                      🔄 Dokumen Dikembalikan untuk Revisi
                    </p>
                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                      Dokumen ini dikembalikan oleh approver. Silakan periksa catatan revisi di atas dan perbarui form pengajuan Anda.
                    </p>
                    <Button
                      asChild
                      className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl mt-1 shadow-xs"
                    >
                      <Link href={currentBatchDoc.category === 'OVERTIME' ? `/mobile/overtime?tab=apply&edit=${(currentBatchDoc as any).splId || currentBatchDoc.rawOvertime?.splId || String(currentBatchDoc.id).replace(/[^0-9]/g, '')}` : currentBatchDoc.category === 'PTW' ? `/mobile/hse/ptw?extend=${currentBatchDoc.rawPtw?.ptwId || currentBatchDoc.id}` : `/mobile/activity?edit=${currentBatchDoc.rawDaily?.sessionId || (currentBatchDoc as any).sessionId || String(currentBatchDoc.id).replace(/[^0-9]/g, '') || currentBatchDoc.id}`}>
                        Buka Form Revisi Pengajuan ↗
                      </Link>
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setIsBatchReviewOpen(false)}
                    className="w-full h-10 bg-[#e5f0ec] text-[#003461] hover:bg-[#d6e7e1] font-bold text-xs rounded-xl"
                  >
                    TUTUP REVIEWER
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    AKSI DOKUMEN INI ({batchReviewIndex + 1} / {selectedItems.length})
                  </p>

                  <Button
                    type="button"
                    onClick={() => executeDirectSingleAction('approve')}
                    disabled={isBatchActionRunning}
                    className="w-full h-11 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs rounded-xl shadow-xs gap-2"
                  >
                    <CheckCircle2 className="size-4" />
                    APPROVE
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => executeDirectSingleAction('revert')}
                      disabled={isBatchActionRunning}
                      className="h-10 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl gap-1.5"
                    >
                      <RotateCcw className="size-3.5 text-slate-500" /> REVERT
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => executeDirectSingleAction('reject')}
                      disabled={isBatchActionRunning}
                      className="h-10 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl gap-1.5"
                    >
                      <XCircle className="size-3.5 text-slate-500" /> REJECT
                    </Button>
                  </div>
                </div>
              )}

              {/* Batch Action Buttons if > 1 selected */}
                {selectedItems.length > 1 && (
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      AKSI MASSAL ({selectedItems.length} DOKUMEN)
                    </p>

                    <Button
                      type="button"
                      onClick={() => executeDirectBatchAllAction('approve')}
                      disabled={isBatchActionRunning}
                      className="w-full h-11 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs rounded-xl shadow-sm gap-2"
                    >
                      <CheckCheck className="size-4" />
                      APPROVE ALL ({selectedItems.length})
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => executeDirectBatchAllAction('revert')}
                        disabled={isBatchActionRunning}
                        className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] rounded-xl"
                      >
                        REVERT ALL
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => executeDirectBatchAllAction('reject')}
                        disabled={isBatchActionRunning}
                        className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] rounded-xl"
                      >
                        REJECT ALL
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => setIsBatchReviewOpen(false)}
                  className="w-full h-10 bg-[#e5f0ec] text-[#003461] hover:bg-[#d6e7e1] font-bold text-xs rounded-xl mt-2"
                >
                  TUTUP REVIEWER
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <MobileSignaturePadDialog
          isOpen={isSigPadOpen}
          onClose={() => setIsSigPadOpen(false)}
          onSignatureSaved={(sig) => {
            setSignatureDataUrl(sig)
          }}
          onSignatureDeleted={() => {
            setSignatureDataUrl(null)
          }}
        />
      </div>
  )
}
