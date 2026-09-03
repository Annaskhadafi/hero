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
import { Search, CheckSquare, Square, Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBatchApproving, setIsBatchApproving] = useState(false)

  // Filter items based on search query
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      return {
        groups,
        contractReviewItems,
        rfrItems,
      }
    }

    const matchedRfr = rfrItems.filter((item) => {
      const text = `${item.rfrNumber} ${item.positionTitle} ${item.requestorName} ${item.sectionDepartment} ${item.roleLabel}`.toLowerCase()
      return text.includes(q)
    })

    const matchedContract = contractReviewItems.filter((item) => {
      const text = `${item.employeeName} ${item.title} ${item.stepLabel} ${item.reviewType}`.toLowerCase()
      return text.includes(q)
    })

    const matchedGroups = groups
      .map((g) => {
        const groupMatches = `${g.requesterName} ${g.siteName} ${g.requesterJobTitle || ''}`.toLowerCase().includes(q)
        if (groupMatches) return g
        const filteredItems = g.items.filter((item) => {
          const itemText = `${item.title} ${item.activityType} ${item.unitNumber || ''} ${item.requestNumber || ''} ${item.activityCode || ''} ${(item as any).fiveRReport?.reportNumber || ''}`.toLowerCase()
          return itemText.includes(q)
        })
        if (filteredItems.length > 0) {
          return { ...g, items: filteredItems }
        }
        return null
      })
      .filter((g): g is typeof groups[number] => g !== null)

    return {
      groups: matchedGroups,
      contractReviewItems: matchedContract,
      rfrItems: matchedRfr,
    }
  }, [groups, contractReviewItems, rfrItems, searchQuery])

  // Collect all selectable approval IDs from visible groups
  const allSelectableApprovalIds = useMemo(() => {
    const ids: number[] = []
    for (const g of filteredData.groups) {
      for (const item of g.items) {
        if (item.approvalId) {
          ids.push(item.approvalId)
        }
      }
    }
    return ids
  }, [filteredData.groups])

  const totalVisibleCount =
    filteredData.rfrItems.length +
    filteredData.contractReviewItems.length +
    allSelectableApprovalIds.length

  const isAllSelected =
    allSelectableApprovalIds.length > 0 &&
    allSelectableApprovalIds.every((id) => selectedIds.has(id))

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allSelectableApprovalIds))
    }
  }

  const handleToggleItem = (approvalId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(approvalId)) {
        next.delete(approvalId)
      } else {
        next.add(approvalId)
      }
      return next
    })
  }

  async function handleBatchApprove() {
    if (selectedIds.size === 0 || isBatchApproving) return
    setIsBatchApproving(true)
    try {
      const formData = new FormData()
      for (const id of selectedIds) {
        formData.append('approvalIds', String(id))
      }
      await approveApprovalGroupAction(formData)
      toast.success(`${selectedIds.size} pengajuan berhasil disetujui sekaligus.`)
      setSelectedIds(new Set())
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyetujui pengajuan terpilih.')
    } finally {
      setIsBatchApproving(false)
    }
  }

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
    <div className="space-y-3 pb-16">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari pemohon, nomor, unit, site..."
          className="w-full h-12 pl-10 pr-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003461]/20 focus:border-[#003461] transition-all shadow-[0_4px_12px_rgba(8,32,51,0.04)]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Select All Checkbox Bar */}
      {allSelectableApprovalIds.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-200 px-4 py-3.5 shadow-[0_4px_12px_rgba(8,32,51,0.04)]">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleToggleSelectAll}
              className="size-5 rounded-md border-slate-300 text-[#003461] focus:ring-[#003461] cursor-pointer accent-[#003461]"
            />
            <span className="text-sm font-bold text-slate-800">
              Pilih Semua ({totalVisibleCount})
            </span>
          </label>
          {selectedIds.size > 0 && (
            <span className="text-xs font-bold text-[#003461] bg-[#eef5fa] border border-[#d6e7f5] px-2.5 py-1 rounded-lg">
              {selectedIds.size} dipilih
            </span>
          )}
        </div>
      )}

      {/* Floating Bottom Batch Approval Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-slate-900/95 backdrop-blur-md px-4 py-3 text-white shadow-2xl flex items-center justify-between gap-3 border border-slate-700/80 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold text-slate-200">Item Terpilih</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="h-8 px-2.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <Button
              type="button"
              size="sm"
              onClick={handleBatchApprove}
              disabled={isBatchApproving}
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {isBatchApproving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Setujui Semua ({selectedIds.size})
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {filteredData.rfrItems.map((item) => (
        <MobileRfrApprovalCard key={`rfr-${item.id}`} item={item} />
      ))}

      {filteredData.contractReviewItems.map((item) => (
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

      {filteredData.groups.map((group) => (
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
                  className="h-10 rounded-xl px-4 font-bold text-xs"
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

              const isSelected = selectedIds.has(item.approvalId)

              return (
                <article key={item.approvalId} className="space-y-4 px-4 py-5">
                  {/* Select Checkbox for individual item */}
                  <div className="flex items-center justify-between pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.approvalId)}
                        className="size-4.5 rounded border-slate-300 text-[#003461] focus:ring-[#003461] cursor-pointer accent-[#003461]"
                      />
                      <span>Pilih Item</span>
                    </label>
                  </div>

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
                        </div>
                      </form>
                    </section>
                  </>
                )}
              </article>
            )
          })}
        </div>
        </details>
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
  )
}
